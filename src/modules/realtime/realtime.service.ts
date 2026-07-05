import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, merge, Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import type { NotificationRecord } from '../notifications/notifications.repository';
import type { ParcelRecord } from '../parcels/parcels.repository';
import type { RealtimeEvent } from './realtime.types';

@Injectable()
export class RealtimeService {
  private readonly events$ = new Subject<RealtimeEvent>();

  emitParcelUpdate(parcel: ParcelRecord): void {
    this.events$.next({ type: 'parcel.updated', parcel });
  }

  emitNotification(notification: NotificationRecord): void {
    this.events$.next({ type: 'notification.created', notification });
  }

  stream(user: AuthenticatedUser): Observable<MessageEvent> {
    const domainEvents$ = this.events$.pipe(
      filter((event) => this.canUserReceive(user, event)),
      map((event): MessageEvent => ({
        data: event,
      })),
    );

    const heartbeat$ = interval(25_000).pipe(
      map((): MessageEvent => ({
        data: { type: 'heartbeat' },
      })),
    );

    return merge(domainEvents$, heartbeat$);
  }

  private canUserReceive(
    user: AuthenticatedUser,
    event: RealtimeEvent,
  ): boolean {
    if (event.type === 'notification.created') {
      return event.notification.recipientId === user.id;
    }

    const parcel = event.parcel;

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (user.role === UserRole.ADMIN) {
      return parcel.companyId === user.companyId;
    }

    return parcel.assignedAgentId === user.id;
  }
}
