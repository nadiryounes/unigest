import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Program } from './program.entity';
import { AcademicYear } from './academic-year.entity';
import { Enrollment } from './enrollment.entity';
import { AcademicLevel } from './academic-level.entity';

@Entity('student_groups')
@Unique(['name', 'academicYear', 'program'])
export class StudentGroup {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ type: 'int', default: 1 }) level: number;
  @ManyToOne(() => Program, { eager: true, onDelete: 'CASCADE' }) program: Program;
  @ManyToOne(() => AcademicYear, (year) => year.groups, { eager: true, onDelete: 'CASCADE' }) academicYear: AcademicYear;
  @ManyToOne(() => AcademicLevel, { eager: true, nullable: true, onDelete: 'SET NULL' }) academicLevel?: AcademicLevel;
  @OneToMany(() => Enrollment, (enrollment) => enrollment.group) enrollments: Enrollment[];
}
