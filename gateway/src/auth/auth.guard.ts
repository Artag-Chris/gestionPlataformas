import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de autenticación JWT.
 *
 * ESTADO ACTUAL: desactivado (canActivate retorna true).
 * Para activar:
 *   1. Configurar JWT_SECRET y JWT_EXPIRATION en .env
 *   2. Cambiar return true por: return super.canActivate(context)
 *   3. Descomentar @UseGuards(JwtAuthGuard) en los controllers
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(_context: ExecutionContext): boolean {
    // TODO: cuando activemos auth, reemplazar por:
    // return super.canActivate(context) as boolean;
    return true;
  }
}
