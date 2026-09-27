import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ClassSession } from './class-session.entity';
import { Student } from './student.entity';

@Entity('attendance')
@Unique(['session', 'student'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => ClassSession, (session) => session.attendance, { eager: true, onDelete: 'CASCADE' }) session: ClassSession;
  @ManyToOne(() => Student, { eager: true, onDelete: 'CASCADE' }) student: Student;
  @Column({ default: 'PRESENT' }) status: string;
  @Column({ nullable: true }) note?: string;
}
