import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Program } from './program.entity';
import { AcademicLevel } from './academic-level.entity';

export enum ValidationRuleType {
  MODULE_PASS_MARK = 'MODULE_PASS_MARK',
  SEMESTER_PASS_MARK = 'SEMESTER_PASS_MARK',
  ELIMINATORY_MARK = 'ELIMINATORY_MARK',
  COMPENSATION_ALLOWED = 'COMPENSATION_ALLOWED',
  RESIT_ALLOWED = 'RESIT_ALLOWED',
  CAPITALIZATION_ALLOWED = 'CAPITALIZATION_ALLOWED',
}

@Entity('validation_rules')
export class ValidationRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: ValidationRuleType }) type: ValidationRuleType;
  @Column({ type: 'float', nullable: true }) numericValue?: number;
  @Column({ type: 'boolean', nullable: true }) booleanValue?: boolean;
  @Column({ type: 'jsonb', nullable: true }) parameters?: Record<string, unknown>;
  @Column({ default: true }) active: boolean;
  @ManyToOne(() => Program, (program) => program.validationRules, { eager: true, nullable: true, onDelete: 'CASCADE' }) program?: Program;
  @ManyToOne(() => AcademicLevel, (level) => level.validationRules, { eager: true, nullable: true, onDelete: 'CASCADE' }) level?: AcademicLevel;
}
