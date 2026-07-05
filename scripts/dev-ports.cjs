/**
 * Portas de dev (frontend 8080, API 3000): verificar ou libertar antes de npm run dev.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');

const WEB_PORT = parseInt(process.env.WEB_PORT || '8080', 10);
const API_PORT = parseInt(process.env.API_PORT || '3000', 10);
const DEV_PORTS = [WEB_PORT, API_PORT];

function isPortInUse(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', (err) => resolve(err.code === 'EADDRINUSE'));
    s.once('listening', () => {
      s.close();
      resolve(false);
    });
    s.listen(port, '0.0.0.0');
  });
}

function findPidsOnPort(port) {
  const r = spawnSync('ss', ['-tlnp'], { encoding: 'utf8' });
  if (r.status !== 0) return [];
  const pids = new Set();
  const portRe = new RegExp(`:${port}\\s`);
  for (const line of r.stdout.split('\n')) {
    if (!portRe.test(line)) continue;
    for (const m of line.matchAll(/pid=(\d+)/g)) {
      pids.add(parseInt(m[1], 10));
    }
  }
  return [...pids];
}

function getCmdline(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();
  } catch {
    return '';
  }
}

function isDevProcess(cmdline) {
  return /ng\.js serve|ng serve|ts-node-dev|start-dev\.cjs|start:processes|concurrently|sig-heartbeat-hub/.test(
    cmdline,
  );
}

function killPid(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

function freePorts(ports) {
  const freed = [];
  const skipped = [];

  for (const port of ports) {
    for (const pid of findPidsOnPort(port)) {
      const cmd = getCmdline(pid);
      if (cmd && !isDevProcess(cmd)) {
        skipped.push({ port, pid, cmd: cmd.slice(0, 100) });
        continue;
      }
      if (killPid(pid)) {
        freed.push({ port, pid, cmd: cmd.slice(0, 80) });
      }
    }
  }

  return { freed, skipped };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const cmd = process.argv[2] || 'free';

  if (cmd === 'check') {
    const busy = [];
    for (const port of DEV_PORTS) {
      if (await isPortInUse(port)) busy.push(port);
    }
    if (busy.length) {
      console.error(`Portas em uso: ${busy.join(', ')}. Corra: npm run dev:stop`);
      process.exit(1);
    }
    return;
  }

  if (cmd !== 'free') {
    console.error('Uso: node scripts/dev-ports.cjs [free|check]');
    process.exit(1);
  }

  const { freed, skipped } = freePorts(DEV_PORTS);

  for (const s of skipped) {
    console.warn(
      `[dev-ports] Porta ${s.port} ocupada por PID ${s.pid} (outro processo): ${s.cmd}`,
    );
    console.warn('[dev-ports] Pare manualmente ou altere a porta.');
  }

  if (freed.length) {
    await sleep(600);
    console.log(
      `[dev-ports] Instância anterior terminada: ${freed.map((f) => `:${f.port} (pid ${f.pid})`).join(', ')}`,
    );
  }

  const stillBusy = [];
  for (const port of DEV_PORTS) {
    if (await isPortInUse(port)) stillBusy.push(port);
  }
  if (stillBusy.length) {
    console.error(`[dev-ports] Ainda em uso: ${stillBusy.join(', ')}. Tente: npm run dev:stop`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
