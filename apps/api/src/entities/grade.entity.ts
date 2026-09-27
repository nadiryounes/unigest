import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Assessment } from './assessment.entity';
import { Student } from './student.entity';

@Entity('grades')
@Unique(['student', 'assessment'])
export class Grade {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Student, { eager: true, onDelete: 'CASCADE' }) student: Student;
  @ManyToOne(() => Assessment, (assessment) => assessment.grades, { eager: true, onDelete: 'CASCADE' }) assessment: Assessment;
  @Column({ type: 'float' }) value: number;
  @Column({ nullable: true }) note?: string;
}
