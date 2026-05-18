/**
 * Verifica portas Postgres comuns e devolve { host, port } da primeira que responder.
 */
const net = require('net');

function tryPort(host, port, ms = 1500) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port }, () => {
      s.end();
      resolve(true);
    });
    s.setTimeout(ms);
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.on('error', () => resolve(false));
  });
}

function wslWindowsHost() {
  try {
    const fs = require('fs');
    const resolv = fs.readFileSync('/etc/resolv.conf', 'utf8');
    const m = resolv.match(/nameserver\s+(\S+)/);
    const ip = m ? m[1].trim() : '';
    if (ip && ip !== '127.0.0.1') return ip;
  } catch {
    /* ignore */
  }
  return null;
}

async function findPostgres(preferredPort) {
  const hosts = ['127.0.0.1'];
  const win = wslWindowsHost();
  if (win) hosts.push(win);

  const ports = [...new Set([preferredPort, 5433, 5432, 5233].filter(Boolean))];

  for (const host of hosts) {
    for (const port of ports) {
      if (await tryPort(host, port)) {
        return { host, port };
      }
    }
  }
  return null;
}

module.exports = { findPostgres, tryPort, wslWindowsHost };
