import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/user.entity';
import { Student } from '../entities/student.entity';
import { Teacher } from '../entities/teacher.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
  ) {}

  findByEmail(email: string) { return this.repo.findOne({ where: { email } }); }
  findById(id: string) { return this.repo.findOne({ where: { id } }); }

  async ensureBootstrapAdmin(email: string, password: string) {
    const expectedEmail = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    const expectedPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (
      !expectedEmail ||
      expectedPassword.length < 12 ||
      normalizedEmail !== expectedEmail ||
      password !== expectedPassword
    ) return undefined;

    const existing = await this.repo.findOne({ where: { email: expectedEmail } });
    if (existing) return undefined;

    const user = this.repo.create({
      email: expectedEmail,
      passwordHash: await bcrypt.hash(expectedPassword, 12),
      firstName: String(process.env.BOOTSTRAP_ADMIN_FIRST_NAME || 'Administrateur'),
      lastName: String(process.env.BOOTSTRAP_ADMIN_LAST_NAME || 'UniGest'),
      role: UserRole.ADMIN,
      active: true,
      authVersion: 0,
    });

    return this.repo.save(user);
  }

  async listSafe() {
    const rows = await this.repo.find({ order: { lastName: 'ASC', firstName: 'ASC' } });
    return rows.map(({ passwordHash, ...user }) => user);
  }

  async create(body: any) {
    const role = String(body.role || UserRole.STUDENT) as UserRole;
    const email = String(body.email || '').trim().toLowerCase();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    if (!Object.values(UserRole).includes(role)) throw new BadRequestException('Rôle invalide');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestException('Email invalide');
    if (!firstName || !lastName) throw new BadRequestException('Prénom et nom requis');
    if (!body.password || String(body.password).length < 12) throw new BadRequestException('Le mot de passe doit contenir au moins 12 caractères');
    if (await this.findByEmail(email)) throw new BadRequestException('Un compte utilise déjà cet email');

    let studentProfile: Student | undefined;
    let teacherProfile: Teacher | undefined;
    if (body.studentProfileId) studentProfile = await this.students.findOne({ where: { id: body.studentProfileId } }) || undefined;
    if (body.teacherProfileId) teacherProfile = await this.teachers.findOne({ where: { id: body.teacherProfileId } }) || undefined;
    if (body.studentProfileId && !studentProfile) throw new NotFoundException('Profil étudiant introuvable');
    if (body.teacherProfileId && !teacherProfile) throw new NotFoundException('Profil enseignant introuvable');
    if (role === UserRole.STUDENT && !studentProfile) throw new BadRequestException('Un compte étudiant doit être lié à un dossier étudiant');
    if (role === UserRole.TEACHER && !teacherProfile) throw new BadRequestException('Un compte enseignant doit être lié à un dossier enseignant');
    if (studentProfile && await this.repo.findOne({ where: { studentProfile: { id: studentProfile.id } } })) throw new BadRequestException('Ce dossier étudiant est déjà lié à un compte');
    if (teacherProfile && await this.repo.findOne({ where: { teacherProfile: { id: teacherProfile.id } } })) throw new BadRequestException('Ce dossier enseignant est déjà lié à un compte');

    const saved = await this.repo.save(this.repo.create({
      email,
      passwordHash: await bcrypt.hash(String(body.password), 12),
      firstName,
      lastName,
      role,
      active: body.active !== false,
      studentProfile,
      teacherProfile,
      authVersion: 0,
    }));
    const { passwordHash, ...safe } = saved;
    return safe;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user || !user.active) throw new NotFoundException('Compte introuvable');
    if (!(await bcrypt.compare(String(currentPassword || ''), user.passwordHash))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    const next = String(newPassword || '');
    if (next.length < 12) throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 12 caractères');
    if (await bcrypt.compare(next, user.passwordHash)) throw new BadRequestException('Le nouveau mot de passe doit être différent de l’ancien');

    user.passwordHash = await bcrypt.hash(next, 12);
    user.passwordChangedAt = new Date();
    user.authVersion = Number(user.authVersion || 0) + 1;
    await this.repo.save(user);
    return { changed: true };
  }

  async setPassword(id: string, newPassword: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user || !user.active) throw new NotFoundException('Compte introuvable');

    const next = String(newPassword || '');
    if (next.length < 12) {
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 12 caractères');
    }
    if (await bcrypt.compare(next, user.passwordHash)) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l’ancien');
    }

    user.passwordHash = await bcrypt.hash(next, 12);
    user.passwordChangedAt = new Date();
    user.authVersion = Number(user.authVersion || 0) + 1;
    await this.repo.save(user);
    return { changed: true };
  }

  async revokeAllSessions(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Compte introuvable');
    user.authVersion = Number(user.authVersion || 0) + 1;
    await this.repo.save(user);
    return { revoked: true };
  }

  async setActive(id: string, active: boolean) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Compte introuvable');
    user.active = !!active;
    if (!user.active) user.authVersion = Number(user.authVersion || 0) + 1;
    const saved = await this.repo.save(user);
    const { passwordHash, ...safe } = saved;
    return safe;
  }
}
