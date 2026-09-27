import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/user.entity';
import { Program } from '../entities/program.entity';
import { Teacher } from '../entities/teacher.entity';
import { Student } from '../entities/student.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { AcademicYear } from '../entities/academic-year.entity';
import { StudentGroup } from '../entities/student-group.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Assessment, AssessmentType } from '../entities/assessment.entity';
import { Grade } from '../entities/grade.entity';
import { ClassSession } from '../entities/class-session.entity';
import { AcademicLevel } from '../entities/academic-level.entity';
import { AcademicSemester } from '../entities/academic-semester.entity';
import { ModuleElement } from '../entities/module-element.entity';
import { ValidationRule, ValidationRuleType } from '../entities/validation-rule.entity';
import { ApplicationCampaign, CampaignStatus } from '../entities/application-campaign.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Program) private readonly programs: Repository<Program>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(AcademicModule) private readonly modules: Repository<AcademicModule>,
    @InjectRepository(AcademicYear) private readonly years: Repository<AcademicYear>,
    @InjectRepository(StudentGroup) private readonly groups: Repository<StudentGroup>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Assessment) private readonly assessments: Repository<Assessment>,
    @InjectRepository(Grade) private readonly grades: Repository<Grade>,
    @InjectRepository(ClassSession) private readonly sessions: Repository<ClassSession>,
    @InjectRepository(AcademicLevel) private readonly levels: Repository<AcademicLevel>,
    @InjectRepository(AcademicSemester) private readonly semesters: Repository<AcademicSemester>,
    @InjectRepository(ModuleElement) private readonly elements: Repository<ModuleElement>,
    @InjectRepository(ValidationRule) private readonly rules: Repository<ValidationRule>,
    @InjectRepository(ApplicationCampaign) private readonly campaigns: Repository<ApplicationCampaign>,
  ) {}

  private async ensureUser(data: { email: string; password: string; firstName: string; lastName: string; role: UserRole; studentProfile?: Student; teacherProfile?: Teacher }) {
    let user = await this.users.findOne({ where: { email: data.email } });
    if (!user) {
      user = this.users.create({ email: data.email, passwordHash: await bcrypt.hash(data.password, 12), firstName: data.firstName, lastName: data.lastName, role: data.role, studentProfile: data.studentProfile, teacherProfile: data.teacherProfile });
    } else {
      user.studentProfile = data.studentProfile || user.studentProfile;
      user.teacherProfile = data.teacherProfile || user.teacherProfile;
      user.role = data.role;
    }
    return this.users.save(user);
  }

  async onApplicationBootstrap() {
    const production = process.env.NODE_ENV === 'production';
    const demoSeedEnabled =
      String(process.env.DEMO_SEED_ENABLED ?? (production ? 'false' : 'true')).toLowerCase() === 'true';

    const bootstrapEmail = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    const bootstrapPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
    if (bootstrapEmail || bootstrapPassword) {
      if (!bootstrapEmail || bootstrapPassword.length < 12) {
        throw new Error('BOOTSTRAP_ADMIN_EMAIL et un BOOTSTRAP_ADMIN_PASSWORD de 12 caractères minimum sont requis ensemble.');
      }
      await this.ensureUser({
        email: bootstrapEmail,
        password: bootstrapPassword,
        firstName: String(process.env.BOOTSTRAP_ADMIN_FIRST_NAME || 'Administrateur'),
        lastName: String(process.env.BOOTSTRAP_ADMIN_LAST_NAME || 'UniGest'),
        role: UserRole.ADMIN,
      });
    }

    if (!demoSeedEnabled) return;

    await this.ensureUser({ email: 'admin@unigest.local', password: 'Admin123!', firstName: 'Administrateur', lastName: 'UniGest', role: UserRole.ADMIN });
    await this.ensureUser({ email: 'scolarite@unigest.local', password: 'Scolarite123!', firstName: 'Agent', lastName: 'Scolarité', role: UserRole.SCOLARITE });

    let year = await this.years.findOne({ where: { label: '2026/2027' } });
    if (!year) year = await this.years.save(this.years.create({ label: '2026/2027', startsOn: '2026-09-01', endsOn: '2027-08-31', active: true }));

    let program = await this.programs.findOne({ where: { code: 'DGI' } });
    if (!program) program = await this.programs.save(this.programs.create({ code: 'DGI', name: 'Design Graphique et Interactif', durationYears: 5 }));

    let level = await this.levels.findOne({ where: { program: { id: program.id }, levelNumber: 1 } });
    if (!level) level = await this.levels.save(this.levels.create({ code: 'DGI-N1', name: 'Première année', levelNumber: 1, program }));
    let semester1 = await this.semesters.findOne({ where: { level: { id: level.id }, ordinal: 1 } });
    if (!semester1) semester1 = await this.semesters.save(this.semesters.create({ code: 'S1', name: 'Semestre 1', ordinal: 1, level }));
    let semester2 = await this.semesters.findOne({ where: { level: { id: level.id }, ordinal: 2 } });
    if (!semester2) semester2 = await this.semesters.save(this.semesters.create({ code: 'S2', name: 'Semestre 2', ordinal: 2, level }));

    let teacher = await this.teachers.findOne({ where: { employeeNumber: 'ENS-001' } });
    if (!teacher) teacher = await this.teachers.save(this.teachers.create({ employeeNumber: 'ENS-001', firstName: 'Enseignant', lastName: 'Démo', email: 'enseignant@unigest.local', department: 'Informatique' }));

    let student = await this.students.findOne({ where: { studentNumber: 'ETU-001' } });
    if (!student) student = await this.students.save(this.students.create({ studentNumber: 'ETU-001', firstName: 'Étudiant', lastName: 'Démo', email: 'etudiant@unigest.local', program }));

    await this.ensureUser({ email: 'enseignant@unigest.local', password: 'Teacher123!', firstName: teacher.firstName, lastName: teacher.lastName, role: UserRole.TEACHER, teacherProfile: teacher });
    await this.ensureUser({ email: 'etudiant@unigest.local', password: 'Student123!', firstName: student.firstName, lastName: student.lastName, role: UserRole.STUDENT, studentProfile: student });

    let group = await this.groups.findOne({ where: { name: 'DGI-1A-A', academicYear: { id: year.id }, program: { id: program.id } } });
    if (!group) group = await this.groups.save(this.groups.create({ name: 'DGI-1A-A', level: 1, academicYear: year, program, academicLevel: level }));
    else if (!group.academicLevel) { group.academicLevel = level; group = await this.groups.save(group); }

    let enrollment = await this.enrollments.findOne({ where: { student: { id: student.id }, academicYear: { id: year.id } } });
    if (!enrollment) enrollment = await this.enrollments.save(this.enrollments.create({ student, academicYear: year, group, status: 'ENROLLED' }));

    let module = await this.modules.findOne({ where: { code: 'IWD1' } });
    if (!module) module = this.modules.create({ code: 'IWD1', name: 'Interactive Web Design 1', semester: 2, coefficient: 1, program, teacher, semesterRef: semester2 });
    else { module.semesterRef = module.semesterRef || semester2; module.program = module.program || program; module.teacher = module.teacher || teacher; }
    module = await this.modules.save(module);

    if (!(await this.elements.findOne({ where: { module: { id: module.id }, code: 'HTMLCSS' } }))) {
      await this.elements.save(this.elements.create({ code: 'HTMLCSS', name: 'Websites Building with HTML/CSS', coefficient: 1, volumeHours: 30, module, teacher }));
    }

    const ruleSeeds: Array<{type: ValidationRuleType; numericValue?: number; booleanValue?: boolean}> = [
      { type: ValidationRuleType.MODULE_PASS_MARK, numericValue: 10 },
      { type: ValidationRuleType.SEMESTER_PASS_MARK, numericValue: 10 },
      { type: ValidationRuleType.ELIMINATORY_MARK, numericValue: 5 },
      { type: ValidationRuleType.COMPENSATION_ALLOWED, booleanValue: true },
      { type: ValidationRuleType.RESIT_ALLOWED, booleanValue: true },
      { type: ValidationRuleType.CAPITALIZATION_ALLOWED, booleanValue: true },
    ];
    for (const item of ruleSeeds) {
      if (!(await this.rules.findOne({ where: { type: item.type, level: { id: level.id } } }))) await this.rules.save(this.rules.create({ ...item, program, level }));
    }

    let assessment = await this.assessments.findOne({ where: { name: 'Contrôle continu', module: { id: module.id }, academicYear: { id: year.id } } });
    if (!assessment) assessment = await this.assessments.save(this.assessments.create({ name: 'Contrôle continu', type: AssessmentType.CONTINUOUS, weight: 0.4, maxValue: 20, module, academicYear: year, published: true }));
    if (!(await this.grades.findOne({ where: { student: { id: student.id }, assessment: { id: assessment.id } } }))) await this.grades.save(this.grades.create({ student, assessment, value: 14 }));
    if (!(await this.sessions.findOne({ where: { module: { id: module.id }, group: { id: group.id } } }))) await this.sessions.save(this.sessions.create({ module, teacher, group, startsAt: new Date('2026-09-29T09:00:00'), endsAt: new Date('2026-09-29T11:00:00'), room: 'Salle A1', groupName: group.name }));

    if (!(await this.campaigns.findOne({ where: { name: 'Admissions DGI 2026/2027' } }))) {
      await this.campaigns.save(this.campaigns.create({ name: 'Admissions DGI 2026/2027', startsOn: '2026-09-01', endsOn: '2026-12-31', status: CampaignStatus.OPEN, academicYear: year, programs: [program], eligibilityRules: { minAverage: 10, averageWeight: 0.7, testWeight: 0.3, shortlistThreshold: 12 } }));
    }
  }
}
