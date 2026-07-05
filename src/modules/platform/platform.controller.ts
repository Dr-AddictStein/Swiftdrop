import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreatePlatformAgentDto } from './dto/create-platform-agent.dto';
import { PlatformService } from './platform.service';

@Controller('platform')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('overview')
  getOverview() {
    return this.platformService.getOverview();
  }

  @Get('companies')
  getCompanies() {
    return this.platformService.getCompanies();
  }

  @Post('companies')
  createCompany(@Body() dto: CreateCompanyDto) {
    return this.platformService.createCompany(dto);
  }

  @Get('users')
  getUsers() {
    return this.platformService.getUsers();
  }

  @Post('agents')
  createAgent(@Body() dto: CreatePlatformAgentDto) {
    return this.platformService.createAgent(dto);
  }

  @Get('parcels')
  getParcels() {
    return this.platformService.getParcels();
  }
}
