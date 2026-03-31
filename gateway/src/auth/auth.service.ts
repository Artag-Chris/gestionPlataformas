import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt.strategy';

/**
 * Servicio de autenticación.
 *
 * ESTADO ACTUAL: métodos definidos pero no utilizados.
 * Para activar: importar AuthModule en app.module.ts y descomentar guards.
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  generateToken(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }

  verifyToken(token: string): JwtPayload {
    return this.jwt.verify<JwtPayload>(token);
  }
}
