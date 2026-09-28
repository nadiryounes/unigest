import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { resolveJwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config),
    });
  }

  async validate(payload: { sub: string; av?: number }) {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.active) throw new UnauthorizedException('Compte inactif ou introuvable');
    if (Number(payload.av ?? 0) !== Number(user.authVersion || 0)) {
      throw new UnauthorizedException('Session expirée ou révoquée');
    }
    return user;
  }
}
