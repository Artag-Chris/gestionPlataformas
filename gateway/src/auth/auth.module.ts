import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * Módulo de autenticación.
 *
 * ESTADO ACTUAL: definido pero NO importado en AppModule.
 * Para activar:
 *   1. Configurar JWT_SECRET en .env
 *   2. Descomentar AuthModule en app.module.ts
 *   3. Descomentar @UseGuards(JwtAuthGuard) en los controllers
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<number>('JWT_EXPIRATION') ?? 3600,
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
