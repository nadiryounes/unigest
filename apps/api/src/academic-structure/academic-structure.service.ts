import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicLevel } from '../entities/academic-level.entity';
import { AcademicSemester } from '../entities/academic-semester.entity';
import { ModuleElement } from '../entities/module-element.entity';
import { ValidationRule, ValidationRuleType } from '../entities/validation-rule.entity';
import { Program } from '../entities/program.entity';
import { AcademicModule } from '../entities/academic-module.entity';
import { Teacher } from '../entities/teacher.entity';

@Injectable()
export class AcademicStructureService {
  constructor(
    @InjectRepository(AcademicLevel) private readonly levelRepo: Repository<AcademicLevel>,
    @InjectRepository(AcademicSemester) private readonly semesterRepo: Repository<AcademicSemester>,
    @InjectRepository(ModuleElement) private readonly elementRepo: Repository<ModuleElement>,
    @InjectRepository(ValidationRule) private readonly ruleRepo: Repository<ValidationRule>,
    @InjectRepository(Program) private readonly programRepo: Repository<Program>,
    @InjectRepository(AcademicModule) private readonly moduleRepo: Repository<AcademicModule>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
  ) {}

  levels() {
    return this.levelRepo.find({ order: { program: { code: 'ASC' }, levelNumber: 'ASC' } });
  }

  semesters() {
    return this.semesterRepo.find({ order: { ordinal: 'ASC' } });
  }

  elements() {
    return this.elementRepo.find({ order: { module: { code: 'ASC' }, code: 'ASC' } });
  }

  rules() {
    return this.ruleRepo.find({ order: { type: 'ASC' } });
  }

  async createLevel(body: any) {
    const program = await this.programRepo.findOne({ where: { id: body.programId } });
    if (!program) throw new NotFoundException('Filière introuvable');

    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const levelNumber = Number(body.levelNumber);

    if (!code || !name) throw new BadRequestException('Code et nom du niveau requis');
    if (!Number.isInteger(levelNumber) || levelNumber < 1) {
      throw new BadRequestException('Niveau invalide');
    }

    const duplicate = await this.levelRepo.findOne({
      where: { program: { id: program.id }, levelNumber },
    });
    if (duplicate) throw new BadRequestException('Ce niveau existe déjà pour cette filière');

    return this.levelRepo.save(
      this.levelRepo.create({
        code,
        name,
        levelNumber,
        active: body.active !== false,
        program,
      }),
    );
  }

  async createSemester(body: any) {
    const level = await this.levelRepo.findOne({ where: { id: body.levelId } });
    if (!level) throw new NotFoundException('Niveau introuvable');

    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const ordinal = Number(body.ordinal);

    if (!code || !name) throw new BadRequestException('Code et nom du semestre requis');
    if (!Number.isInteger(ordinal) || ordinal < 1) {
      throw new BadRequestException('Numéro de semestre invalide');
    }

    const duplicate = await this.semesterRepo.findOne({
      where: { level: { id: level.id }, ordinal },
    });
    if (duplicate) throw new BadRequestException('Ce semestre existe déjà pour ce niveau');

    return this.semesterRepo.save(
      this.semesterRepo.create({
        code,
        name,
        ordinal,
        active: body.active !== false,
        level,
      }),
    );
  }

  async createElement(body: any) {
    const module = await this.moduleRepo.findOne({ where: { id: body.moduleId } });
    const teacher = body.teacherId
      ? (await this.teacherRepo.findOne({ where: { id: body.teacherId } })) ?? undefined
      : undefined;

    if (!module) throw new NotFoundException('Module introuvable');
    if (body.teacherId && !teacher) throw new NotFoundException('Enseignant introuvable');

    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const coefficient = Number(body.coefficient ?? 1);
    const volumeHours = Number(body.volumeHours ?? 0);

    if (!code || !name) throw new BadRequestException('Code et nom de l’élément requis');
    if (
      !Number.isFinite(coefficient) ||
      !Number.isFinite(volumeHours) ||
      coefficient <= 0 ||
      volumeHours < 0
    ) {
      throw new BadRequestException('Coefficient ou volume horaire invalide');
    }

    const duplicate = await this.elementRepo.findOne({
      where: { module: { id: module.id }, code },
    });
    if (duplicate) throw new BadRequestException('Cet élément existe déjà dans le module');

    return this.elementRepo.save(
      this.elementRepo.create({
        code,
        name,
        coefficient,
        volumeHours,
        active: body.active !== false,
        module,
        teacher,
      }),
    );
  }

  async createRule(body: any) {
    const type = String(body.type) as ValidationRuleType;
    if (!Object.values(ValidationRuleType).includes(type)) {
      throw new BadRequestException('Type de règle invalide');
    }

    const program = body.programId
      ? (await this.programRepo.findOne({ where: { id: body.programId } })) ?? undefined
      : undefined;
    const level = body.levelId
      ? (await this.levelRepo.findOne({ where: { id: body.levelId } })) ?? undefined
      : undefined;

    if (body.programId && !program) throw new NotFoundException('Filière introuvable');
    if (body.levelId && !level) throw new NotFoundException('Niveau introuvable');
    if (level && program && level.program.id !== program.id) {
      throw new BadRequestException('Le niveau ne correspond pas à la filière');
    }

    const numericValue =
      body.numericValue === '' || body.numericValue === undefined
        ? undefined
        : Number(body.numericValue);
    const booleanValue =
      body.booleanValue === '' || body.booleanValue === undefined
        ? undefined
        : [true, 'true', 1, '1'].includes(body.booleanValue);

    const numericTypes = new Set([
      ValidationRuleType.MODULE_PASS_MARK,
      ValidationRuleType.SEMESTER_PASS_MARK,
      ValidationRuleType.ELIMINATORY_MARK,
    ]);
    const booleanTypes = new Set([
      ValidationRuleType.COMPENSATION_ALLOWED,
      ValidationRuleType.RESIT_ALLOWED,
      ValidationRuleType.CAPITALIZATION_ALLOWED,
    ]);

    if (numericTypes.has(type) && (!Number.isFinite(numericValue) || numericValue! < 0 || numericValue! > 20)) {
      throw new BadRequestException('La valeur numérique de la règle doit être comprise entre 0 et 20');
    }
    if (booleanTypes.has(type) && booleanValue === undefined) {
      throw new BadRequestException('La valeur booléenne de la règle est requise');
    }

    const scopeProgramId = (program || level?.program)?.id;
    const existingRules = await this.ruleRepo.find();
    const duplicate = existingRules.some(
      (rule) =>
        rule.type === type &&
        (rule.level?.id || null) === (level?.id || null) &&
        (rule.program?.id || null) === (scopeProgramId || null),
    );
    if (duplicate) throw new BadRequestException('Une règle de ce type existe déjà pour ce périmètre');

    return this.ruleRepo.save(
      this.ruleRepo.create({
        type,
        numericValue,
        booleanValue,
        parameters: body.parameters || undefined,
        active: body.active !== false,
        program: program || level?.program,
        level,
      }),
    );
  }
}
