import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, merge, Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import type { ParcelRecord } from '../parcels/parcels.repository';
import type { RealtimeEvent } from './realtime.types';

@Injectable()
export class RealtimeService {
  private readonly events$ = new Subject<RealtimeEvent>();

  emitParcelUpdate(parcel: ParcelRecord): void {
    this.events$.next({ type: 'parcel.updated', parcel });
  }

  stream(user: AuthenticatedUser): Observable<MessageEvent> {
    const parcelEvents$ = this.events$.pipe(
      filter((event) => this.canUserReceive(user, event.parcel)),
      map((event): MessageEvent => ({
        data: event,
      })),
    );

    const heartbeat$ = interval(25_000).pipe(
      map((): MessageEvent => ({
        data: { type: 'heartbeat' },
      })),
    );

    return merge(parcelEvents$, heartbeat$);
  }

  private canUserReceive(
    user: AuthenticatedUser,
    parcel: ParcelRecord,
  ): boolean {
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    return parcel.assignedAgentId === user.id;
  }
}
