import './env';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';
import { ensureAuthSchema, getPostgresTargetLabel, pool, verifyConnection } from './db';
import { ensureEmpresasUniqueOnStartup } from './ensure-empresas-unique';
import { logStartupDataSummary } from './startup-log';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const corsRaw = (process.env.CORS_ORIGIN || 'http://127.0.0.1:8080,http://localhost:8080,http://[::1]:8080').trim();

let postgresTarget: { database: string; host: string; port: number } | null = null;

app.use(
  cors(
    corsRaw === '*'
      ? { origin: true, credentials: false }
      : {
          origin: corsRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          credentials: false,
        },
  ),
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    const pg = postgresTarget ?? (await verifyConnection());
    res.json({
      ok: true,
      database: 'up',
      postgres: {
        database: pg.database,
        host: pg.host,
        port: pg.port,
        configured: getPostgresTargetLabel(),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'erro';
    res.status(503).json({
      ok: false,
      database: 'down',
      error: msg,
      configured: getPostgresTargetLabel(),
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

async function start() {
  const label = getPostgresTargetLabel();
  console.log(`[postgres] A ligar a ${label} …`);

  await pool.query('SELECT 1');
  postgresTarget = await verifyConnection();
  await ensureAuthSchema();
  await ensureEmpresasUniqueOnStartup();
  await logStartupDataSummary();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[postgres] Ligado: ${postgresTarget!.host}:${postgresTarget!.port}/${postgresTarget!.database}`,
    );
    console.log(`[api] http://127.0.0.1:${PORT} · CORS: ${corsRaw === '*' ? '*' : corsRaw}`);
  });
}

start().catch((err: Error) => {
  const label = getPostgresTargetLabel();
  console.error(`[postgres] Falha (${label}):`, err.message);
  if (/ECONNREFUSED|connect/i.test(err.message)) {
    console.error('[postgres] Nada está a escutar nessa porta. Verifique:');
    console.error('  • O Postgres do DBeaver está ligado?');
    console.error('  • backend/.env com o mesmo host/porta/user/base do DBeaver');
    console.error('  • WSL + Postgres no Windows: DB_HOST = IP do Windows (ver /etc/resolv.conf)');
  }
  process.exit(1);
});
