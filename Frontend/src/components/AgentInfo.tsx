import type { User } from '../types';

export function AgentInfo({
  agent,
  fallback = 'Unassigned',
}: {
  agent: User | null;
  fallback?: string;
}) {
  if (!agent) {
    return <span className="muted">{fallback}</span>;
  }

  return (
    <div className="agent-info">
      <strong>{agent.name}</strong>
      <span className="muted">{agent.email}</span>
    </div>
  );
}
