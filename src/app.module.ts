import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ParcelsModule } from './modules/parcels/parcels.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule,
    DatabaseModule,
    RealtimeModule,
    AuthModule,
    CompaniesModule,
    NotificationsModule,
    ParcelsModule,
    ReportsModule,
    AgentsModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
