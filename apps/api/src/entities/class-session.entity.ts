import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AcademicModule } from './academic-module.entity';
import { Teacher } from './teacher.entity';
import { Attendance } from './attendance.entity';
import { StudentGroup } from './student-group.entity';

@Entity('class_sessions')
export class ClassSession {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => AcademicModule, (module) => module.sessions, { eager: true, onDelete: 'CASCADE' }) module: AcademicModule;
  @ManyToOne(() => Teacher, (teacher) => teacher.sessions, { eager: true, nullable: true, onDelete: 'SET NULL' }) teacher?: Teacher;
  @ManyToOne(() => StudentGroup, { eager: true, nullable: true, onDelete: 'SET NULL' }) group?: StudentGroup;
  @Column() startsAt: Date;
  @Column() endsAt: Date;
  @Column({ nullable: true }) room?: string;
  @Column({ nullable: true }) groupName?: string;
  @OneToMany(() => Attendance, (attendance) => attendance.session) attendance: Attendance[];
}
