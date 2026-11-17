# Préstec CRP

Aplicació del **Centre de Recursos Pedagògics** per gestionar el préstec de maletes pedagògiques i
maquinària als centres educatius.

- **Catàleg públic anònim**: consulta disponibilitat i envia sol·licituds sense registre.
- **Panell intern**: validació, inventari, correus i exportació, amb inici de sessió.

## Provar-ho en local

Requisits: **Node.js 20.19+** i **PHP 8.2+** (amb `pdo_sqlite`; el PHP de Hetzner ja el porta).

```bash
npm install
npm run local
```

`npm run local` fa tot això:

1. comprova que PHP hi sigui,
2. crea la base SQLite i les dades d'exemple (només el primer cop),
3. aixeca l'API a `:8080` i la web a `:3000`.

Després obre:

| | Adreça |
| --- | --- |
| Catàleg | <http://localhost:3000/> |
| Panell | <http://localhost:3000/admin.html> |
| Accés de prova | `crp@example.cat` / `prova-segura-2026` |

Ctrl+C atura els dos processos. Si vols arrencar-los per separat:

```bash
npm run dev:api     # només PHP
npm run dev:web     # només Vite
```

### Si alguna cosa falla

- **«No trobo PHP al PATH»**: instal·la PHP i torna a provar. A Windows pot ser
  `%LOCALAPPDATA%\Programs\php`; a macOS `brew install php`; a Debian/Ubuntu `sudo apt install php php-sqlite3`.
- **Port 3000 o 8080 ocupat**: tanca el procés anterior o canvia el port a `scripts/dev.mjs` i a
  `vite.config.ts`.
- **La base és a `server/var/crp.sqlite`**. Per començar de zero: esborra el fitxer i torna a fer
  `npm run local` (o `npm run setup -- --fresh`).

## Comandes

```bash
npm run local       # API + web per desenvolupar
npm run setup       # crea/actualitza la base i l'usuari del CRP
npm test            # proves unitàries (Vitest)
npm run test:e2e    # proves de navegador (Playwright) contra PHP real
npm run lint        # TypeScript
npm run build:public / build:private / deploy:prep
```

## Com està fet

- **Front**: React 19 + TypeScript + Vite + Tailwind 4. Dues pàgines (`index.html` i `admin.html`),
  amb bundles separats: el codi del panell no arriba mai al catàleg.
- **Backend**: PHP 8 amb PDO sobre **MySQL** (producció) o **SQLite** (local). Sense frameworks ni
  Composer.
- **Desplegament**: Hetzner Webhosting (Apache + PHP + MySQL). `npm run deploy:prep` genera la
  carpeta `deploy/` per pujar per FTP.

Més detall a [`AGENTS.md`](AGENTS.md) (convencions, proves i flux de Git) i
[`documentacion.md`](documentacion.md) (arquitectura i decisions).
