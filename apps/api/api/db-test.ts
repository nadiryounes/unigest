import { Client } from 'pg';

function safeError(error: any) {
  return {
    code: error?.code || undefined,
    name: error?.name || 'Error',
    message: String(error?.message || error || 'Unknown error').slice(0, 300),
  };
}

async function tryConnection(url: string, mode: string) {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
  });

  const startedAt = Date.now();
  try {
    await client.connect();
    const result = await client.query('SELECT 1 AS ok');
    return {
      mode,
      ok: result.rows?.[0]?.ok === 1,
      ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      mode,
      ok: false,
      ms: Date.now() - startedAt,
      error: safeError(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export default async function handler(_req: any, res: any) {
  const configured = String(process.env.DATABASE_URL || '');
  if (!configured) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL missing' });
  }

  const sessionUrl = configured.replace(':6543/', ':5432/');
  const transactionUrl = configured.replace(':5432/', ':6543/');

  const session = await tryConnection(sessionUrl, 'session-5432');
  const transaction = await tryConnection(transactionUrl, 'transaction-6543');

  const ok = session.ok || transaction.ok;
  return res.status(ok ? 200 : 503).json({
    ok,
    session,
    transaction,
  });
}
