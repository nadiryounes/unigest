import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicYear } from '../entities/academic-year.entity';
@Injectable()
export class AcademicYearsService {
  constructor(@InjectRepository(AcademicYear) private readonly repo:Repository<AcademicYear>){}
  findAll(){ return this.repo.find({order:{startsOn:'DESC'}}); }
  async create(body:any){
    if(!body.label || !body.startsOn || !body.endsOn) throw new BadRequestException('Libellé et dates requis');
    if(new Date(body.startsOn) >= new Date(body.endsOn)) throw new BadRequestException('Dates invalides');
    if(body.active) await this.repo.createQueryBuilder().update(AcademicYear).set({active:false}).execute();
    return this.repo.save(this.repo.create({label:body.label,startsOn:body.startsOn,endsOn:body.endsOn,active:!!body.active}));
  }
}
