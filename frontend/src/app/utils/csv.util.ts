export function exportToCSV(rows: any[], filename: string, columns?: { key: string; label: string }[]) {
  if (!rows.length) return;
  const cols = columns || Object.keys(rows[0]).map(k => ({ key: k, label: k }));
  const header = cols.map(c => `"${c.label}"`).join(',');
  const body = rows.map(r => cols.map(c => {
    const v = r[c.key];
    if (v === null || v === undefined) return '""';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  }).join(',')).join('\n');
  const blob = new Blob([`\ufeff${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function detectDelimiter(headerLine: string): ',' | ';' {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ';' : ',';
}

function parseCsvLine(line: string, delimiter: ',' | ';'): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; }
    } else if (ch === delimiter && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Normaliza nome de coluna CSV (sem acentos, minúsculas). */
export function normalizeCsvHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Lê valor de linha CSV ignorando acentos, maiúsculas e aliases de coluna. */
export function csvRowGet(row: Record<string, string>, ...aliases: string[]): string {
  const index = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    index.set(normalizeCsvHeader(key), value ?? '');
  }
  for (const alias of aliases) {
    const v = index.get(normalizeCsvHeader(alias));
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export function parseCsvNumber(raw: string | undefined | null): number {
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  if (/,\d{1,2}$/.test(s)) {
    return Number(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return Number(s.replace(',', '.')) || 0;
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line, delimiter);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsText(file);
  });
}
