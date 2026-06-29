import { Controller, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse('stream')
  stream(
    @CurrentUser() user: AuthenticatedUser,
  ): Observable<{ data: unknown }> {
    return this.realtimeService.stream(user);
  }
}
