# Frontend

Angular 21 SPA do SIG Heartbeat Hub. Documentação do monorepo (stack, dados, segurança): [../docs/architecture.md](../docs/architecture.md). Guia operacional completo: [../docs/dados-e-banco.md](../docs/dados-e-banco.md).

## Development server

Com Postgres e API a correr (ver guia de dados), inicia só o Angular nesta pasta:

```bash
npm run dev
```

(`npm start` é equivalente — `ng serve` em `http://0.0.0.0:8080` com `--poll` para WSL/Docker.)

Na **raiz do repositório**, `npm run dev` sobe API + Angular em paralelo.

A app usa `proxy.conf.json`: pedidos `/api` e `/health` são encaminhados a `http://127.0.0.1:3000`. Abre [http://localhost:8080](http://localhost:8080).

Conta demo (após seed): **dev@local.imts** / **demo123456**.

### Tailwind CSS v4

Estilos globais em `src/styles.css`. Tailwind via PostCSS (`.postcssrc.json` + `@tailwindcss/postcss`). Se a UI parecer HTML sem estilo, executa `npm install` nesta pasta no **mesmo ambiente** que usas para `ng serve` (preferir WSL em vez de `\\wsl.localhost\…` no Windows).

## Code scaffolding

```bash
ng generate component component-name
ng generate --help
```

## Building

```bash
ng build
```

Artefactos em `dist/`.

## Unit tests

```bash
ng test
```

(Vitest via `@angular/build:unit-test`.)

## Additional Resources

[Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
