import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Program } from '../entities/program.entity';

@Injectable()
export class StudentsService {
  constructor(@InjectRepository(Student) private repo:Repository<Student>, @InjectRepository(Program) private programs:Repository<Program>){}
  findAll(){ return this.repo.find({relations:{program:true},order:{lastName:'ASC'}}); }
  async create(body:any){
    let program:Program|undefined;
    if(body.programId){ program=await this.programs.findOne({where:{id:body.programId}}) || undefined; if(!program) throw new NotFoundException('Filière introuvable'); }
    return this.repo.save(this.repo.create({studentNumber:body.studentNumber,firstName:body.firstName,lastName:body.lastName,email:body.email,phone:body.phone,program}));
  }
  async importRows(rows:any[]){
    if(!Array.isArray(rows) || !rows.length) throw new BadRequestException('Aucune ligne à importer');
    const programs=await this.programs.find();
    const report={created:0,updated:0,errors:[] as {row:number,message:string}[]};
    for(let i=0;i<rows.length;i++){
      const r=rows[i]||{};
      try{
        const studentNumber=String(r.studentNumber||r.numero||r['Numéro']||'').trim();
        const firstName=String(r.firstName||r.prenom||r['Prénom']||'').trim();
        const lastName=String(r.lastName||r.nom||r['Nom']||'').trim();
        const email=String(r.email||r['Email']||'').trim();
        if(!studentNumber||!firstName||!lastName||!email) throw new Error('Numéro, prénom, nom et email requis');
        const programCode=String(r.programCode||r.filiere||r['Filière']||'').trim();
        const program=programCode?programs.find(p=>p.code.toLowerCase()===programCode.toLowerCase()):undefined;
        if(programCode&&!program) throw new Error(`Filière ${programCode} introuvable`);
        let student=await this.repo.findOne({where:{studentNumber}});
        const isNew=!student;
        if(!student) student=this.repo.create({studentNumber});
        student.firstName=firstName; student.lastName=lastName; student.email=email; student.phone=r.phone||r.telephone||r['Téléphone']||undefined; student.program=program;
        await this.repo.save(student);
        if(isNew) report.created++; else report.updated++;
      }catch(e:any){ report.errors.push({row:i+2,message:e.message||'Erreur'}); }
    }
    return report;
  }
}
