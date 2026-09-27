import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, Column } from 'typeorm';
import { Student } from './student.entity';
import { AcademicYear } from './academic-year.entity';
import { StudentGroup } from './student-group.entity';

@Entity('enrollments')
@Unique(['student', 'academicYear'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Student, (student) => student.enrollments, { eager: true, onDelete: 'CASCADE' }) student: Student;
  @ManyToOne(() => AcademicYear, (year) => year.enrollments, { eager: true, onDelete: 'CASCADE' }) academicYear: AcademicYear;
  @ManyToOne(() => StudentGroup, (group) => group.enrollments, { eager: true, nullable: true, onDelete: 'SET NULL' }) group?: StudentGroup;
  @Column({ default: 'ENROLLED' }) status: string;
  @CreateDateColumn() registeredAt: Date;
}
