import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { ClassSession } from '../entities/class-session.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { Teacher } from '../entities/teacher.entity';
import { StudentGroup } from '../entities/student-group.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ClassSession) private readonly repo: Repository<ClassSession>,
    @InjectRepository(AcademicModule) private readonly modules: Repository<AcademicModule>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(StudentGroup) private readonly groups: Repository<StudentGroup>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
  ) {}

  async findAll(user: User) {
    const rows = await this.repo.find({ order: { startsAt: 'ASC' } });
    if (user.role === UserRole.ADMIN || user.role === UserRole.SCOLARITE) return rows;
    if (user.role === UserRole.TEACHER) {
      return user.teacherProfile ? rows.filter((s) => s.teacher?.id === user.teacherProfile?.id) : [];
    }
    if (user.role === UserRole.STUDENT && user.studentProfile) {
      const enrollments = await this.enrollments.find({ where: { student: { id: user.studentProfile.id } } });
      const groupIds = new Set(enrollments.map((e) => e.group?.id).filter(Boolean));
      return rows.filter((s) => !!s.group?.id && groupIds.has(s.group.id));
    }
    return [];
  }

  async create(body: any) {
    const module = await this.modules.findOne({ where: { id: body.moduleId } });
    if (!module) throw new NotFoundException('Module introuvable');

    const teacher = body.teacherId
      ? (await this.teachers.findOne({ where: { id: body.teacherId } })) ?? undefined
      : module.teacher;
    const group = body.groupId
      ? (await this.groups.findOne({ where: { id: body.groupId } })) ?? undefined
      : undefined;

    if (body.groupId && !group) throw new NotFoundException('Groupe introuvable');

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (!(startsAt < endsAt)) throw new BadRequestException('Intervalle horaire invalide');

    const overlaps = await this.repo.find({
      where: { startsAt: LessThan(endsAt), endsAt: MoreThan(startsAt) },
    });

    if (
      overlaps.some(
        (x) =>
          (body.room && x.room === body.room) ||
          (teacher && x.teacher?.id === teacher.id) ||
          (group && x.group?.id === group.id),
      )
    ) {
      throw new BadRequestException('Conflit détecté pour la salle, l’enseignant ou le groupe');
    }

    return this.repo.save(
      this.repo.create({
        module,
        teacher,
        group,
        startsAt,
        endsAt,
        room: body.room,
        groupName: group?.name || body.groupName,
      }),
    );
  }
}
