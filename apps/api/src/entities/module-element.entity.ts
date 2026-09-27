import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AcademicModule } from './academic-module.entity';
import { Teacher } from './teacher.entity';

@Entity('module_elements')
@Unique(['module', 'code'])
export class ModuleElement {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() code: string;
  @Column() name: string;
  @Column({ type: 'float', default: 1 }) coefficient: number;
  @Column({ type: 'float', default: 0 }) volumeHours: number;
  @Column({ default: true }) active: boolean;
  @ManyToOne(() => AcademicModule, (module) => module.elements, { eager: true, onDelete: 'CASCADE' }) module: AcademicModule;
  @ManyToOne(() => Teacher, { eager: true, nullable: true, onDelete: 'SET NULL' }) teacher?: Teacher;
}
