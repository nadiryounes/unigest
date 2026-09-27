import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Program } from './program.entity';
import { Teacher } from './teacher.entity';
import { ClassSession } from './class-session.entity';
import { Assessment } from './assessment.entity';
import { AcademicSemester } from './academic-semester.entity';
import { ModuleElement } from './module-element.entity';

@Entity('academic_modules')
export class AcademicModule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) code: string;
  @Column() name: string;
  @Column({ type: 'int', default: 1 }) semester: number;
  @Column({ type: 'float', default: 1 }) coefficient: number;
  @ManyToOne(() => Program, (program) => program.modules, { eager: true, nullable: true, onDelete: 'SET NULL' }) program?: Program;
  @ManyToOne(() => AcademicSemester, (semester) => semester.modules, { eager: true, nullable: true, onDelete: 'SET NULL' }) semesterRef?: AcademicSemester;
  @ManyToOne(() => Teacher, (teacher) => teacher.modules, { eager: true, nullable: true, onDelete: 'SET NULL' }) teacher?: Teacher;
  @OneToMany(() => ModuleElement, (element) => element.module) elements: ModuleElement[];
  @OneToMany(() => ClassSession, (session) => session.module) sessions: ClassSession[];
  @OneToMany(() => Assessment, (assessment) => assessment.module) assessments: Assessment[];
}
