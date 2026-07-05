import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AgentsService } from './agents.service';
import { ReportIncidentDto } from './dto/report-incident.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';

@Controller('agents')
@UseGuards(RolesGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('me/switch-company')
  @Roles(UserRole.DELIVERY_AGENT)
  switchCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchCompanyDto,
  ) {
    return this.agentsService.switchCompany(user, dto.joinCode);
  }

  @Post('me/report-incident')
  @Roles(UserRole.DELIVERY_AGENT)
  reportMyIncident(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReportIncidentDto,
  ) {
    return this.agentsService.reportIncident(user.id, user, dto.reason);
  }

  @Post(':agentId/report-incident')
  @Roles(UserRole.ADMIN)
  reportAgentIncident(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReportIncidentDto,
  ) {
    return this.agentsService.reportIncident(agentId, user, dto.reason);
  }
}
