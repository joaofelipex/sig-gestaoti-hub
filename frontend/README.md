# Frontend — SIG Gestão TI

SPA Angular 21.

| Documento | Conteúdo |
|-----------|----------|
| [../docs/uso-interno.md](../docs/uso-interno.md) | Uso pela equipa |
| [../docs/architecture.md](../docs/architecture.md) | Arquitetura |
| [../docs/dados-e-banco.md](../docs/dados-e-banco.md) | Postgres, API, arranque |

## Desenvolvimento

Com Postgres e API disponíveis:

```bash
npm run dev
```

Na raiz do monorepo, `npm run dev` sobe **API + Angular**.

- App: [http://localhost:8080](http://localhost:8080)
- Proxy: `/api` e `/health` → `http://127.0.0.1:3000` (`proxy.conf.json`)
- Demo (seed): **dev@local.imts** / **demo123456**

Tailwind v4 via PostCSS (`src/styles.css`). Se a UI aparecer sem estilos, corre `npm install` nesta pasta no mesmo ambiente do `ng serve`.

## Build

```bash
npm run build
# ou na raiz: npm run build
```

Saída em `dist/`.

## Testes

```bash
ng test
```
