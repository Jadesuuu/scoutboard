/**
 * Allowed browser origins for HTTP and WebSocket traffic.
 *
 * Read lazily (per request) rather than at import time: gateway decorators are
 * evaluated before ConfigModule has loaded `.env`, so a static value would
 * miss anything set in that file during local development.
 */
const DEFAULT_ORIGINS = ['http://localhost:3001'];

export function allowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) return DEFAULT_ORIGINS;
  const parsed = raw
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_ORIGINS;
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  // Non-browser clients (curl, server-to-server, health checks) send no Origin.
  if (!origin) return true;
  return allowedOrigins().includes(origin.replace(/\/$/, ''));
}

/** `cors`-package style origin delegate, shared by Express and Socket.IO. */
export const corsOriginDelegate = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => {
  callback(null, isAllowedOrigin(origin));
};
