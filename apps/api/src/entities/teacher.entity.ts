import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AcademicModule } from './academic-module.entity';
import { ClassSession } from './class-session.entity';

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) employeeNumber: string;
  @Column() firstName: string;
  @Column() lastName: string;
  @Column({ unique: true }) email: string;
  @Column({ nullable: true }) department?: string;
  @OneToMany(() => AcademicModule, (module) => module.teacher) modules: AcademicModule[];
  @OneToMany(() => ClassSession, (session) => session.teacher) sessions: ClassSession[];
}
