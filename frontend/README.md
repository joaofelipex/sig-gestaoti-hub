# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.10.

Documentação de arquitetura do monorepo (stack, dados, segurança): [../docs/architecture.md](../docs/architecture.md).

## Development server

To start a local development server, run from this folder:

```bash
npm run dev
```

(same as `npm start` — `ng serve` on `http://0.0.0.0:8080` with `--poll` for WSL/Docker file watching.)

### Modo 100% local (Supabase CLI na máquina)

Com o stack `supabase start` a correr na raiz do monorepo (ver [../docs/local-stack.md](../docs/local-stack.md)):

```bash
npm run dev:local
```

Isto usa `environment.local.ts` (`http://127.0.0.1:54321` + chave anon local).

From the **repository root**, you can still use `npm run dev` (it `cd`s into `frontend` first).

Once the server is running, open your browser and navigate to `http://localhost:8080/`. The application will automatically reload whenever you modify any of the source files.

### Tailwind CSS v4

Global styles live in `src/styles.css`. Tailwind is wired through **PostCSS** (`.postcssrc.json` + devDependency `@tailwindcss/postcss`). If the UI looks like unstyled HTML, run `npm install` again inside `frontend/` in the **same environment you use for `ng serve`** (prefer running commands inside WSL, not against `\\wsl.localhost\…` from Windows, to avoid broken `node_modules`).

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
