# smart-step-mapper

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines SvelteKit, Self, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **SvelteKit** - Web framework for building Svelte apps
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Vite+** - Unified Vite toolchain, workspace task runner, linting, and formatting

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/web/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
bun run db:push
```

4. Seed the topics (required — the topic picker on the create-map page reads from this table):

```bash
bun run db:seed
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the fullstack application.

## Deployment

### Vercel Services

- Target: web + server
- Config: `vercel.json`
- Link the project first: bun run deploy:setup
- Local Vercel dev: bun run dev:vercel
- Sync preview env: bun run env:preview
- Sync production env: bun run env:production
- Dry-run check (no upload): bun run deploy:check
- Preview deploy: bun run deploy
- Production deploy: bun run deploy:prod
  Vercel Services share project environment variables, but deploys do not upload local `.env` files automatically. Link the project with `vercel link`, then run the env sync command before your first deploy (otherwise the deployment starts with no env vars), or pass one-off envs with `vercel deploy -e KEY=value`.
  Pass Vercel CLI flags to the env sync command directly, for example: `bun run env:production --scope your-team`.

For more details, see the guide on [Deploying to Vercel](https://www.better-t-stack.dev/docs/guides/vercel).

## Git Hooks and Formatting

- Optional native Vite+ hooks: `bun run hooks:setup`
- Docs: [Vite+ commit hooks](https://viteplus.dev/guide/commit-hooks)
- Run checks: `bun run check`

## Project Structure

```
smart-step-mapper/
├── apps/
│   └── web/         # Fullstack application (SvelteKit)
├── packages/
│   ├── api/         # API layer / business logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Vite+ format/lint checks and workspace TypeScript checks
- `bun run lint`: Run Vite+ lint checks
- `bun run format`: Run Vite+ formatting
- `bun run staged`: Run Vite+ checks against staged files
- `bun run hooks:setup`: Install Vite+ native Git hooks with `vp config`
- `bun run deploy:setup`: Link this repo to a Vercel project (first-time setup)
- `bun run dev:vercel`: Run the Vercel Services dev environment locally
- `bun run env:preview`: Sync local env files to the Vercel preview environment
- `bun run env:production`: Sync local env files to the Vercel production environment
- `bun run deploy`: Create a Vercel preview deployment
- `bun run deploy:prod`: Deploy to Vercel production
- `bun run deploy:check`: Dry-run a deploy to preview framework detection and included files without uploading
