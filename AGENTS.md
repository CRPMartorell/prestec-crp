# AGENTS.md

Guia de treball per a qualsevol agent (o persona) que toqui aquest repositori. Explica què fa
l'aplicació, com està organitzada, com es prova i com es gestiona el canvi amb Git.

---

## 1. Què és aquest projecte

Aplicació web del **Centre de Recursos Pedagògics (CRP)** per gestionar el préstec de **maletes
pedagògiques** i **maquinària/equipament** als centres educatius.

Dos requisits manen sobre la resta:

1. **Privadesa RGPD de dues capes.** El catàleg públic és anònim i sense registre: només mostra
   `Lliure`/`Ocupat`. Les dades personals (docent, centre, correu electrònic) només existeixen al
   panell intern.
2. **Dos models de préstec.** Els recursos pedagògics es presten per **6 torns tancats** del curs
   2026-2027; la maquinària, per **setmanes naturals** (dilluns–divendres).

### Estat actual: front React + backend PHP + MySQL

La interfície és la mateixa, però les dades ja no viuen al navegador: venen d'una **API PHP** sobre
**MySQL** (SQLite en desenvolupament). L'aplicació pública només llegeix el catàleg i envia
sol·licituds; el panell intern requereix **sessió** (taula `usuaris`, `password_hash`).

L'entorn objectiu és **Hetzner Webhosting S** (Apache + PHP + MySQL), desplegant per FTP. El
desenvolupament es fa en un compte personal i la producció viurà al compte del centre
(§19 de [`documentacion.md`](documentacion.md)).

---

## 2. Stack

| Peça | Versió | Notes |
| --- | --- | --- |
| React | 19 | Dues pàgines (`index.html`, `admin.html`), sense router |
| TypeScript | 7 | `tsc --noEmit` com a lint; **no** té `strict` activat |
| Vite | 8 | `@vitejs/plugin-react`, Tailwind v4 via `@tailwindcss/vite` |
| PHP | 8.2+ | API a `server/`, PDO; a Hetzner l'aporta el hosting |
| MySQL | 5.7/8 | Producció; SQLite en local per desenvolupar |
| Vitest | 5 | Entorn `jsdom`, pool `threads` |
| Playwright | 1.64 | Chromium headless; arrenca PHP i Vite |

## 3. Comandes

```bash
npm install              # dependències
npm run local            # tot: comprova PHP, prepara la BD i arrenca API + web
npm run dev              # el mateix que `local`
npm run dev:web          # només Vite (:3000)
npm run dev:api          # només PHP (:8080)
npm run setup            # crea/actualitza la base i l'usuari del CRP
npm run doctor           # diagnòstic: node, php, base de dades i ports
npm run crear-usuari -- <correu> <contrasenya> [nom]   # usuari del panell
npm run build            # build de les dues pàgines (dist/)
npm run build:public     # només catàleg -> dist/public/
npm run build:private    # només panell  -> dist/private/
npm run check:bundle     # comprova que dist/public no contingui el panell
npm run deploy:prep      # munta deploy/ per pujar per FTP a Hetzner
npm run preview          # previsualitza el build
npm run lint             # tsc --noEmit
npm test                 # Vitest (39 proves)
npm run test:watch       # Vitest en mode watch
npm run test:e2e     # Playwright (11 proves)
npm run verify       # lint + test + build:public + check:bundle
```

La primera vegada cal instal·lar el navegador d'E2E:

```bash
npm run test:e2e:install
```

### Números actuals

- **39 proves unitàries** en 6 fitxers (`src/**/*.test.tsx`), inclòs `AdminDashboard.test.tsx`.
- **11 proves E2E** en 3 fitxers (`e2e/*.spec.ts`) contra el backend PHP.

---

## 4. Entorn Windows d'aquest equip

L'equip no té permisos d'administrador. Tot està instal·lat **per usuari**:

- Node.js 26 + npm 11 → `%LOCALAPPDATA%\Programs\nodejs`
- Git 2.56 → `%LOCALAPPDATA%\Programs\Git` (inclou Git Bash)
- Navegador de Playwright → `%LOCALAPPDATA%\ms-playwright`

Particularitats que afecten les comandes:

1. **PowerShell bloqueja `npm.ps1`** (ExecutionPolicy `Restricted`). Usa `npm.cmd run …` o Git Bash.
2. **Vitest i el build necessiten `--configLoader native`** perquè Vite, en carregar la configuració,
   executa `net use` i falla amb `EPERM` en entorns confinats. Vitest ja el porta als scripts; per
   compilar a mà: `node node_modules/vite/bin/vite.js build --mode public --configLoader native`.
3. **El pool `threads` és obligatori** (els workers `forks` no arrenquen en aquest entorn).
4. **Comandes que fan `spawn`** (`npm install`, `playwright test`) fallen amb `EPERM` dins del
   sandbox de l'agent; s'han d'executar amb permisos complets. En un terminal normal funcionen sense
   res.
5. **`php -S` pot fallar amb `Cannot create mutex (error 5)`** dins d'alguns sandbox: aleshores no es
   poden executar els E2E ni provar l'aplicació en local des de dins de l'agent. El PHP de línia de
   comandes sí que funciona.
6. `npm run clean` usa `rm -rf`, que no existeix a `cmd`/PowerShell. No l'usis; esborra `dist/` a mà.

---

## 5. Arquitectura

El projecte és **una sola base de codi amb dues aplicacions i dos desplegaments**:

```
index.html ──► src/main.public.tsx ──► AppPublic ──► Header + PublicCatalog + Footer
admin.html ──► src/main.private.tsx ─► AppPrivate ─► PrivateHeader + AdminDashboard + Footer

Compartit per les dues:
  src/context/CrpContext.tsx .... estat i regles de negoci
  src/types/crp.ts .............. tipus del domini
  src/data/defaultData.ts ....... dades d'exemple
  src/components/Footer.tsx ..... peu comú
```

Regla dura: **`AppPublic` no pot importar res de `src/components/admin/` ni
`PrivateHeader`**. El bundle públic es comprova a `npm run check:bundle` i a la CI.

```
src/components/public/ ... capa pública (anònima)
  PublicCatalog.tsx ......... cerca, filtres, graella, estat buit
  MaterialCard.tsx .......... fitxa, contingut desplegable, tira de 6 torns
  ReservationModal.tsx ...... formulari de reserva + confirmació
src/components/admin/ ...... capa privada (CRP)
  AdminDashboard.tsx ........ 5 pestanyes: reserves, inventari, torns,
                              automatitzacions, estructura Sheets
```

L'inventari del panell és un **CRUD complet** de materials: alta, edició i baixa, amb codi automàtic
(`MAT-007`, `MAQ-005`), bloqueig de codis duplicats, estat **Esborrany** per a allò que encara no es
vol publicar, pujada d'imatge (JPG/PNG/WebP, màxim 3 MB) i confirmació visible en desar. Només són
obligatoris el codi, el tipus, el nom, l'àmbit i la foto.

Fitxers de suport:

- `src/types/crp.ts` — tipus del domini (espejo de les columnes de Sheets).
- `src/data/defaultData.ts` — 6 torns, 10 materials, 5 reserves d'exemple.
- `src/data/contacte.ts` — bústia oficial del CRP (`crp-martorell@xtec.cat`).
- `src/test/` — setup de Vitest i helper `renderWithCrp`.
- `e2e/` — proves Playwright.
- `vitest.config.ts`, `playwright.config.ts` — configuració de les suites.
- `server/public/uploads/` — imatges pujades (no es versionen; `.htaccess` impedeix executar codi).

### Estat i accions (`CrpContext`)

`materials`, `torns`, `reserves`, `notificacions`, `carregant`, `error`, `autenticat` i
`crearReserva`, `validarReserva`, `desarMaterial`, `eliminarMaterial`, `pujarImatge`,
`executarRecordatoris`, `exportarCsv`, `login`, `logout`, `recarregar`,
`getDisponibilitatMaterialTorn`.

Totes les accions són **asíncrones** i passen per un `CrpRepository`:
`LocalRepository` (tests, dades a memòria), `HttpRepository` (producció, `/api/...`).
La persistència real és al servidor: `server/` amb PDO (MySQL o SQLite).

---

## 6. Model de dades i regles de negoci

| Tipus | Camps | Equivalent a Sheets |
| --- | --- | --- |
| `Material` | `id`, `nom`, `tipus`, `ambit`, `urlImatge`, `descripcio`, `contingutMaleta`, `urlGuiaDrive`, `modelPrestec`, `estatGeneral`, `mostraContingut?`, `mostraGuia?` | Pestanya `Materials` (A–J) |
| `TornPedagogic` | `id` T-01…T-06, `nom`, `dataInici`, `dataFinal`, ISO | Pestanya `Torns_Pedagogics` |
| `Reserva` | `idReserva`, `idMaterial`, `tipus`, `tornAssignat` o dates de setmana, dades personals, `estatReserva`, `dataHoraRecollida`, `dataRetornPrevista` | Pestanya `Disponibilitat_i_Reserves` (A–N) |
| `NotificacioEmail` | `id`, `dataHora`, `tipus`, `destinatari`, `copia?`, `assumpte`, `cos`, `idReserva` | Registre de correus (simulació de `MailApp`) |

Regles que cal respectar en qualsevol canvi:

- **Un material només pot tenir una reserva activa per torn.** `getDisponibilitatMaterialTorn`
  considera ocupats els estats `Concedida` **i** `Pendent de Validació` (les `Denegada` i
  `Finalitzada` alliberen el torn).
- **Estats de reserva**: `Pendent de Validació` → `Concedida` \| `Denegada`; `Concedida` →
  `Finalitzada`.
- **Estats de material**: `Actiu`, `En Manteniment`, `Baixa` i `Esborrany`. Els esborranys **no
  surten mai** al catàleg públic: només existeixen al panell.
- **Correus**: en crear una reserva s'envia un `avis_crp` a `crp-martorell@xtec.cat` **amb còpia al
  docent**; en concedir, un `aprovacio_usuari` amb la data de recollida; en denegar, un
  `denegacio_usuari`; el trigger diari afegeix `recordatori_retorn` quan falten ≤ 2 dies per al
  retorn. En desenvolupament s'escriuen a `server/var/correus.log`.
- **Imatges**: només JPG, PNG o WebP i **màxim 3 MB**; es desen a `uploads/` amb nom aleatori i es
  guarden a `urlImatge` com a ruta relativa (`/uploads/mat-xxxx.png`). Mida recomanada 1200 × 800 px
  (3:2).
- **Dates**: `dataInici`/`dataFinal` en `DD/MM/YYYY` per a la UI; `dataIniciISO`/`dataFinalISO` i
  les dates de setmana en `YYYY-MM-DD` per a la lògica.
- **El catàleg públic no pot mostrar mai** noms, centres ni correus.

---

## 7. Convencions de codi

- UI i textos de domini **en català**; noms de variables i tipus també en català (`reserves`,
  `torns`, `estatReserva`). No barregis anglès nou si no és una API externa.
- Components funcionals amb `React.FC`, sense classes. Estil amb utilitats de Tailwind; no afegir
  CSS global nou llevat del que ja hi ha a `src/index.css`.
- La lògica de negoci va al context o en funcions pures, **mai** dins del JSX d'un component.
- Tipus explícits a les fronteres (props, retorns d'accions); evita `any` (ja n'hi ha uns quants
  en els `onChange` dels `<select>`; no n'afegeixis de nous).
- Accessibilitat: usa `<button>`/`<label>` reals; les proves E2E hi depenen.

---

## 8. Estratègia de proves

### Unitàries (Vitest + Testing Library)

Cobreixen la lògica del context i el comportament dels components públics:

- `src/context/CrpContext.test.tsx` — dades per defecte, creació de reserva, disponibilitat,
  validació/denegació amb correu, trigger de recordatori (amb `vi.useFakeTimers()`), exportació CSV
  i restabliment.
- `src/components/public/PublicCatalog.test.tsx` — cerca, filtre per tipus, estat buit.
- `src/components/public/MaterialCard.test.tsx` — tira de torns, contingut desplegable, bloqueig.
- `src/components/public/ReservationModal.test.tsx` — validació i creació amb codi.
- `src/components/admin/AdminDashboard.test.tsx` — alta de material, pujada d'imatge (amb
  `URL.createObjectURL` simulat), confirmació en desar i camps obligatoris.

Per escriure'n de nous:

```tsx
import { renderWithCrp } from '../test/utils';

const { crp } = renderWithCrp(<ElMeuComponent />);
expect(crp.reserves).toHaveLength(5);
```

`renderWithCrp` retorna una vista **sempre actualitzada** de l'API del context (és un `Proxy`):
pots desestructurar `crp` sense por que quedi desactualitzat. El `localStorage` es neteja després de
cada test des de `src/test/setup.ts`.

Trucs: per a dates, `vi.useFakeTimers()` + `vi.setSystemTime(...)`; per a descàrregues, fes mock de
`URL.createObjectURL` i de `HTMLAnchorElement.prototype.click`.

### E2E (Playwright)

- `e2e/public-catalog.spec.ts` — catàleg anònim, cerca, filtres, estat buit.
- `e2e/reservation-flow.spec.ts` — flux docent → CRP (reserva, aprovació, correu) i validacions.
- `e2e/admin-dashboard.spec.ts` — dades privades, denegació, inventari, CSV, trigger manual.

Convencions per no trencar-les:

- Selectors per **rol i nom accessible**, no per CSS. Si hi ha dos elements amb el mateix nom
  (p. ex. el botó de capçalera i l'enllaç del peu), acota: `getByRole('banner')…`.
- Els modals tenen títols `h2`; les targetes del catàleg, `h3`. Usa `level` quan calgui.
- Cada test reinicia la base via `POST /api/test/reset` (només amb `CRP_TEST_RESET=1`).
- `playwright.config.ts` arrenca **PHP** i **Vite**; no cal fer-ho a mà.

---

## 9. Flux de Git

Repositori **trunk-based**: es treballa sobre `main` amb commits petits i atòmics.

- Missatges en **Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`),
  en català i en imperatiu («afegeix», «corregeix»).
- Un commit = un canvi coherent; si toca codi i proves, **el mateix commit**.
- Abans de commitejar: `npm run lint && npm test` (i `npm run test:e2e` si has tocat fluxos).
- No deixis `node_modules/`, `dist/`, `test-results/` ni `.env*` al commit (ja són a `.gitignore`).
- No reescriguis l'historial publicat ni facis `push --force` sense demanar-ho.
- Branques: només per a experiments llargs (`feat/nom-curt`); la resta, a `main`.

---

## 10. Limitacions conegudes i deute tècnic

1. **Desplegament pendent**: el backend funciona en local (SQLite), però encara no s'ha publicat a
   Hetzner ni s'ha provat contra MySQL real.
2. **Correu**: `mail()` del hosting no està verificat; en desenvolupament s'escriu a `var/correus.log`.
3. **Sessions**: el panell depèn de la sessió de PHP; no hi ha "recorda'm" ni caducitat explícita.
4. **Dependències no usades** (`@google/genai`, `express`, `dotenv`, `motion`, `tsx`, `esbuild`
   directe): restes de la plantilla d'AI Studio.
5. `tsconfig.json` no té `strict`. Activar-lo implicarà correccions.
6. Els modals no atrapen el focus ni es tanquen amb `Escape`.
7. **Imatges en desplegament**: `uploads/` ha de tenir permisos d'escriptura (`775`) al hosting; si
   no, la pujada falla amb un error visible al formulari.
8. **Esborrar una imatge** del disc no s'esborra en desar un altre fitxer: les imatges òrfenes s'han
   de netejar a mà (no hi ha purga automàtica).

## 11. Full de ruta suggerit

1. Publicar a Hetzner (MySQL real, FTP) i provar `mail()`.
2. Proves d'integració del backend PHP (contracte de l'API).
3. Exportació real a `.xlsx` multi-pestanya.
4. Activar `strict` i netejar dependències.

## 12. Documentació relacionada

- [`documentacion.md`](documentacion.md) — arquitectura del projecte: estat implementat
  (React + PHP + MySQL: API, model de dades, correu, imatges, RGPD) i, a continuació, el disseny
  original amb Google Apps Script + Sheets + MailApp conservat com a alternativa.
- [`desplegament.md`](desplegament.md) — guia de publicació a Hetzner per FTP (MySQL, `config.php`,
  permisos, `uploads/`, correu).
