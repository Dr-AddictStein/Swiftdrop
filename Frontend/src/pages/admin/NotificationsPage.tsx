import { useNotifications } from '../../context/NotificationsContext';
import { Card, EmptyState, PageHeader } from '../../components/Common';
import { Button } from '../../components/Modal';
import type { NotificationType } from '../../types';

const TYPE_LABELS: Record<NotificationType, string> = {
  AGENT_LEFT_COMPANY: 'Agent left',
  AGENT_JOINED_COMPANY: 'Agent joined',
  AGENT_INCIDENT_REPORTED: 'Incident reported',
  PARCEL_REASSIGNED: 'Parcel reassigned',
  PARCEL_NEEDS_MANUAL_ASSIGNMENT: 'Manual assignment needed',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function NotificationsPage() {
  const { notifications, unreadCount, markRead } = useNotifications();

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.`
            : 'Alerts about agent changes and parcel reassignments.'
        }
      />

      <Card>
        {notifications.length === 0 ? (
          <EmptyState message="No notifications yet." />
        ) : (
          <ul className="notification-list">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`notification-item ${n.isRead ? '' : 'notification-item--unread'}`}
              >
                <div className="notification-item__body">
                  <span className="role-chip">{TYPE_LABELS[n.type]}</span>
                  <p>{n.message}</p>
                  <span className="muted">{formatTime(n.createdAt)}</span>
                </div>
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void markRead(n.id)}
                  >
                    Mark read
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
