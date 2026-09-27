import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Program } from './program.entity';
import { Enrollment } from './enrollment.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) studentNumber: string;
  @Column() firstName: string;
  @Column() lastName: string;
  @Column({ unique: true }) email: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ default: 'ACTIVE' }) status: string;
  @ManyToOne(() => Program, (program) => program.students, { nullable: true, onDelete: 'SET NULL' }) program?: Program;
  @OneToMany(() => Enrollment, (enrollment) => enrollment.student) enrollments: Enrollment[];
}
