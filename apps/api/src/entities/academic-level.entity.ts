import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Program } from './program.entity';
import { AcademicSemester } from './academic-semester.entity';
import { ValidationRule } from './validation-rule.entity';

@Entity('academic_levels')
@Unique(['program', 'levelNumber'])
export class AcademicLevel {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() code: string;
  @Column() name: string;
  @Column({ type: 'int' }) levelNumber: number;
  @Column({ default: true }) active: boolean;
  @ManyToOne(() => Program, (program) => program.levels, { eager: true, onDelete: 'CASCADE' }) program: Program;
  @OneToMany(() => AcademicSemester, (semester) => semester.level) semesters: AcademicSemester[];
  @OneToMany(() => ValidationRule, (rule) => rule.level) validationRules: ValidationRule[];
}
