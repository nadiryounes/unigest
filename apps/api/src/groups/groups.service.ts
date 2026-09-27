import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentGroup } from '../entities/student-group.entity';
import { Program } from '../entities/program.entity';
import { AcademicYear } from '../entities/academic-year.entity';
import { AcademicLevel } from '../entities/academic-level.entity';
@Injectable()
export class GroupsService {
  constructor(@InjectRepository(StudentGroup) private repo:Repository<StudentGroup>,@InjectRepository(Program) private programs:Repository<Program>,@InjectRepository(AcademicYear) private years:Repository<AcademicYear>,@InjectRepository(AcademicLevel) private levels:Repository<AcademicLevel>){}
  findAll(){return this.repo.find({order:{name:'ASC'}})}
  async create(b:any){const program=await this.programs.findOne({where:{id:b.programId}}),academicYear=await this.years.findOne({where:{id:b.academicYearId}}),academicLevel=b.academicLevelId?await this.levels.findOne({where:{id:b.academicLevelId}}):undefined;if(!program||!academicYear)throw new NotFoundException('Filière ou année universitaire introuvable');if(b.academicLevelId&&!academicLevel)throw new NotFoundException('Niveau académique introuvable');if(academicLevel&&academicLevel.program.id!==program.id)throw new BadRequestException('Le niveau ne correspond pas à la filière');return this.repo.save(this.repo.create({name:b.name,level:Number(b.level||academicLevel?.levelNumber||1),program,academicYear,academicLevel}))}
}
