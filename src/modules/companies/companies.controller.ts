import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CompaniesService } from './companies.service';

@Controller('companies')
@UseGuards(RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get('me')
  @Roles(UserRole.ADMIN)
  findMyCompany(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.findMyCompany(user);
  }
}
