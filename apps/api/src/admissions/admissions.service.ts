import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ApplicationCampaign, CampaignStatus } from '../entities/application-campaign.entity';
import { Candidate } from '../entities/candidate.entity';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { AcademicYear } from '../entities/academic-year.entity';
import { Program } from '../entities/program.entity';
import { Student } from '../entities/student.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { StudentGroup } from '../entities/student-group.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../entities/user.entity';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AdmissionsService {
  constructor(
    @InjectRepository(ApplicationCampaign) private readonly campaignRepo: Repository<ApplicationCampaign>,
    @InjectRepository(Candidate) private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(Application) private readonly applicationRepo: Repository<Application>,
    @InjectRepository(CandidateDocument) private readonly documentRepo: Repository<CandidateDocument>,
    @InjectRepository(AcademicYear) private readonly yearRepo: Repository<AcademicYear>,
    @InjectRepository(Program) private readonly programRepo: Repository<Program>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Enrollment) private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(StudentGroup) private readonly groupRepo: Repository<StudentGroup>,
    private readonly users: UsersService,
    private readonly storage: StorageService,
  ) {}

  async publicPrograms(campaignId?: string) {
    if (campaignId) { const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } }); if (!campaign || campaign.status !== CampaignStatus.OPEN) return []; return (campaign.programs || []).filter(p => p.active).sort((a,b) => a.code.localeCompare(b.code)); }
    return this.programRepo.find({ where: { active: true }, order: { code: 'ASC' } });
  }

  async campaigns(publicOnly: boolean) {
    const rows = await this.campaignRepo.find({ where: publicOnly ? { status: CampaignStatus.OPEN } : {}, order: { startsOn: 'DESC' } });
    if (!publicOnly) return rows;
    const today = new Date().toISOString().slice(0,10);
    return rows.filter(c => c.startsOn <= today && c.endsOn >= today);
  }

  async createCampaign(body: any) {
    const academicYear = await this.yearRepo.findOne({ where: { id: body.academicYearId } });
    if (!academicYear) throw new NotFoundException('Année universitaire introuvable');
    if (!body.name || !body.startsOn || !body.endsOn) throw new BadRequestException('Nom et dates obligatoires');
    if (String(body.startsOn) > String(body.endsOn)) throw new BadRequestException('La date de fin doit suivre la date de début');
    const status = String(body.status || CampaignStatus.DRAFT) as CampaignStatus;
    if (!Object.values(CampaignStatus).includes(status)) throw new BadRequestException('Statut de campagne invalide');
    const ids = Array.isArray(body.programIds) ? body.programIds : body.programId ? [body.programId] : [];
    if (!ids.length) throw new BadRequestException('Au moins une filière doit être ouverte dans la campagne');
    const programs = await this.programRepo.findBy({ id: In(ids) });
    if (programs.length !== ids.length) throw new BadRequestException('Une ou plusieurs filières sont introuvables');
    return this.campaignRepo.save(this.campaignRepo.create({ name: body.name, startsOn: body.startsOn, endsOn: body.endsOn, status, eligibilityRules: body.eligibilityRules || undefined, academicYear, programs }));
  }

  async applications(campaignId?: string, status?: string) {
    const rows = await this.applicationRepo.find({ relations: { documents: true }, order: { submittedAt: 'DESC' } });
    const filtered = rows.filter(a => (!campaignId || a.campaign.id === campaignId) && (!status || a.status === status));
    if (!campaignId) return filtered;
    return filtered.sort((a,b) => (b.score ?? -Infinity) - (a.score ?? -Infinity) || a.submittedAt.getTime() - b.submittedAt.getTime()).map((a,index) => ({ ...a, rank: a.score === null || a.score === undefined ? null : index + 1 }));
  }

  async applicationById(id: string) {
    const row = await this.applicationRepo.findOne({ where: { id }, relations: { documents: true } });
    if (!row) throw new NotFoundException('Candidature introuvable');
    return row;
  }

  private applicationNumber() {
    return `APP-${new Date().getUTCFullYear()}-${Date.now().toString(36).toUpperCase()}-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  private validateDocumentSignature(mimeType: string, buffer: Buffer) {
    const pdf = buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    const jpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const png = buffer.length >= 8 && pngSignature.every((value, index) => buffer[index] === value);

    const valid =
      (mimeType === 'application/pdf' && pdf) ||
      (mimeType === 'image/jpeg' && jpeg) ||
      (mimeType === 'image/png' && png);

    if (!valid) {
      throw new BadRequestException('Le contenu du fichier ne correspond pas au format déclaré');
    }
  }

  async submitApplication(body: any) {
    const campaign = await this.campaignRepo.findOne({ where: { id: body.campaignId } });
    const program = await this.programRepo.findOne({ where: { id: body.programId } });
    if (!campaign || campaign.status !== CampaignStatus.OPEN) throw new BadRequestException('Campagne non ouverte');
    const today = new Date().toISOString().slice(0,10);
    if (campaign.startsOn > today || campaign.endsOn < today) throw new BadRequestException('La période de candidature est fermée');
    if (!program || !program.active) throw new BadRequestException('Filière indisponible');
    if (!(campaign.programs || []).some(p => p.id === program.id)) throw new BadRequestException('Cette filière n’est pas ouverte dans la campagne sélectionnée');
    for (const field of ['firstName', 'lastName', 'email']) if (!String(body[field] || '').trim()) throw new BadRequestException(`${field} est obligatoire`);
    const email = String(body.email).trim().toLowerCase();
    let candidate = await this.candidateRepo.findOne({ where: { email } });
    if (!candidate) candidate = this.candidateRepo.create({ firstName: body.firstName, lastName: body.lastName, email, phone: body.phone, nationalId: body.nationalId, birthDate: body.birthDate, city: body.city });
    else Object.assign(candidate, { firstName: body.firstName, lastName: body.lastName, phone: body.phone || candidate.phone, nationalId: body.nationalId || candidate.nationalId, birthDate: body.birthDate || candidate.birthDate, city: body.city || candidate.city });
    candidate = await this.candidateRepo.save(candidate);
    const duplicate = await this.applicationRepo.findOne({ where: { candidate: { id: candidate.id }, campaign: { id: campaign.id }, program: { id: program.id } } });
    if (duplicate) throw new BadRequestException(`Une candidature existe déjà : ${duplicate.applicationNumber}`);
    const minAverage = Number((campaign.eligibilityRules as any)?.minAverage ?? 0);
    const average = Number(body.average ?? body.formData?.average ?? 0);
    const hasAverage = body.average !== undefined || body.formData?.average !== undefined;
    if (hasAverage && (!Number.isFinite(average) || average < 0 || average > 20)) {
      throw new BadRequestException('La moyenne doit être comprise entre 0 et 20');
    }
    const status = !hasAverage ? ApplicationStatus.SUBMITTED : minAverage > 0 && average < minAverage ? ApplicationStatus.INELIGIBLE : ApplicationStatus.ELIGIBLE;
    const formData = { ...(body.formData || {}), average: Number.isFinite(average) ? average : undefined, diploma: body.diploma, graduationYear: body.graduationYear };
    const application = await this.applicationRepo.save(this.applicationRepo.create({ applicationNumber: this.applicationNumber(), candidate, campaign, program, status, formData }));
    return { applicationNumber: application.applicationNumber, status: application.status, candidate: { firstName: candidate.firstName, lastName: candidate.lastName, email: candidate.email }, program: program.name, campaign: campaign.name };
  }

  async publicStatus(applicationNumber: string, email: string) {
    if (!applicationNumber || !email) throw new BadRequestException('Numéro de candidature et email requis');
    const row = await this.applicationRepo.findOne({ where: { applicationNumber }, relations: { documents: true } });
    if (!row || row.candidate.email.toLowerCase() !== String(email).trim().toLowerCase()) throw new NotFoundException('Candidature introuvable');
    return { applicationNumber: row.applicationNumber, status: row.status, program: row.program.name, campaign: row.campaign.name, score: row.score ?? null, decisionNote: row.decisionNote ?? null, documents: (row.documents || []).map(d => ({ type: d.type, originalName: d.originalName, status: d.status, uploadedAt: d.uploadedAt })) };
  }

  async uploadDocument(applicationNumber: string, email: string, type: string, file: any) {
    if (!file) throw new BadRequestException('Fichier manquant');
    if (!type) throw new BadRequestException('Type de pièce requis');
    const application = await this.applicationRepo.findOne({ where: { applicationNumber } });
    if (!application || application.candidate.email.toLowerCase() !== String(email || '').trim().toLowerCase()) throw new NotFoundException('Candidature introuvable');
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    if (!allowed.has(file.mimetype)) throw new BadRequestException('Formats acceptés : PDF, JPEG, PNG');
    this.validateDocumentSignature(file.mimetype, file.buffer);
    const extension = file.mimetype === 'application/pdf' ? '.pdf' : file.mimetype === 'image/png' ? '.png' : '.jpg';
    const storageKey = `candidates/${application.id}/${Date.now()}-${randomBytes(4).toString('hex')}${extension}`;
    await this.storage.save(storageKey, file.buffer, file.mimetype);
    const doc = await this.documentRepo.save(this.documentRepo.create({ type: String(type), originalName: String(file.originalname), storageKey, mimeType: file.mimetype, size: file.size, candidate: application.candidate, application }));
    return { id: doc.id, type: doc.type, originalName: doc.originalName, status: doc.status };
  }

  async downloadDocument(applicationId: string, documentId: string) {
    const application = await this.applicationById(applicationId);
    const doc = (application.documents || []).find((item) => item.id === documentId);
    if (!doc) throw new NotFoundException('Pièce introuvable pour cette candidature');
    const buffer = await this.storage.read(doc.storageKey);
    return { document: doc, buffer };
  }

  async updateStatus(id: string, statusValue: string, decisionNote?: string, score?: number) {
    const application = await this.applicationById(id);
    const status = String(statusValue) as ApplicationStatus;
    if (!Object.values(ApplicationStatus).includes(status)) throw new BadRequestException('Statut invalide');
    application.status = status;
    if (decisionNote !== undefined) application.decisionNote = decisionNote;
    if (score !== undefined && score !== null && score !== ('' as any)) {
      const numericScore = Number(score);
      if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 20) {
        throw new BadRequestException('Score invalide (0-20)');
      }
      application.score = numericScore;
    }
    return this.applicationRepo.save(application);
  }

  async evaluateCampaign(campaignId: string) {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campagne introuvable');
    const rules: any = campaign.eligibilityRules || {};
    const averageWeight = Number(rules.averageWeight ?? 0.7);
    const testWeight = Number(rules.testWeight ?? 0.3);
    const shortlistThreshold = Number(rules.shortlistThreshold ?? 12);
    const minAverage = Number(rules.minAverage ?? 0);
    const rows = (await this.applicationRepo.find()).filter(a => a.campaign.id === campaignId);
    let evaluated = 0;
    for (const application of rows) {
      if ([ApplicationStatus.ADMITTED, ApplicationStatus.REJECTED, ApplicationStatus.ENROLLED].includes(application.status)) continue;
      const data: any = application.formData || {};
      const hasAverage = data.average !== undefined && data.average !== null && data.average !== '';
      const hasTest = data.admissionTestScore !== undefined && data.admissionTestScore !== null && data.admissionTestScore !== '';
      const average = Number(data.average ?? 0);
      const test = Number(data.admissionTestScore ?? 0);
      if (hasAverage && minAverage > 0 && average < minAverage) { application.score = average; application.status = ApplicationStatus.INELIGIBLE; await this.applicationRepo.save(application); evaluated++; continue; }
      const numerator = (hasAverage ? average * averageWeight : 0) + (hasTest ? test * testWeight : 0);
      const denominator = (hasAverage ? averageWeight : 0) + (hasTest ? testWeight : 0);
      const score = Number((denominator ? numerator / denominator : 0).toFixed(3));
      application.score = score;
      application.status = score >= shortlistThreshold ? ApplicationStatus.SHORTLISTED : ApplicationStatus.ELIGIBLE;
      await this.applicationRepo.save(application);
      evaluated++;
    }
    return { campaignId, evaluated, formula: { minAverage, averageWeight, testWeight, shortlistThreshold } };
  }

  async convertToStudent(id: string, body: any) {
    const application = await this.applicationById(id);
    if (application.status !== ApplicationStatus.ADMITTED) throw new BadRequestException('La candidature doit être admise avant conversion');
    let group: StudentGroup | undefined;
    if (body.groupId) {
      group = await this.groupRepo.findOne({ where: { id: body.groupId } }) || undefined;
      if (!group) throw new NotFoundException('Groupe introuvable');
      if (group.program.id !== application.program.id || group.academicYear.id !== application.campaign.academicYear.id) throw new BadRequestException('Le groupe ne correspond pas à la filière ou à l’année de la candidature');
    }
    let student = await this.studentRepo.findOne({ where: { email: application.candidate.email } });
    if (student && student.program && student.program.id !== application.program.id) throw new BadRequestException('Un dossier étudiant existe déjà avec cet email dans une autre filière');
    if (!student) {
      const studentNumber = String(body.studentNumber || `ETU-${application.campaign.academicYear.label.replace(/\D/g, '').slice(0, 4)}-${Date.now().toString().slice(-6)}`);
      student = await this.studentRepo.save(this.studentRepo.create({ studentNumber, firstName: application.candidate.firstName, lastName: application.candidate.lastName, email: application.candidate.email, phone: application.candidate.phone, status: 'ACTIVE', program: application.program }));
    }
    let enrollment = await this.enrollmentRepo.findOne({ where: { student: { id: student.id }, academicYear: { id: application.campaign.academicYear.id } } });
    if (!enrollment) enrollment = await this.enrollmentRepo.save(this.enrollmentRepo.create({ student, academicYear: application.campaign.academicYear, group, status: 'ENROLLED' }));
    else if (group && enrollment.group?.id !== group.id) { enrollment.group = group; enrollment = await this.enrollmentRepo.save(enrollment); }
    let accountCreated = false;
    if (body.createAccount !== false && !(await this.users.findByEmail(student.email))) {
      if (!body.temporaryPassword || String(body.temporaryPassword).length < 12) throw new BadRequestException('Un mot de passe temporaire de 12 caractères minimum est requis pour créer le compte');
      await this.users.create({ email: student.email, password: body.temporaryPassword, firstName: student.firstName, lastName: student.lastName, role: UserRole.STUDENT, studentProfileId: student.id });
      accountCreated = true;
    }
    application.status = ApplicationStatus.ENROLLED;
    await this.applicationRepo.save(application);
    return { applicationNumber: application.applicationNumber, student, enrollment, accountCreated };
  }

  async stats() {
    const applications = await this.applicationRepo.find();
    const campaigns = await this.campaignRepo.count();
    const byStatus = Object.values(ApplicationStatus).reduce((acc: Record<string, number>, status) => { acc[status] = applications.filter(a => a.status === status).length; return acc; }, {});
    return { campaigns, applications: applications.length, byStatus };
  }
}
