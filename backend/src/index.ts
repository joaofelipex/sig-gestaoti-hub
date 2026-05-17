import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';
import { ensureAuthSchema, pool } from './db';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const corsRaw = (process.env.CORS_ORIGIN || 'http://127.0.0.1:8080,http://localhost:8080,http://[::1]:8080').trim();

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
        }
  )
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'up' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'erro';
    res.status(503).json({ ok: false, database: 'down', error: msg });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

Promise.all([pool.query('SELECT 1'), ensureAuthSchema()])
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API em http://127.0.0.1:${PORT} · Postgres OK · CORS: ${corsRaw === '*' ? '*' : corsRaw}`);
    });
  })
  .catch((err) => {
    console.error('Falha a ligar ao Postgres:', err.message);
    process.exit(1);
  });
