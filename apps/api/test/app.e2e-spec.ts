import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { totpCode } from '../src/common/mfa';

describe('UniGest API functional flows (e2e)', () => {
  let app: INestApplication;
  let adminToken = '';
  let teacherToken = '';
  let studentToken = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('initializes PostgreSQL lazily and reports healthy local storage', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual(expect.objectContaining({
      status: 'ok',
      database: 'ok',
      storage: expect.objectContaining({ driver: 'local', ready: true }),
    }));
  });

  it('provisions and authenticates the bootstrap administrator', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.BOOTSTRAP_ADMIN_EMAIL,
        password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
      })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.role).toBe('ADMIN');
    adminToken = response.body.accessToken;

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(me.body.email).toBe(process.env.BOOTSTRAP_ADMIN_EMAIL);
    expect(me.body.passwordHash).toBeUndefined();
  });


  it('changes password and invalidates the previous JWT', async () => {
    const original = adminToken;
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${original}`)
      .send({
        currentPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD,
        newPassword: 'AuditAdminPassword456!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${original}`)
      .expect(401);

    const relogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.BOOTSTRAP_ADMIN_EMAIL,
        password: 'AuditAdminPassword456!',
      })
      .expect(201);

    adminToken = relogin.body.accessToken;

    await request(app.getHttpServer())
      .post('/auth/logout-all')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(401);

    const finalLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.BOOTSTRAP_ADMIN_EMAIL,
        password: 'AuditAdminPassword456!',
      })
      .expect(201);

    adminToken = finalLogin.body.accessToken;
  });

  it('resets the password with a single-use expiring token', async () => {
    const requestReset = await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .send({ email: process.env.BOOTSTRAP_ADMIN_EMAIL })
      .expect(201);

    expect(requestReset.body.accepted).toBe(true);
    expect(requestReset.body.testToken).toEqual(expect.any(String));

    const previousToken = adminToken;
    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({
        token: requestReset.body.testToken,
        newPassword: 'AuditAdminPassword789!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${previousToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({
        token: requestReset.body.testToken,
        newPassword: 'AnotherPassword123!',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.BOOTSTRAP_ADMIN_EMAIL,
        password: 'AuditAdminPassword456!',
      })
      .expect(401);

    const relogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.BOOTSTRAP_ADMIN_EMAIL,
        password: 'AuditAdminPassword789!',
      })
      .expect(201);

    adminToken = relogin.body.accessToken;
  });

  it('enables TOTP MFA and completes a two-step login', async () => {
    const setup = await request(app.getHttpServer())
      .post('/auth/mfa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'AuditAdminPassword789!' })
      .expect(201);

    expect(setup.body.secret).toEqual(expect.any(String));
    expect(setup.body.uri).toMatch(/^otpauth:\/\/totp\//);

    const code = totpCode(setup.body.secret);
    const enabled = await request(app.getHttpServer())
      .post('/auth/mfa/enable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code })
      .expect(201);

    expect(enabled.body.enabled).toBe(true);
    expect(enabled.body.recoveryCodes).toHaveLength(8);

    const firstStep = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.BOOTSTRAP_ADMIN_EMAIL,
        password: 'AuditAdminPassword789!',
      })
      .expect(201);

    expect(firstStep.body.mfaRequired).toBe(true);
    expect(firstStep.body.accessToken).toBeUndefined();

    const secondStep = await request(app.getHttpServer())
      .post('/auth/mfa/verify')
      .send({
        mfaToken: firstStep.body.mfaToken,
        code: totpCode(setup.body.secret),
      })
      .expect(201);

    expect(secondStep.body.accessToken).toEqual(expect.any(String));
    adminToken = secondStep.body.accessToken;

    const status = await request(app.getHttpServer())
      .get('/auth/security-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(status.body.available).toBe(true);
    expect(status.body.mfaEnabled).toBe(true);
  });

  it('blocks unauthenticated administrative access', async () => {
    await request(app.getHttpServer()).get('/students').expect(401);
  });

  it('loads the demonstration dataset explicitly and idempotently', async () => {
    const first = await request(app.getHttpServer())
      .post('/system/demo-seed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    expect(first.body.loaded).toBe(true);

    const second = await request(app.getHttpServer())
      .post('/system/demo-seed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    expect(second.body.loaded).toBe(true);

    const students = await request(app.getHttpServer())
      .get('/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(students.body.filter((row: any) => row.studentNumber === 'ETU-001')).toHaveLength(1);
  });

  it('returns enriched dashboard metrics after seeding', async () => {
    const response = await request(app.getHttpServer())
      .get('/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.students).toBeGreaterThanOrEqual(1);
    expect(response.body.teachers).toBeGreaterThanOrEqual(1);
    expect(response.body.applicationsByStatus).toEqual(expect.any(Array));
    expect(response.body.studentsByProgram).toEqual(expect.any(Array));
    expect(response.body.upcomingSessions).toEqual(expect.any(Array));
  });

  it('enforces teacher and student RBAC', async () => {
    const teacher = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'enseignant@unigest.local', password: 'Teacher123!' })
      .expect(201);
    teacherToken = teacher.body.accessToken;

    const student = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'etudiant@unigest.local', password: 'Student123!' })
      .expect(201);
    studentToken = student.body.accessToken;

    await request(app.getHttpServer())
      .get('/students')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({})
      .expect(403);

    await request(app.getHttpServer())
      .get('/portal/student/summary')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/portal/teacher/summary')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
  });

  it('validates grade boundaries', async () => {
    const students = (await request(app.getHttpServer())
      .get('/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)).body;
    const assessments = (await request(app.getHttpServer())
      .get('/assessments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)).body;

    await request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: students[0].id,
        assessmentId: assessments[0].id,
        value: 999,
      })
      .expect(400);
  });

  it('detects timetable conflicts for the same room', async () => {
    const modules = (await request(app.getHttpServer())
      .get('/academic-modules')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)).body;
    const groups = (await request(app.getHttpServer())
      .get('/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)).body;

    const first = {
      moduleId: modules[0].id,
      groupId: groups[0].id,
      startsAt: '2030-01-15T10:00:00.000Z',
      endsAt: '2030-01-15T12:00:00.000Z',
      room: 'AUDIT-ROOM-01',
    };

    await request(app.getHttpServer())
      .post('/schedule')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(first)
      .expect(201);

    await request(app.getHttpServer())
      .post('/schedule')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...first,
        startsAt: '2030-01-15T11:00:00.000Z',
        endsAt: '2030-01-15T13:00:00.000Z',
      })
      .expect(400);
  });

  it('runs the public admissions flow and prevents duplicates', async () => {
    const years = (await request(app.getHttpServer())
      .get('/academic-years')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)).body;
    const programs = (await request(app.getHttpServer())
      .get('/programs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)).body;

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 1);
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    const date = (value: Date) => value.toISOString().slice(0, 10);

    const campaign = (await request(app.getHttpServer())
      .post('/admissions/campaigns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Audit campaign ${Date.now()}`,
        startsOn: date(start),
        endsOn: date(end),
        status: 'OPEN',
        academicYearId: years[0].id,
        programIds: [programs[0].id],
        eligibilityRules: { minAverage: 10 },
      })
      .expect(201)).body;

    const email = `candidate-${Date.now()}@example.test`;
    const payload = {
      campaignId: campaign.id,
      programId: programs[0].id,
      firstName: 'Functional',
      lastName: 'Candidate',
      email,
      average: 15,
    };

    const application = await request(app.getHttpServer())
      .post('/admissions/public/apply')
      .send(payload)
      .expect(201);

    expect(application.body.applicationNumber).toMatch(/^APP-/);
    expect(application.body.status).toBe('ELIGIBLE');

    await request(app.getHttpServer())
      .post('/admissions/public/apply')
      .send(payload)
      .expect(400);

    const status = await request(app.getHttpServer())
      .get('/admissions/public/status')
      .query({
        applicationNumber: application.body.applicationNumber,
        email,
      })
      .expect(200);

    expect(status.body.status).toBe('ELIGIBLE');

    await request(app.getHttpServer())
      .get('/admissions/public/status')
      .query({
        applicationNumber: application.body.applicationNumber,
        email: 'wrong@example.test',
      })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/admissions/public/applications/${application.body.applicationNumber}/documents`)
      .field('email', email)
      .field('type', 'DIPLOMA')
      .attach('file', Buffer.from('%PDF-1.4 audit document'), {
        filename: 'diploma.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/admissions/public/applications/${application.body.applicationNumber}/documents`)
      .field('email', email)
      .field('type', 'OTHER')
      .attach('file', Buffer.from('executable-test'), {
        filename: 'payload.exe',
        contentType: 'application/octet-stream',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/admissions/public/applications/${application.body.applicationNumber}/documents`)
      .field('email', email)
      .field('type', 'DIPLOMA')
      .attach('file', Buffer.from('not-really-a-pdf'), {
        filename: 'spoofed.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    const adminApplications = (await request(app.getHttpServer())
      .get('/admissions/applications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)).body;

    const persisted = adminApplications.find(
      (row: any) => row.applicationNumber === application.body.applicationNumber,
    );
    expect(persisted).toBeDefined();
    expect(persisted.documents).toHaveLength(1);

    const download = await request(app.getHttpServer())
      .get(`/admissions/applications/${persisted.id}/documents/${persisted.documents[0].id}/download`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(download.headers['content-type']).toContain('application/pdf');

    await request(app.getHttpServer())
      .patch(`/admissions/applications/${persisted.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ADMITTED', decisionNote: 'Audit acceptance' })
      .expect(200);

    const studentNumber = `AUD-${Date.now()}`;
    const converted = await request(app.getHttpServer())
      .post(`/admissions/applications/${persisted.id}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentNumber,
        createAccount: true,
        temporaryPassword: 'CandidatePassword123!',
      });

    if (converted.status !== 201) {
      throw new Error(
        `Conversion admission→étudiant échouée (${converted.status}): ${JSON.stringify(converted.body)}`,
      );
    }

    expect(converted.body.accountCreated).toBe(true);
    expect(converted.body.student.studentNumber).toBe(studentNumber);

    const candidateLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'CandidatePassword123!' })
      .expect(201);

    expect(candidateLogin.body.user.role).toBe('STUDENT');
  });
});
