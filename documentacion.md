# Arquitectura: Préstec CRP sobre Google Apps Script

> Document de disseny. Explica com executar l'aplicació amb **Google Apps Script + Google Sheets +
> MailApp** **sense renunciar a la interfície React actual**, dividint el producte en una
> **aplicació pública** (catàleg anònim) i una **aplicació privada** (gestió interna del CRP).
>
> Estat: **part pública desplegada i separada del panell**; el backend d'Apps Script encara no
> existeix. Última revisió: novembre de 2026.

---

## Estat del projecte (novembre 2026)

| Peça | Estat | Detall |
| --- | --- | --- |
| Catàleg públic (UI) | ✅ Fet | `index.html` → `AppPublic`, desplegat a `crpmartorell.github.io/prestec-crp/` |
| Separació públic / privat | ✅ Fet | `admin.html` → `AppPrivate`; `build:public` / `build:private`; `check:bundle` |
| Publicació automàtica | ✅ Fet | GitHub Actions: lint + 22 tests + build públic + guardia + deploy |
| Panell intern (UI) | ✅ Fet (codi) | `AdminDashboard`, encara recolzat en `localStorage` |
| Desplegament del panell | ⏳ Pendent | HtmlService amb `access: DOMAIN` (necessita el backend) |
| Backend del catàleg | ⏳ Pendent | `Code.gs` públic: `doGet`, projecció de camps, JSONP |
| Backend de gestió | ⏳ Pendent | CRUD, `LockService`, IDs, auditoria |
| Correus i recordatoris | ⏳ Pendent | `MailApp` + trigger diari |
| Estat compartit | ⏳ Pendent | `CrpRepository` + context asíncron (vegeu §18) |
| Proves | ✅ 22 unitàries + 11 E2E | `npm run verify` |

> «Pendent» vol dir **codi per escriure**, no servei per contractar: Apps Script, Sheets i Gmail ja
> existeixen al Workspace del centre. Les fases concretes són a §12.

---

## 1. Objectiu i abast

### El que es vol

1. Mantenir la UI React/Tailwind existent (components, estils, comportament).
2. Tenir dades compartides de veritat (ara viuen al `localStorage` de cada navegador).
3. Enviar correus reals i recordatoris automàtics.
4. Respectar el model RGPD de dues capes: catàleg anònim i panell restringit.
5. Cost d'infraestructura zero o gairebé zero, aprofitant el Workspace del centre.

### El que **no** es fa

- No es reescriu la UI ni es pasa a HtmlService la part pública.
- No es desplega res dins de `script.google.com` per al catàleg (una web app és lenta i no té
  domini propi).
- No es toca el model de dades: les 4 pestanyes de Sheets ja estan definides a l'especificació.

### Restricció que ho condiciona tot

Apps Script **no és un hosting**: és un punt d'entrada que executa codi i retorna HTML o dades.
A més, les respostes d'una web app surten de `script.googleusercontent.com` **sense capçaleres
CORS**, de manera que `fetch` des d'un domini extern no pot llegir el cos. Això decideix el disseny
de la comunicació (vegeu §6).

---

## 2. Decisió principal: dues aplicacions, dos desplegaments

| | Aplicació pública | Aplicació privada |
| --- | --- | --- |
| **Qui l'usa** | Qualsevol docent o centre, sense compte | Personal del CRP |
| **Què fa** | Consultar catàleg i disponibilitat; enviar sol·licitud | Validar, denegar, inventari, correus, exportar |
| **On s'allotja** | GitHub Pages (fet) | Apps Script (HtmlService), pendent |
| **Com parla amb les dades** | API de només lectura via **JSONP** | `google.script.run` (natiu, mateix origen) |
| **Autenticació** | Cap (anònima per disseny) | La del desplegament: `DOMAIN` |
| **Codi que s'envia al navegador** | Només catàleg i formulari | Només panell intern |

Per què no una sola aplicació:

- El **mode d'accés d'una web app és per desplegament**, no per ruta. Un desplegament "qualsevol
  persona" fa que `Session.getActiveUser()` torni buit i el panell quedaria obert; un desplegament
  "només domini" obligaria a identificar-se per veure el catàleg, trencant l'anonimat.
- **Superfície d'atac**: si el codi del panell viatja al navegador del catàleg, qualsevol pot
  invocar les funcions del servidor amb `google.script.run`. Separant projectes, el codi públic no
  conté cap funció d'escriptura.
- **Rendiment**: el catàleg és estàtic i cachejable; el panell necessita dades fresques.

---

## 3. Vista general

```
                        ┌──────────────────────────────────────┐
   Docent / centre ───▶ │  APP PÚBLICA (React, hosting estàtic) │
   (anònim)             │  catàleg · filtres · formulari        │
                        └───────────────┬──────────────────────┘
                                        │  JSONP (GET, només lectura)
                                        ▼
                        ┌──────────────────────────────────────┐
                        │  SCRIPT PÚBLIC  ·  access: ANYONE     │
                        │  doGet → catàleg + disponibilitat     │
                        │  doGet → crearSollicitud (append)     │
                        └───────────────┬──────────────────────┘
                                        │  SpreadsheetApp (per ID)
                                        ▼
   Personal CRP ──────▶ ┌──────────────────────────────┐      ┌──────────────────┐
   (compte @domini)     │  APP PRIVADA (HtmlService)   │─────▶│  GOOGLE SHEETS    │
                        │  panell de gestió            │      │  Materials        │
                        │  google.script.run           │      │  Torns            │
                        └──────────────┬───────────────┘      │  Reserves (PII)   │
                                       │                      │  Notificacions    │
                        ┌──────────────▼───────────────┐      │  Registre         │
                        │  SCRIPT PRIVAT · DOMAIN      │─────▶└──────────────────┘
                        │  CRUD + LockService          │
                        │  MailApp + triggers diaris   │─────▶  Gmail del CRP
                        └──────────────────────────────┘
```

Tres peces, cadascuna amb una responsabilitat:

1. **Front públic** — estàtic, ràpid, sense secret. Només llegeix i envia sol·licituds.
2. **Script públic** — només lectura + alta de sol·licitud. Desplegat com "qualsevol persona",
   executat com el compte del CRP.
3. **Script privat** — totes les escriptures, els correus i els triggers. Desplegat només per al
   domini del centre.

Els dos scripts són **projectes independents** que obren **el mateix full de càlcul per ID**. El full
no es comparteix amb ningú: només l'amo (compte del CRP) hi té accés.

---

## 4. Model de dades (Sheets)

Es mantenen les pestanyes de l'especificació i se n'afegeixen dues de necessàries per a producció.

| Pestanya | Contingut | Qui hi accedeix |
| --- | --- | --- |
| `Materials` | Catàleg (A–J) | Els dos scripts |
| `Torns_Pedagogics` | 6 torns oficials | Els dos scripts |
| `Disponibilitat_i_Reserves` | Reserves + dades personals (A–N) | Els dos scripts (el públic només llegeix i projecta) |
| `Notificacions` | Log de correus enviats | Script privat |
| `Registre` *(nova)* | Auditoria: data, usuari, acció, ID reserva | Script privat |
| `Config` *(nova)* | Comptador d'IDs, paràmetres, mode manteniment | Script privat |

Regles:

- La fila 1 és la capçalera; les dades comencen a la fila 2.
- Les dates s'emmagatzemen com a text ISO (`YYYY-MM-DD`) per evitar els problemes de zona horària
  dels objectes `Date` de Sheets.
- `Config!B1` guarda el darrer número de reserva; l'increment es fa **dins del pany** (§7).
- Cap fórmula a les pestanyes de dades: tota la lògica és al codi (evita recalculacions massives).

---

## 5. Contracte de dades

Els tipus TypeScript actuals (`Material`, `TornPedagogic`, `Reserva`, `NotificacioEmail`) es
mantenen. El que canvia és **què viatja cap al navegador**.

### 5.1. Projectió pública (mai surt del servidor)

```ts
// El que rep l'app pública. Cap dada personal.
interface MaterialPublic {
  id: string;
  nom: string;
  tipus: 'Recurs Pedagògic' | 'Maquinària i Equipament';
  ambit: string;
  urlImatge: string;
  descripcio: string;
  contingutMaleta: string;
  urlGuiaDrive: string;
  modelPrestec: 'Torns' | 'Setmanes';
  estatGeneral: 'Actiu' | 'En Manteniment' | 'Baixa';
}

interface CatalegPublic {
  materials: MaterialPublic[];
  torns: TornPedagogic[];
  // Per material: quin torn està ocupat (sense dir per qui)
  ocupacio: Record<string, string[]>;          // { 'MAT-001': ['T-01','T-02'] }
  setmanesOcupades: Record<string, string[]>;  // { 'MAQ-001': ['2026-10-05/2026-10-09'] }
}
```

La projecció es fa **al servidor amb una llista blanca de camps**. No s'envia mai l'objecte `Reserva`
sencer ni cap fila crua del full.

### 5.2. Operacions privades

Es mantenen les mateixes accions que avui exposa `CrpContext`:

| Acció | Entrada | Sortida |
| --- | --- | --- |
| `carregarPanell` | — | materials, torns, reserves, notificacions |
| `crearReserva` | dades del formulari | `Reserva` creada |
| `validarReserva` | `idReserva`, estat, data de recollida | `void` |
| `desarMaterial` / `eliminarMaterial` | `Material` / `id` | `void` |
| `executarRecordatoris` | — | `{ processades, enviades }` |
| `exportarReserves` | — | URL de descàrrega (fitxer a Drive) |

---

## 6. Comunicació: per què JSONP i `google.script.run`

### App pública → script públic (JSONP)

`fetch` no pot llegir la resposta per CORS. Com que l'API pública és **de només lectura i GET**, la
solució neta i sense infraestructura és **JSONP**: el navegador carrega un `<script>` i el servidor
embolcalla el JSON en una crida.

```javascript
// Code.gs (script públic)
function doGet(e) {
  const accio = (e.parameter.action || '').trim();
  const cb = e.parameter.callback || '';
  let resposta;

  try {
    resposta = { ok: true, data: dispatch(accio, e.parameter) };
  } catch (err) {
    resposta = { ok: false, error: String(err && err.message || err) };
  }

  const json = JSON.stringify(resposta);
  if (cb) {
    // Només noms de funció vàlids: evita injectar codi arbitrari
    if (!/^[A-Za-z_$][\w$]{0,60}$/.test(cb)) {
      return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(cb + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
```

```ts
// src/data/jsonp.ts
export function jsonp<T>(baseUrl: string, params: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const nom = `__crp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const neteja = () => {
      delete (window as unknown as Record<string, unknown>)[nom];
      script.remove();
    };
    (window as unknown as Record<string, unknown>)[nom] = (resposta: { ok: boolean; data?: T; error?: string }) => {
      neteja();
      if (!resposta.ok) reject(new Error(resposta.error || 'Error del servidor'));
      else resolve(resposta.data as T);
    };
    script.onerror = () => { neteja(); reject(new Error('No s\'ha pogut contactar amb el CRP')); };
    script.src = `${baseUrl}?${new URLSearchParams({ ...params, callback: nom })}`;
    document.head.appendChild(script);
  });
}
```

Limitacions acceptades: només GET, sense capçaleres, resposta visible a la xarxa (per tant, **mai**
dades personals en aquest canal) i cal netejar els callbacks.

### App privada → script privat (`google.script.run`)

Dins d'una pàgina d'HtmlService no cal cap pont: `google.script.run` ja és al mateix origen,
autenticat i amb permisos. Es prometitza:

```javascript
// Codi del client (dins de la pàgina HtmlService)
function cridar(nom, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(e => reject(new Error(e.message || String(e))))
      [nom](...args);
  });
}
```

---

## 7. Integritat i concurrència

Sheets no té transaccions. Dues persones podrien reservar el mateix torn alhora, així que tota
escriptura passa per un pany:

```javascript
function ambPany(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('El servei està ocupat. Torna-ho a provar.');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function crearReserva(dades) {
  return ambPany(function () {
    const files = llegirReserves();
    const ocupat = files.some(f =>
      f.idMaterial === dades.idMaterial &&
      f.tornAssignat === dades.tornAssignat &&
      (f.estatReserva === 'Concedida' || f.estatReserva === 'Pendent de Validació')
    );
    if (ocupat) throw new Error('Aquest torn acaba d\'ocupar-se. Tria\'n un altre.');

    const id = seguentIdReserva();      // llegeix i incrementa Config!B1
    afegirFila('Disponibilitat_i_Reserves', ...);
    registrarAuditoria('crearReserva', id, dades.correu);
    enviarCorreuCRP(id, dades);
    return reserva;
  });
}
```

Conseqüències per a la UI:

- L'acció pot trigar 200–800 ms → **estats de càrrega** i botons desactivats mentre s'envia.
- L'error «aquest torn s'ha ocupat» és **normal**, no un cas excepcional: el formulari ha de tornar a
  pintar la disponibilitat i demanar un altre torn.
- El catàleg públic es pot cachejar 30–60 s amb `CacheService` per no llegir el full a cada visita.

---

## 8. Correu i automatitzacions

Es mantenen les tres automatitzacions de l'especificació, ara amb `MailApp` real.

| Funció | Disparador | Què fa |
| --- | --- | --- |
| `enviarAvisCRP(idReserva)` | dins de `crearReserva` | Correu a la bústia del CRP amb les dades de la sol·licitud |
| `enviarConfirmacio(idReserva)` | dins de `validarReserva` (Concedida) | Correu al docent amb data i hora de recollida |
| `enviarDenegacio(idReserva)` | dins de `validarReserva` (Denegada) | Correu amb el motiu i alternatives |
| `recordatorisDiaris()` | trigger diari a les 08:00 | Avis 2 dies abans del retorn |

Detalls:

- **Totes les trameses s'escriuen a `Notificacions`** (data, destinatari, assumpte, estat) per tenir
  traçabilitat i poder reintentar.
- Les plantilles viuen en un únic mòdul (`Correus.gs`) per no duplicar textos entre funcions.
- El trigger es crea una sola vegada amb
  `ScriptApp.newTrigger('recordatorisDiaris').timeBased().atHour(8).everyDays(1)`.
- **Quotes**: ~100 destinataris/dia en compte personal i ~1.500/dia amb Workspace for Education. El
  volum del CRP (desenes al mes) no hi arriba ni de bon tros, però convé capturar l'excepció i
  deixar la notificació en estat `pendent` per reintentar.
- El botó «Executar trigger manualment» del panell es manté: crida la mateixa funció sense esperar el
  trigger.

---

## 9. Seguretat i RGPD

1. **Minimització**: l'API pública només retorna la projecció de §5.1. Les proves E2E ho verifiquen.
2. **Control d'accés real**: el script privat es desplega amb `access: DOMAIN` i
   `executeAs: USER_ACCESSING`; el full no es comparteix amb ningú.
3. **Auditoria**: cada escriptura i cada consulta del panell deixa rastre a `Registre` amb
   `Session.getActiveUser().getEmail()`.
4. **Retenció**: les reserves finalitzades es poden arxivar a una pestanya `Historic` i esborrar les
   dades personals passat el curs, d'acord amb el que decideixi el centre.
5. **URLs**: els identificadors de reserva poden anar a la query string del JSONP, però **mai** noms,
   correus ni telèfons (quedarien als logs del servidor i del proxy).
6. **Text de consentiment** al formulari, amb enllaç a la política de privacitat del centre.

---

## 10. Canvis al front (sense tocar la UI)

La UI es queda igual. L'única cosa que canvia és **d'on surten les dades**.

### 10.1. Patró repositori

```ts
// src/data/CrpRepository.ts
export interface CrpRepository {
  carregarCataleg(): Promise<CatalegPublic>;
  crearReserva(dades: NovaReserva): Promise<Reserva>;
  carregarPanell(): Promise<Panell>;
  validarReserva(id: string, estat: EstatReserva, recollida?: string): Promise<void>;
  desarMaterial(m: Material): Promise<void>;
  eliminarMaterial(id: string): Promise<void>;
  executarRecordatoris(): Promise<{ processades: number; enviades: number }>;
}
```

Tres implementacions:

| Implementació | Ús | Com |
| --- | --- | --- |
| `LocalRepository` | Desenvolupament i tests | L'actual `localStorage` + `defaultData` |
| `PublicRepository` | App pública | `jsonp()` contra el script públic |
| `PrivateRepository` | App privada | `google.script.run` |

`CrpContext` passa a rebre el repositori per prop (`<CrpProvider repository={repo}>`) i a gestionar
`loading`, `error` i accions asíncrones. Els components no canvien: segueixen consumint `useCrp()`.

### 10.2. Dues entrades de Vite (implementat)

```
index.html  → src/main.public.tsx  → AppPublic   (Header + PublicCatalog + Footer)
admin.html  → src/main.private.tsx → AppPrivate  (PrivateHeader + AdminDashboard + Footer)
```

Cada pàgina té el seu punt d'entrada i el seu HTML; `vite.config.ts` tria les entrades segons el
mode:

```ts
const input =
  app === 'public' ? { main: 'index.html' }
  : app === 'private' ? { admin: 'admin.html' }
  : { main: 'index.html', admin: 'admin.html' };

build: { outDir: `dist/${app}`, rollupOptions: { input } }
```

Scripts: `npm run build:public` → `dist/public/`, `npm run build:private` → `dist/private/`.
Com que cada entrada importa només els seus components, **el bundle públic no conté el codi del
panell** ni a l'inrevés. `npm run check:bundle` ho verifica sobre el bundle generat i la CI el
executa abans de publicar.

### 10.3. On s'executa cada build

- **Públic** → GitHub Pages (fet), desplegat per CI en cada push a `main`.
- **Privat** → es puja com a `Index.html` + `App.html` + `Styles.html` dins del projecte d'Apps
  Script, amb `vite-plugin-singlefile` perquè no hi hagi rutes `/assets/*` que HtmlService
  no sap servir (pendent).

> Dins d'HtmlService no hi ha `localStorage` ni descàrregues via Blob. Per això el panell no
> persisteix res en local (tot ve del servidor) i l'exportació CSV es genera **al servidor**, es desa a
> Drive i es retorna un enllaç de descàrrega.

---

## 11. Desplegament

### Script públic (`apps-script/cataleg/`)

```json
{
  "timeZone": "Europe/Madrid",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

S'executa amb el compte del CRP (que és qui pot llegir el full) però el pot invocar qualsevol. Com
que el codi només llegeix i afegeix sol·licituds, l'exposició és limitada; tot i així cal validar i
limitar les entrades (mida dels camps, tipus, intents per minut amb `CacheService`).

### Script privat (`apps-script/gestio/`)

```json
{
  "timeZone": "Europe/Madrid",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "DOMAIN"
  }
}
```

Qualsevol membre del domini del centre pot obrir-lo; `Session.getActiveUser().getEmail()` identifica
qui fa cada canvi.

### Ordre de desplegament

1. Full de càlcul creat i compartit només amb el compte del CRP.
2. Script privat desplegat i provat amb dades reals.
3. Script públic desplegat; proves de càrrega llegint el catàleg.
4. Front públic publicat apuntant a la URL del script públic.
5. Panell intern: pujar el build privat i desplegar.

### On es publica cada build (implementat)

El repositori ja genera dos artefactes independents:

| Build | Comanda | Sortida | Contingut |
| --- | --- | --- | --- |
| Públic | `npm run build:public` | `dist/public/` | `index.html` + catàleg |
| Privat | `npm run build:private` | `dist/private/` | `admin.html` + panell |

`npm run check:bundle` falla si el bundle públic conté textos del panell («Gestió Interna»,
«Inventari de Materials», «Executar Trigger»…), i la CI l'executa abans de publicar. La pàgina
`admin.html` porta `noindex, nofollow`.

### On allotjar la part privada

Decisió presa: **HtmlService amb `access: DOMAIN`**, dins del mateix projecte d'Apps Script que
conté el backend de gestió. Així l'autenticació és la del compte del centre (sense cap proveïdor
extern), `Session.getActiveUser()` identifica qui fa cada canvi i desapareix la necessitat de
mantenir un segon hosting.

Requisit: el backend ha d'existir abans de publicar el panell, perquè dins d'HtmlService no hi ha
`localStorage` i tot l'estat ha de venir del servidor (§18).

Alternatives descartades o ajornades:

| Opció | Cost | Autenticació | Valoració |
| --- | --- | --- | --- |
| **Apps Script HtmlService (`DOMAIN`)** | Gratis | Compte del centre | **Decisió actual** |
| Cloudflare Pages + Access | Gratis fins a 50 usuaris | Correu (OTP) o Google | Només si cal ensenyar el panell abans que hi hagi backend |
| Netlify / Vercel amb contrasenya | Pla de pagament | Contrasenya compartida | Evitar: sense traçabilitat per usuari |
| GitHub Pages | Gratis | Cap | **No serveix**: no permet restringir l'accés |

---

## 12. Pla de migració per fases

| Fase | Què es fa | Estat | Criteri de fet |
| --- | --- | --- | --- |
| **F0a** | Dues entrades, dos builds, guardia del bundle | ✅ Fet | `admin.html` fora del bundle públic i `check:bundle` en verd |
| **F0b** | `CrpRepository` + `LocalRepository`; `CrpContext` asíncron | ⏳ Pendent | Els 22 tests unitaris i 11 E2E segueixen en verd |
| **F1** | `Code.gs` públic: `doGet` + catàleg + disponibilitat; `PublicRepository` amb JSONP | ⏳ Pendent | L'app pública llegeix dades reals del full |
| **F2** | `Code.gs` privat: CRUD + `LockService` + IDs; `PrivateRepository` | ⏳ Pendent | Crear/validar reserves des del panell |
| **F3** | Correus i triggers (`Correus.gs`) | ⏳ Pendent | Un correu real arriba a la bústia del CRP |
| **F4** | `Registre`, quotes, caché, reintents | ⏳ Pendent | Cap error no controlat en una setmana d'ús |
| **F5** | Retallada: `localStorage` fora de producció | ⏳ Pendent | El build públic no conté dades ni codi d'escriptura |

Cada fase és un commit independent, amb les seves proves.

---

## 13. Proves

- **Unitàries**: segueixen contra `LocalRepository`, que ha de complir el mateix contracte que els
  repositoris remots. Un test de contracte (`CrpRepository` compartit) evita divergències.
- **Contracte**: un test que valida que `PublicRepository` i `LocalRepository` retornen la mateixa
  forma de `CatalegPublic`.
- **E2E**: es poden apuntar a l'entorn desplegat canviant `baseURL`; el flux docent → CRP es pot
  executar contra el desplegament de proves amb un full de càlcul buit.
- **RGPD**: una prova que comprova que la resposta pública no conté cap camp de `Reserva`
  (correu, telèfon, nom, centre).

---

## 14. Riscos i mitigacions

| Risc | Impacte | Mitigació |
| --- | --- | --- |
| Latència d'Apps Script (1–3 s en fred) | Catàleg lent | Caché 60 s + hosting estàtic per al front |
| Límit de 6 min per execució | Exportacions grans | Paginar; exportar a Drive en segon pla |
| Sense transaccions a Sheets | Doble reserva | `LockService` + verificació dins del pany |
| Quotes de correu | Recordatoris perduts | Log a `Notificacions` + reintent diari |
| Full manipulat a mà | Dades inconsistentes | Validació al servidor + `Registre` |
| CORS | API il·legible | JSONP (públic) i `google.script.run` (privat) |
| Dependència de Google | Bloqueig del projecte | Exportació CSV ja implementada com a sortida |

---

## 15. Alternatives descartades

1. **Servir tota la SPA des d'HtmlService.** El `localStorage` està bloquejat dins de l'iframe, no hi
   ha domini propi i el panell quedaria obert. Vàlid per a una demo, no per a producció.
2. **Proxy intermedi (Cloudflare Worker) per evitar JSONP.** Més peces i un domini més; només té
   sentit si es vol POST des del front públic.
3. **Firebase/Supabase en lloc de Sheets.** Millor per a concurrència i consultes, però perd
   l'avantatge d'usar el Workspace del centre i el full que ja fa servir el CRP.
4. **Google Forms + Sheets sense app.** Menys control de la UI i pitjor experiència per al docent.

---

## 16. Estimació

| Bloc | Esforç |
| --- | --- |
| F0a · Separació de builds i guardia | ✅ fet |
| F0b · Repositori + context asíncron | 1–1,5 dies |
| F1 · API pública + JSONP | 1 dia |
| F2 · API privada + panys | 1,5 dies |
| F3 · Correus i triggers | 1 dia |
| F4 · Auditoria, caché, reintents | 0,5 dies |
| F5 · Retallada i proves | 1 dia |
| **Total pendent** | **6–7 dies** |

---

## 17. Resum

- **Fet**: catàleg públic desplegat a GitHub Pages, panell separat en un segon build (`admin.html`)
  que no arriba mai al navegador del ciutadà, i guardia automàtica a la CI.
- La UI **no es toca**: només canvia la capa de dades, darrere d'una interfície `CrpRepository`.
- **Dues apps**: catàleg estàtic + API pública de només lectura (JSONP); panell HtmlService + API
  privada amb `google.script.run`.
- **Dades a Sheets** (les 4 pestanyes existents + `Registre` i `Config`) i **correu amb `MailApp`** i
  triggers diaris.
- La seguretat ve del **desplegament** (públic anònim vs. domini) i de la **projecció de camps**, no
  de confiar en el client.
- Els 22 tests unitaris i 11 E2E actuals continuen sent la xarxa de seguretat de la migració.

---

## 18. Gestió de l'estat: d'on venim i cap on anem

### 18.1. Com funciona ara

- Tot l'estat viu a `CrpContext` amb `useState`: `materials`, `torns`, `reserves`, `notificacions`.
- Es persisteix al **`localStorage` del navegador** (`crp_materials_v1`, `crp_reserves_v1`,
  `crp_notificacions_v1`) dins d'un `useEffect` que s'executa a cada canvi.
- Les accions són **síncrones**: `crearReserva()` retorna l'objecte a l'instant i la UI el pinta
  sense esperar.
- Cada navegador té la seva còpia: dues persones del CRP no veuen el mateix.
- No hi ha estats de **càrrega** ni d'**error**: la UI assumeix que tot és immediat i que mai falla.
- `restablirDadesPerDefecte()` esborra el `localStorage` i torna a les dades d'exemple.

### 18.2. Per què això no encaixa amb Apps Script

| Supòsit actual | Realitat a Apps Script |
| --- | --- |
| L'estat és local i immediat | Cada acció és una crida RPC de 100–800 ms |
| Ningú més toca les dades | Diverses persones comparteixen el mateix full |
| Res no falla | Quota de correu, bloqueig ocupat, xarxa intermitent |
| Es pot guardar al navegador | `localStorage` està bloquejat dins d'HtmlService |
| Un sol usuari per sessió | Cal saber **qui** fa cada canvi (`Session.getActiveUser()`) |

### 18.3. Model objectiu

1. **`CrpRepository`** (vegeu §10.1): interfície única, tres implementacions
   (`LocalRepository` per a desenvolupament i tests, `PublicRepository` amb JSONP,
   `PrivateRepository` amb `google.script.run`).
2. **Context asíncron**: `CrpProvider` rep el repositori per prop i exposa, a més de les dades,
   `carregant`, `error` i `recarregar()`. Les accions retornen `Promise`.
3. **Escriptures pessimistes**: no es pinta el canvi fins que el servidor confirma. Reservar un torn
   és una operació exclusiva; una actualització optimista amagaria el conflicte.
4. **Lectures amb caché**: el catàleg públic es pot servir 60 s des de `CacheService`; el panell
   refresca en entrar i després de cada escriptura.

### 18.4. Cicle d'una acció (reservar un torn)

```
UI (botó desactivat, spinner)
  └─ context.crearReserva(dades)
       └─ PrivateRepository/PublicRepository.crearReserva()
            └─ servidor: LockService → comprova torn → escriu fila → envia correu
                 └─ resposta { ok, reserva } | error «torn ocupat»
       └─ estat: afegeix la reserva  |  error: mostra missatge i refresca disponibilitat
  └─ UI (confirmació amb codi)
```

L'error «aquest torn acaba d'ocupar-se» **no és un cas excepcional**: el formulari ha de tornar a
pintar la disponibilitat i convidar a triar-ne un altre.

### 18.5. Concurrència i conflictes

- **Servidor**: `LockService` al voltant de cada escriptura (§7) i verificació del torn dins del
  pany; l'ID de reserva surt d'un comptador a `Config`.
- **Client**: si la resposta és «ocupat», refresca i no reintenta automàticament.
- **Panell**: dues persones editant la mateixa reserva → guanya l'última escriptura, però queda
  rastre a `Registre` (qui i quan).

### 18.6. Què cal tocar al codi (F0b)

| Fitxer | Canvi |
| --- | --- |
| `src/data/CrpRepository.ts` | Nou: la interfície i els tipus de resposta |
| `src/data/localRepository.ts` | Extret de `CrpContext` (avui és el propi context) |
| `src/data/publicRepository.ts` | JSONP contra el script públic |
| `src/data/privateRepository.ts` | `google.script.run` prometificat |
| `src/context/CrpContext.tsx` | Repositori per prop, estat `carregant`/`error`, accions async |
| `PublicCatalog`, `ReservationModal`, `AdminDashboard` | Estats de càrrega, error i reintent |
| `src/test/*` | Test de contracte entre repositoris; mocks asíncrons |
| `e2e/*` | Esperar l'estat de càrrega abans d'actuar |

### 18.7. Impacte visible a la UI

| Pantalla | Què s'hi afegeix |
| --- | --- |
| Catàleg | Esquelet de càrrega; missatge si el servidor no respon; reintent |
| Formulari | Botó «Enviant…» desactivat; error de torn ocupat amb refresc |
| Panell | Indicador d'actualització; error no bloquejant; botons desactivats mentre desen |

És un canvi contingut: cap component canvia d'estructura, només guanya estats que avui no té.
