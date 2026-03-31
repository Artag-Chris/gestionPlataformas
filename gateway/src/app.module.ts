import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { WebsocketModule } from './websocket/ws.module';
import { MessagesModule } from './v1/messages/messages.module';
// import { AuthModule } from './auth/auth.module'; // TODO: activar cuando implementemos auth

@Module({
  imports: [
    // Variables de entorno disponibles en toda la app
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    PrismaModule,
    RabbitMQModule,
    WebsocketModule,

    // Módulos versionados
    MessagesModule,

    // TODO: AuthModule - descomentar cuando activemos autenticación
    // AuthModule,
  ],
})
export class AppModule {}
