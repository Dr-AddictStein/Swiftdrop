import { randomBytes } from 'crypto';

export function generateTrackingNumber(): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `SWD-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}
