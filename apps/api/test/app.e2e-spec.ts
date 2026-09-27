import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

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
      .get('/modules')
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
  });
});
