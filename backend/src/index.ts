import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';
import { pool } from './db';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const origins = (process.env.CORS_ORIGIN || 'http://127.0.0.1:8080,http://localhost:8080')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origins,
    credentials: false,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

pool
  .query('SELECT 1')
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API PostgreSQL em http://127.0.0.1:${PORT} (CORS: ${origins.join(', ')})`);
    });
  })
  .catch((err) => {
    console.error('Falha a ligar ao Postgres:', err.message);
    process.exit(1);
  });
