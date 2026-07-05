import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('agents')
  @Roles(UserRole.ADMIN)
  getAgentSummaries(@CurrentUser() user: AuthenticatedUser) {
    if (!user.companyId) {
      throw new ForbiddenException('You must belong to a company');
    }

    return this.reportsService.getAgentSummaries(user.companyId);
  }
}
