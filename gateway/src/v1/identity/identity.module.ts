import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';

@Module({
  imports: [PrismaModule],
  providers: [IdentityService],
  controllers: [IdentityController],
})
export class IdentityModule {}
