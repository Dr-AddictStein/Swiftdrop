import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/services';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

export function useDeliveryAgents() {
  const { token, user } = useAuth();
  const [agents, setAgents] = useState<User[]>([]);

  useEffect(() => {
    if (!token || user?.role !== 'ADMIN') {
      setAgents([]);
      return;
    }

    void fetchUsers(token)
      .then((users) =>
        setAgents(users.filter((u) => u.role === 'DELIVERY_AGENT')),
      )
      .catch(() => setAgents([]));
  }, [token, user?.role]);

  return agents;
}
