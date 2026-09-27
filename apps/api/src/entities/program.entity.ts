import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AcademicModule } from './academic-module.entity';
import { Student } from './student.entity';
import { AcademicLevel } from './academic-level.entity';
import { ValidationRule } from './validation-rule.entity';

@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) code: string;
  @Column() name: string;
  @Column({ default: 5 }) durationYears: number;
  @Column({ default: true }) active: boolean;
  @OneToMany(() => Student, (student) => student.program) students: Student[];
  @OneToMany(() => AcademicModule, (module) => module.program) modules: AcademicModule[];
  @OneToMany(() => AcademicLevel, (level) => level.program) levels: AcademicLevel[];
  @OneToMany(() => ValidationRule, (rule) => rule.program) validationRules: ValidationRule[];
}
