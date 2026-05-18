#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, '../frontend/src/app/pages');

const PAGE_META = {
  domains: { title: 'Domínios & DNS', sub: 'Registros, SSL e renovações de domínios.' },
  licenses: { title: 'Licenças (SAM)', sub: 'Software, assentos e conformidade de licenciamento.' },
  servers: { title: 'Servidores', sub: 'Infraestrutura, ambientes e capacidade.' },
  maintenance: { title: 'Manutenção', sub: 'Ordens de serviço e histórico de manutenção.' },
  movements: { title: 'Movimentações', sub: 'Entradas, saídas e transferências de ativos.' },
  inventory: { title: 'Estoque', sub: 'Itens em estoque e reposição.' },
  payments: { title: 'Pagamentos', sub: 'Despesas recorrentes e faturas de TI.' },
};

function headerBlock(meta) {
  return `<section class="sig-page">
      <header class="app-page-header">
        <div>
          <h1 class="app-page-title">${meta.title}</h1>
          <p class="app-page-sub">${meta.sub}</p>
        </div>
      </header>`;
}

function polish(filePath, meta) {
  let s = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(path.dirname(filePath));

  if (s.includes('class="sig-page"') && s.includes('app-page-title')) {
    console.log(`skip ${name}`);
    return;
  }

  s = s.replace(
    /<div class="p-6">\s*\n\s*<h1 class="text-2xl font-bold mb-4">[^<]+<\/h1>\s*\n/,
    `${headerBlock(meta)}\n`
  );

  s = s.replace(
    'class="text-center py-8 text-gray-500">Carregando...',
    'class="sig-page-loading">Carregando…'
  );
  s = s.replace(
    'class="bg-white rounded-lg shadow overflow-hidden"',
    'class="sig-list-card"><div class="sig-table-wrap"'
  );
  s = s.replace('class="min-w-full divide-y divide-gray-200"', 'class="sig-table"');
  s = s.replace(/<thead class="bg-gray-50">/g, '<thead>');
  s = s.replace(/<tbody class="bg-white divide-y divide-gray-200">/g, '<tbody>');
  s = s.replace(/ class="hover:bg-gray-50"/g, '');
  s = s.replace(
    'class="text-blue-600 hover:underline mr-3"',
    'class="sig-link-action me-3"'
  );
  s = s.replace('class="text-blue-600 hover:underline"', 'class="sig-link-action"');
  s = s.replace('class="text-red-600 hover:underline"', 'class="sig-link-action sig-link-action--danger"');
  s = s.replace(
    'class="text-center py-8 text-sm text-gray-400"',
    'class="sig-table-empty"'
  );

  if (s.includes('sig-table-wrap')) {
    s = s.replace(
      /(<table class="sig-table">[\s\S]*?<\/table>)\n(\s*)<\/div>/,
      '$1\n$2</WRAPTBL>\n$2</div>'
    );
    s = s.replace('</WRAPTBL>', '</div>');
  }

  const modalIdx = s.search(/\n\s*<app-modal/);
  if (modalIdx > 0 && !s.slice(0, modalIdx).includes('</section>')) {
    s = s.replace(/\n(\s*)<\/div>\s*\n(\s*)<app-modal/, '\n$1</section>\n$2<app-modal');
  }

  fs.writeFileSync(filePath, s);
  console.log(`polished ${name}`);
}

for (const [folder, meta] of Object.entries(PAGE_META)) {
  const fp = path.join(pagesDir, folder, `${folder}.component.ts`);
  if (fs.existsSync(fp)) polish(fp, meta);
}
