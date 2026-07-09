import type { Payment } from '../services/dashboard.service';
import { normalizeCsvHeader, parseCsvNumber } from './csv.util';

type PaymentCategoria = Payment['categoria'];
type PaymentStatus = Payment['status'];

function buildRowIndex(row: Record<string, string>): Map<string, string> {
  const index = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    index.set(normalizeCsvHeader(key), (value ?? '').trim());
  }
  return index;
}

function rowPick(index: Map<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const v = index.get(normalizeCsvHeader(alias));
    if (v !== undefined && v !== '') return v;
  }
  return '';
}

function normalizeCategoria(raw: string): PaymentCategoria {
  const s = raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const map: Record<string, PaymentCategoria> = {
    servidor: 'servidor',
    servidores: 'servidor',
    licenca: 'licenca',
    licencas: 'licenca',
    dominio: 'dominio',
    dominios: 'dominio',
    contrato: 'contrato',
    contratos: 'contrato',
    outro: 'outro',
    outros: 'outro',
  };
  return map[s] || 'outro';
}

function normalizeStatus(raw: string): PaymentStatus {
  const s = raw.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (['pago', 'paid', 'paga'].includes(s)) return 'pago';
  if (['atrasado', 'overdue', 'vencido', 'vencida'].includes(s)) return 'atrasado';
  return 'pendente';
}

function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s || s === '-') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const brDateTime = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+\d{2}:\d{2}:\d{2})?$/);
  if (brDateTime) return `${brDateTime[3]}-${brDateTime[2]}-${brDateTime[1]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return s;
}

function normalizeCompetencia(raw: string): string {
  const s = raw.trim();
  if (!s) return new Date().toISOString().slice(0, 7);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const brDateTime = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brDateTime) return `${brDateTime[3]}-${brDateTime[2]}`;
  const br = s.match(/^(\d{2})\/(\d{4})$/);
  if (br) return `${br[2]}-${br[1]}`;
  return s;
}

function resolveNome(nome: string, fornecedor: string, observacoes: string, descricao = ''): string {
  const candidates = [nome, fornecedor, descricao, observacoes];
  for (const c of candidates) {
    const t = c.trim();
    if (t && t !== '-') return t;
  }
  return '';
}

function isExtratoRow(index: Map<string, string>): boolean {
  return (
    rowPick(index, 'DATA/HORÁRIO', 'DATA/HORARIO', 'Data/Hora', 'data_hora') !== '' &&
    rowPick(index, 'DESCRIÇÃO', 'DESCRICAO', 'Descricao', 'descricao') !== ''
  );
}

function isPaymentExportRow(index: Map<string, string>): boolean {
  return (
    rowPick(index, 'Nome', 'nome') !== '' ||
    rowPick(index, 'Categoria', 'categoria') !== '' ||
    rowPick(index, 'Competencia', 'Competência', 'competencia') !== '' ||
    rowPick(index, 'Valor', 'Valor (R$)', 'valor') !== ''
  );
}

function shouldSkipExtrato(descricao: string, tipo: string): boolean {
  const d = descricao.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
  if (tipo.toUpperCase() === 'C') return true;
  if (d.includes('SALDO C/C')) return true;
  if (d.includes('EST COMPRA')) return true;
  if (d.includes('ESTORNO')) return true;
  if (d.includes('REC TRANSF')) return true;
  return false;
}

function mapExtratoRow(row: Record<string, string>): Record<string, unknown> | null {
  const index = buildRowIndex(row);
  const descricao = rowPick(index, 'DESCRIÇÃO', 'DESCRICAO', 'Descricao', 'descricao');
  const tipo = rowPick(index, 'Tipo de Entrada C/D', 'Tipo', 'tipo');
  if (shouldSkipExtrato(descricao, tipo)) return null;

  const dataHora = rowPick(index, 'DATA/HORÁRIO', 'DATA/HORARIO', 'Data/Hora', 'data_hora');
  const estabelecimento = rowPick(index, 'Estabelecimento', 'estabelecimento');
  const cartao = rowPick(index, 'Cartão', 'Cartao', 'cartao');
  const valorRaw = rowPick(index, 'Valor', 'valor');
  const valor = Math.abs(parseCsvNumber(valorRaw));
  if (!valor) return null;

  const data = normalizeDate(dataHora);
  const nome = resolveNome(estabelecimento, estabelecimento, descricao, descricao);
  if (!nome) return null;

  const obs = [descricao, cartao ? `Cartão: ${cartao}` : ''].filter(Boolean).join(' · ');

  return {
    nome,
    categoria: 'servidor',
    competencia: normalizeCompetencia(dataHora || data || ''),
    vencimento: data,
    data_pagamento: data,
    valor,
    status: 'pago' as PaymentStatus,
    fornecedor: estabelecimento && estabelecimento !== '-' ? estabelecimento : null,
    observacoes: obs || null,
  };
}

function mapPaymentExportRow(row: Record<string, string>): Record<string, unknown> | null {
  const index = buildRowIndex(row);
  const nome = rowPick(index, 'Nome', 'nome');
  const fornecedor = rowPick(index, 'Fornecedor', 'fornecedor');
  const observacoes = rowPick(index, 'Observacoes', 'Observações', 'observacoes');
  const resolvedNome = resolveNome(nome, fornecedor, observacoes);
  if (!resolvedNome) return null;

  const vencimento = normalizeDate(rowPick(index, 'Vencimento', 'vencimento'));
  const dataPagamento = normalizeDate(rowPick(index, 'Data Pagamento', 'DataPagamento', 'data_pagamento'));
  const competenciaRaw = rowPick(index, 'Competencia', 'Competência', 'competencia');
  const competencia = normalizeCompetencia(competenciaRaw || vencimento || dataPagamento || '');

  const out: Record<string, unknown> = {
    nome: resolvedNome,
    categoria: normalizeCategoria(rowPick(index, 'Categoria', 'categoria')),
    competencia,
    vencimento,
    data_pagamento: dataPagamento,
    valor: parseCsvNumber(rowPick(index, 'Valor', 'Valor (R$)', 'valor')),
    status: normalizeStatus(rowPick(index, 'Status', 'status') || 'pago'),
    fornecedor: fornecedor && fornecedor !== '-' ? fornecedor : null,
    observacoes: observacoes || null,
  };

  const id = rowPick(index, 'id');
  const empresaId = rowPick(index, 'empresa_id');
  const referenciaId = rowPick(index, 'referencia_id');
  if (id) out['id'] = id;
  if (empresaId) out['empresa_id'] = empresaId;
  if (referenciaId) out['referencia_id'] = referenciaId;

  return out;
}

/** Converte linhas CSV (exportação ou extrato) em payload de pagamentos. */
export function mapPaymentCsvRows(rows: Record<string, string>[]): Record<string, unknown>[] {
  if (!rows.length) return [];

  const sample = buildRowIndex(rows[0]);
  const mapper = isExtratoRow(sample)
    ? mapExtratoRow
    : isPaymentExportRow(sample)
      ? mapPaymentExportRow
      : mapPaymentExportRow;

  return rows.map((r) => mapper(r)).filter((r): r is Record<string, unknown> => !!r);
}

/** Colunas usadas na exportação (espelha o CSV organizado de gastos). */
export function paymentExportColumns(p: Payment) {
  return {
    Nome: p.nome,
    Categoria: p.categoria,
    Status: p.status,
    Competencia: p.competencia,
    Vencimento: p.vencimento,
    'Valor (R$)': p.valor,
    'Data Pagamento': p.data_pagamento,
    Fornecedor: p.fornecedor,
    Observacoes: p.observacoes,
  };
}
