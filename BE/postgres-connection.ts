/** PostgreSQL connection policy. Remote connections always verify server certificates.
 * Loopback without TLS is only permitted by an explicit opt-in for local development.
 */
export function postgresConnectionUrl(value: string, options: { allowLocalNoTls?: boolean; deployed?: boolean } = {}): string {
  const url = new URL(value);
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw new Error('Invalid PostgreSQL URL protocol');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (options.allowLocalNoTls && local && !options.deployed) {
    url.searchParams.set('sslmode', 'disable');
  } else {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.href;
}
export function configuredPostgresConnectionUrl(value: string): string {
  return postgresConnectionUrl(value, {
    allowLocalNoTls: process.env.DTU_LOCAL_PG_NO_TLS === 'true',
    deployed: Boolean(process.env.VERCEL),
  });
}
