import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AcademicLevel } from './academic-level.entity';
import { AcademicModule } from './academic-module.entity';

@Entity('academic_semesters')
@Unique(['level', 'ordinal'])
export class AcademicSemester {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() code: string;
  @Column() name: string;
  @Column({ type: 'int' }) ordinal: number;
  @Column({ default: true }) active: boolean;
  @ManyToOne(() => AcademicLevel, (level) => level.semesters, { eager: true, onDelete: 'CASCADE' }) level: AcademicLevel;
  @OneToMany(() => AcademicModule, (module) => module.semesterRef) modules: AcademicModule[];
}
