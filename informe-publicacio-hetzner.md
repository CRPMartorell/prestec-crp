# Publicació a Hetzner Webhosting S

> **Informe d'anàlisi previ a la publicació.** Data: 24 de novembre de 2026.
> Repositori: `CRPMartorell/prestec-crp`, branca `main`, commit `e148a48`.
>
> **Abast:** entendre com es publica l'aplicació, com encaixen la base de dades i el correu al pla
> **Webhosting S**, i què cal corregir o verificar abans de pujar-la.
>
> **Estat:** no s'ha contractat ni desplegat res encara. Les dades de Hetzner provenen de la
> documentació oficial consultada el 24/11/2026; les del codi, d'inspeccionar el repositori i
> d'executar `php -l` (12 fitxers PHP, correcte) i `tsc --noEmit` (correcte). No s'ha provat MySQL
> real, `mail()` real ni cap entorn de Hetzner.

---

## 1. Resum executiu

1. **L'aplicació està preparada per funcionar, però no per publicar-se encara.** El codi PHP passa
   el linter i el front passa el type-check, però el circuit MySQL + correu + cron no s'ha provat mai
   en un servidor real.
2. **La carpeta `deploy/` que hi ha al disc és perillosa: és d'una versió anterior i no és
   compatible amb el codi actual.** Si es puja tal com és, fallen les reserves i la pujada
   d'imatges, i el correu al docent no surt (l'antic `Correu` no fa còpia). Si es barreja codi nou
   amb l'esquema vell, també fallen les notificacions per la columna `copia`. Cal regenerar-la amb
   `npm run deploy:prep` abans de tocar res.
3. **Hetzner Webhosting S és suficient per al CRP**, però té límits que condicionen el disseny:
   **1 base de dades**, **1 tasca programada**, **2 processos PHP**, **192 MB** de memòria, **sense
   SSH** i **Varnish** activat. També inclou **còpies diàries de 14 dies**, al contrari del que diu
   la guia actual.
4. **La documentació existent té tres errors que poden fer perdre hores:** diu que MySQL sol ser a
   `localhost` (ara no ho és), diu que el pla S no té còpies automàtiques (sí que en té) i diu que
   els esborranys no surten mai al catàleg públic (el servidor els envia igualment; la interfície
   els amaga, però l'API no).
5. **Abans de publicar caldria tancar, com a mínim:** regenerar `deploy/`, verificar/corregir
   l'edició de materials a MySQL, decidir el domini i el domini de correu, configurar `config.php`
   amb `entorn=prod` i `driver=mysql`, provar `mail()` amb el remitent correcte, i decidir què fem
   amb Varnish i amb el cron dels recordatoris.

**Conclusió:** el pla S és adequat i el cost és molt baix, però **no s'ha de publicar amb el
`deploy/` actual**. La seqüència recomanada és corregir o verificar els bloquejants B1–B9, provar
MySQL i el correu, i fer la primera publicació amb **Varnish desactivat** i els recordatoris encara
manuals fins que el cron estigui provat.

---

## 2. Abast i mètode

### 2.1. Documents i codi revisats

| Àmbit | Fitxers |
| --- | --- |
| Guia del projecte | [`AGENTS.md`](AGENTS.md), [`README.md`](README.md) |
| Arquitectura | [`documentacion.md`](documentacion.md) |
| Desplegament | [`desplegament.md`](desplegament.md) |
| API i negoci | `server/public/index.php`, `server/src/Crp.php`, `server/src/Auth.php`, `server/src/Http.php` |
| Base de dades | `server/src/Db.php`, `server/sql/schema.mysql.sql`, `server/sql/seed.mysql.sql`, `server/src/Seed.php` |
| Correu | `server/src/Correu.php`, secció de notificacions de `server/src/Crp.php` |
| Imatges | `server/src/Imatges.php`, `server/public/uploads/.htaccess` |
| Publicació | `scripts/prep-deploy.mjs`, `vite.config.ts`, `server/public/.htaccess`, `deploy/` |
| Front | `src/data/httpRepository.ts`, `src/components/public/PublicCatalog.tsx`, `index.html`, `admin.html` |

### 2.2. Documentació externa consultada (Hetzner)

- [Pàgina de Webhosting (ES)](https://www.hetzner.com/es/webhosting/)
- [Visió general de Webhosting S, M, L, XL](https://docs.hetzner.com/managed/webhosting/overview/)
- [Preguntes freqüents de Webhosting](https://docs.hetzner.com/managed/webhosting/webhosting-faq/)
- [MariaDB/MySQL a konsoleH](https://docs.hetzner.com/managed/databases/mariadb-mysql/)
- [Dades de connexió de la base de dades](https://docs.hetzner.com/managed/databases/general/connection-details-database/)
- [Configuració de PHP](https://docs.hetzner.com/managed/webserver/php-configuration/)
- [Gestor de cron](https://docs.hetzner.com/managed/administration-on-konsoleh/cronmanager/)
- [Configuració del correu en un client](https://docs.hetzner.com/managed/email/set-up-email-account/setting-up-an-email-account/) (inclou `mail()`)
- [Registres i sistema de correu](https://docs.hetzner.com/managed/email/maillogs-mailsystem/)
- [DKIM, SPF i DMARC](https://docs.hetzner.com/managed/email/email-security/)
- [Còpies de seguretat](https://docs.hetzner.com/managed/administration-on-konsoleh/backup/)
- [Varnish](https://docs.hetzner.com/managed/administration-on-konsoleh/varnish/)
- [Certificats SSL gratuïts](https://docs.hetzner.com/managed/ssl/ssl-guide/)
- [Notes de fair use](https://docs.hetzner.com/managed/webhosting/fair-use-web-hosting/)
- [Nota de premsa dels nous plans (2025)](https://www.hetzner.com/pressroom/new-webhosting-2025/)

### 2.3. Què **no** s'ha fet

- No s'ha contractat el hosting ni creat cap base de dades.
- No s'ha executat cap prova contra MySQL; les E2E actuals van contra SQLite.
- No s'ha enviat cap correu real; el transport `mail()` no està verificat al hosting.
- No s'ha provat Varnish, cron, SSL ni permisos de fitxers reals.
- No s'ha executat la suite sencera (`npm test`, `npm run test:e2e`); només `tsc` i `php -l`.

### 2.4. Documentació vs realitat (resum)

| Tema | Què diu la documentació | Què hi ha realment |
| --- | --- | --- |
| Publicació | `deploy:prep` genera `deploy/`; es puja per FTP a `public_html` | Correcte; però `deploy/` actual és antic (vegeu §3.2) |
| Base de dades | MySQL a producció, SQLite en local | Correcte; el codi suporta tots dos |
| Host MySQL | «Normalment `localhost`» ([`desplegament.md`](desplegament.md)) | **Incorrecte**: Hetzner dona un host i un port separats |
| Còpies | El pla S no inclou backups ([`desplegament.md`](desplegament.md)) | **Incorrecte**: n'hi ha de diaris, 14 dies |
| CSRF | Totes les mutacions exigeixen `X-CSRF` ([`documentacion.md`](documentacion.md)) | La reserva pública **no** en porta; la resta sí |
| Esborranys | No surten mai al catàleg públic | La interfície els amaga; **l'API els retorna** |
| Correu | `log` en dev, `mail` en prod; avís, aprovació, denegació i recordatori | El codi ho fa; la còpia al docent hi és; `mail()` no s'ha provat |
| Recordatoris | Trigger diari | No hi ha script de cron; només el botó manual |
| Proves | 39 unitàries + 11 E2E | No executades en aquesta anàlisi; les E2E són SQLite |

---

## 3. Com es publica avui: flux complet

### 3.1. Dues aplicacions, un sol domini

```
Navegador
   │  HTTPS
   ▼
Apache (public_html)  ← possiblement darrere Varnish
   ├── /                → index.html      (React, catàleg públic)
   ├── /admin.html      → admin.html      (React, panell intern)
   ├── /api/*           → index.php       (API PHP)
   ├── /uploads/*       → imatges pujades
   └── /assets/*        → JS/CSS amb hash
                              │
                              ▼
                        PDO → MySQL (servidor de BD de Hetzner)
                              │
                        Correu → Exim local → mail()
```

No hi ha router: són dues pàgines HTML independents, amb dos punts d'entrada de Vite
(`index.html` i `admin.html`). El bundle públic no ha de contenir codi del panell.

### 3.2. Generació del paquet

```bash
npm run deploy:prep
```

Aquesta comanda fa, en aquest ordre:

1. `npm run build:public` → `dist/public/`.
2. `npm run build:private` → `dist/private/`.
3. `node scripts/prep-deploy.mjs` → esborra `deploy/` i el torna a muntar.

Contingut resultant de `deploy/`:

| Fitxer/carpeta | Origen | Funció |
| --- | --- | --- |
| `index.html`, `assets/` | `dist/public` | Catàleg públic |
| `admin.html` | `dist/private` | Panell (sense dades; l'API exigeix sessió) |
| `index.php`, `.htaccess` | `server/public` | Front controller i regles d'Apache |
| `src/` | `server/src` | Classes PHP (`Crp`, `Db`, `Auth`, `Correu`, `Imatges`, `Http`, `Seed`) |
| `sql/` | `server/sql` | Esquema MySQL/SQLite i dades d'exemple |
| `tools/` | `server/tools` | Instal·lació i creació d'usuaris per CLI |
| `data/seed.json` | `server/data` | Font de les dades d'exemple |
| `config/config.example.php` | `server/config` | Plantilla; **no** inclou `config.php` |
| `uploads/` | Buit + `.htaccess` | Imatges pujades; escriptura 775 |
| `var/` | Buit + `.gitkeep` | Fitxers temporals; escriptura 775 si cal |

`deploy/` és **artefacte generat**: està a `.gitignore` i no es versiona. No s'ha de confondre amb
codi font.

> **Atenció amb les dates:** a la data d'aquest informe, `deploy/` i `dist/private/` són del
> **17/11/2026**, mentre que `server/src/Crp.php` i `server/src/Correu.php` són del **24/11/2026**.
> `dist/public/` sí que sembla més actual, però això no garanteix que el paquet sigui coherent.
> Cal executar `npm run deploy:prep` i revisar el resultat; no reutilitzar `deploy/`.

### 3.3. Publicació per FTP

1. Connectar per **SFTP/FTPS** (millor que FTP pla) amb les dades de konsoleH.
2. Pujar **el contingut** de `deploy/` dins de `public_html`, no la carpeta `deploy/` sencera.
3. Assegurar-se que hi arriben els fitxers ocults, especialment **`.htaccess`**.
4. Crear `config/config.php` **al servidor** (no ve dins del paquet) i ajustar-lo.
5. Donar permisos: `uploads/` i `var/` escrivibles (775); `config/config.php` llegible només pel
   compte (600/640); la resta, 644/755.
6. Importar l'esquema i les dades des de phpMyAdmin.
7. Activar SSL, provar el catàleg, el panell, una reserva, una imatge, un CSV i un correu.

> **No facis servir el mode «mirror»/sincronització de FileZilla contra `public_html`.** Pot
> esborrar `config/config.php` i les imatges de `uploads/`, perquè no existeixen al paquet de
> desplegament. Puja sempre fitxer a fitxer o amb una còpia manual.

### 3.4. Per què `.htaccess` és crític

`server/public/.htaccess` fa aquestes coses:

- `Options -Indexes`: impedeix llistar directoris.
- `DirectoryIndex index.html index.php`: la portada és el catàleg.
- `RedirectMatch 404 ^/(src|config|sql|tools|var|data)(/|$)`: bloqueja les carpetes internes.
- `RewriteRule ^api(/.*)?$ index.php [L,QSA]`: envia tota l'API al front controller.
- `RewriteRule ^ index.html [L]`: qualsevol altra ruta torna el catàleg (comportament SPA).
- Afegeix `X-Content-Type-Options`, `X-Frame-Options` i `Referrer-Policy`.

Sense `.htaccess`, `/api/cataleg` no existeix i les carpetes internes queden exposades.

### 3.5. Actualitzacions

Ordre recomanat per evitar barreges de versions:

1. `npm run deploy:prep`.
2. Pujar primer `assets/` (noms amb hash; no trepitgen res).
3. Pujar `index.html`, `admin.html` i, si ha canviat, `src/`, `index.php`, `sql/`.
4. **No** pujar `config/config.php` ni `uploads/` (es perdrien la configuració i les imatges).
5. Si hi ha canvis d'esquema, aplicar-los a mà a phpMyAdmin **abans** o **de manera compatible** amb
   el codi nou.
6. Purgar Varnish o desactivar-lo; si no, es pot servir HTML/API antic.

### 3.6. Cicle d'una reserva

1. El navegador fa `POST /api/reserves` amb JSON. És públic i **no** porta CSRF.
2. `Crp::crearReserva()` valida el material, el torn o les dates, les dades del docent i el correu.
3. Obre una transacció, bloqueja el material (`SELECT ... FOR UPDATE` a MySQL) i torna a comprovar
   la disponibilitat.
4. Genera l'ID `RES-AAAA-NNN`, insereix la reserva en estat `Pendent de Validació`.
5. Insereix la notificació `avis_crp` i envia el correu al CRP amb **còpia al docent**.
6. Fa `commit` i retorna `201` amb la reserva creada.
7. Al panell, el CRP la pot passar a `Concedida` o `Denegada`; llavors s'envia el correu
   corresponent i es deixa rastre a `registre`.

---

## 4. Hetzner Webhosting S: què inclou realment (novembre 2026)

### 4.1. Fitxa tècnica

| Concepte | Webhosting S | Implicació per al CRP |
| --- | --- | --- |
| Espai | **10 GB** | Suficient: imatges de 3 MB i BDs petites |
| Transferència | Il·limitada (fair use) | Trànsit baix |
| Bústies/reenviaments | **Il·limitades** | Es pot crear `no-reply@` i `crp@` |
| Bases de dades | **1** MySQL/MariaDB | No hi ha BD separada per a staging |
| Tasques programades | **1** | Només per a una tasca: els recordatoris |
| Processos PHP | **2** simultanis | Poc marge per a pics; Varnish ajuda |
| Memòria PHP | **192 MB** per script | Suficient |
| `max_execution_time` | **120 s** | Suficient per exportacions petites |
| Sistema | Apache / Nginx, Debian | `.htaccess` suportat |
| PHP | PHP 5/7/8 seleccionable; 8.2–8.5 disponible | Cal PHP **8.2+**; recomanat 8.3/8.4 |
| Correu | Dovecot / Exim; `mail()` suportat | Cal configurar remitent i DKIM/SPF |
| FTP | Il·limitat; FTP, SFTP, FTPS i WebFTP | Pujar per SFTP/FTPS |
| SSH | **No** al pla S | Sense Composer ni ordres interactives |
| Varnish | **Sí**, activat per domini | Cal configurar-lo o desactivar-lo |
| Còpies | **Diàries, 14 dies** | No cal backup propi diari, però sí exportar abans de migrar |
| SSL | Let's Encrypt/Basic gratuït, renovació automàtica | Activar a konsoleH |
| Domini | **No inclòs** | Cal contractar-lo o connectar-ne un d'extern |
| Preu | ~**1,94 €/mes** IVA inclòs; alta ~10,07 € (pot estar bonificada) | Cost molt baix |
| Registre de domini | Des de ~**5,93 €/any** | Pressupost apart |
| Domini extern | ~**0,64 €/mes** | Si el domini no és de Hetzner |

> Els preus són els de la pàgina espanyola el 24/11/2026 i poden canviar. L'IVA i les promocions
> d'alta varien segons el país i el moment.

### 4.2. Conseqüències pràctiques dels límits

- **1 base de dades:** no es pot fer un staging amb una BD separada dins del mateix pla. Opcions:
  proves locals amb MariaDB/MySQL, o contractar una BD addicional (~1 €/mes), o acceptar que la
  primera prova real és producció (no recomanat).
- **1 cron:** si s'usa per als recordatoris, no queda cap altra tasca programada. Les còpies ja les
  fa Hetzner; no cal cron per a això.
- **2 processos PHP:** dues peticions simultànies ja ocupen el límit. Amb poc trànsit no és un
  problema, però un CSV gran o una pujada d'imatge poden fer esperar l'altra petició. Varnish
  redueix aquesta pressió.
- **Sense SSH:** no es pot executar `composer`, `php` interactiu, `mysqldump` ni migracions des de
  terminal. Tot passa per FTP, phpMyAdmin i el gestor de cron (que sí pot executar PHP CLI).
- **Varnish:** pot guardar a la cache HTML i API, i pot **treure cookies que no conegui**. Això afecta
  directament la sessió `crp_sessio`.

### 4.3. Domini: no hi ha URL temporal

Hetzner ho diu explícitament: **no es pot veure el lloc amb una URL temporal tipus
`xxxx.your-vhost.de`**. Cal un domini associat al hosting per servir HTTP i per crear bústies.

Això vol dir que:

- el domini s'ha de decidir **abans** de començar les proves;
- si el domini és extern (per exemple, un subdomini de `xtec.cat`), cal poder modificar-ne el DNS o
  demanar-ho al departament corresponent;
- el certificat SSL no s'emetrà fins que el domini apunti al hosting;
- el correu tampoc no funcionarà fins que el domini i el sistema de correu estiguin actius.

### 4.4. Còpies de seguretat: correcció important

La guia [`desplegament.md`](desplegament.md) diu que el pla S no inclou còpies automàtiques. **Això
ja no és cert.** Hetzner fa còpies **cada nit**, les guarda **14 dies** en un altre centre de dades
i permet restaurar fitxers, carpetes o bases de dades des de konsoleH → *Services → Backup*.

Tot i així:

- una còpia no és una migració: abans de canviar l'esquema, exporta la BD des de phpMyAdmin;
- restaurar una còpia pot sobreescriure la BD actual; coordina-ho amb el CRP;
- les còpies contenen dades personals; cal tractar-les com a tals (accés, retenció, RGPD).

### 4.5. PHP i extensions

- Selecciona **PHP 8.3 o 8.4** a konsoleH → *Services → PHP Configuration*. El codi requereix
  **PHP 8.2+**.
- Verifica que hi hagi `pdo_mysql`, `mbstring`, `session`, `json`, `openssl` i `fileinfo` (aquest
  últim no s'usa, però és habitual). `getimagesize()` no necessita GD.
- Puja els límits d'upload si cal:
  - `upload_max_filesize` ≥ **4 MB** (la imatge màxima és 3 MB);
  - `post_max_size` ≥ **4 MB** (millor 8 MB);
  - `memory_limit` 192 MB ja és suficient;
  - `max_execution_time` 120 s ja és suficient.
- El pla S té **OPcache** disponible; activar-lo és opcional però recomanable.

---

## 5. Base de dades: com funciona i què cal vigilar

### 5.1. Model

El backend fa servir PDO i el mateix codi per a **MySQL/MariaDB** (producció) i **SQLite** (local).
No hi ha `AUTO_INCREMENT`: els identificadors són text (`MAT-001`, `T-01`, `RES-2026-001`).

| Taula | Contingut | Notes |
| --- | --- | --- |
| `materials` | Catàleg | `estat_general`: `Actiu`, `En Manteniment`, `Baixa`, `Esborrany` |
| `torns` | 6 torns del curs | Dates en text `DD/MM/YYYY` i ISO `YYYY-MM-DD` |
| `reserves` | Reserves | Dades del docent, centre, municipi, correu; **sense telèfon** |
| `notificacions` | Registre del correu | `tipus`, `destinatari`, `copia`, `assumpte`, `cos`, `id_reserva` |
| `usuaris` | Personal del CRP | `password_hash`; `actiu` |
| `registre` | Auditoria | Accions, IP, usuari, detall |
| `config` | Comptador de reserves | `reserva_counter` |

L'esquema MySQL és `utf8mb4` i `InnoDB`, amb índexs per `(id_material, torn_assignat)` i `estat`.
No hi ha claus foranes.

### 5.2. Connexió: el punt més delicat

`config/config.php` ha de contenir:

```php
'driver' => 'mysql',
'mysql' => [
    'host' => 'EL_HOST_DE_KONSOLEH', // NO 'localhost'
    'port' => 'EL_PORT_DEL_CORREU',
    'name' => 'EL_NOM_DE_LA_BD',
    'user' => 'EL_USUARI',
    'pass' => 'LA_CONTRASENYA_RW',
    'charset' => 'utf8mb4',
],
```

**Hetzner ha canviat el model:** la base de dades **no** corre al mateix servidor que el web. La
documentació oficial ho diu clarament: *no facis servir `localhost`*. El host i el port els dona
konsoleH i el correu de confirmació de la BD.

A més, en crear la BD es defineixen **tres contrasenyes**:

| Contrasenya | Permisos | Ús recomanat |
| --- | --- | --- |
| **Principal** | Tot, incloent DDL | Només phpMyAdmin i importacions |
| **R/W** | Lectura i escriptura, sense canvis d'estructura | **La que ha d'usar `config.php`** |
| **R/O** | Només lectura | Informes o eines externes |

No posis la contrasenya principal a `config.php`. Si més endavant cal un canvi d'esquema, es fa a
phpMyAdmin amb la principal i després es torna a la R/W.

Si a konsoleH s'activa **«Require SSL»** per a la BD, el codi actual **no** podrà connectar-hi: `Db`
no configura cap CA. O ho deixes desactivat, o s'afegeix suport a `PDO::MYSQL_ATTR_SSL_CA`.

### 5.3. Creació de l'esquema i de les dades

**No hi ha SSH**, així que `php server/tools/install.php` no es pot executar interactivament. El
camí és phpMyAdmin:

1. Importar `sql/schema.mysql.sql` amb la contrasenya **principal**.
2. Importar **només les dades imprescindibles**:
   - els **6 torns** són obligatoris; sense ells no es poden reservar recursos pedagògics;
   - els materials es poden crear des del panell;
   - **no** importis les 5 reserves d'exemple: són PII falsa i embruten la producció;
   - si importes el seed sencer, esborra després les reserves d'exemple i ajusta el comptador
     `config.reserva_counter` (el seed el deixa a `5`).
3. Crear l'usuari del CRP amb un hash generat al teu ordinador:

   ```bash
   php -r "echo password_hash('la-teva-contrasenya', PASSWORD_DEFAULT), PHP_EOL;"
   ```

   ```sql
   INSERT INTO usuaris (correu, nom, hash, actiu, creat)
   VALUES ('crp@el-teu-domini.cat', 'Personal del CRP', '$2y$10$...', 1, NOW());
   ```

4. Comprovar:

   ```sql
   SHOW TABLES;
   SELECT COUNT(*) FROM torns;      -- 6
   SELECT COUNT(*) FROM materials;  -- 0 o el catàleg inicial
   SELECT COUNT(*) FROM reserves;   -- 0 en producció
   ```

> Els **torns no es poden editar des del panell**: la pestanya «Torns Pedagògics» només els mostra.
> Per canviar el calendari del curs següent caldrà fer un `UPDATE`/`INSERT` a la BD o afegir una
> pantalla d'administració.

### 5.4. Diferències MySQL vs SQLite que poden aparèixer en producció

Aquesta és la part que les proves actuals **no** cobreixen: les E2E van contra SQLite.

| Risc | Per què | Què cal fer |
| --- | --- | --- |
| **Editar un material existent pot fallar a MySQL** | `Db::update()` genera `SET id = :id ... WHERE id = :id`; amb `PDO::ATTR_EMULATE_PREPARES = false`, PDO/MySQL no admet un paràmetre nominal repetit | Verificar-ho en un MySQL real; si falla (error `HY093`), excloure `id` del `SET` o fer servir un placeholder diferent |
| `SELECT ... FOR UPDATE` només s'executa a MySQL | És el pany per material dins la transacció; `Db::bloquejaMysql()` no fa res a SQLite | Correcte; InnoDB hi és |
| Comptador de reserves no atòmic | Dues reserves simultànies de **materials diferents** poden llegir el mateix `reserva_counter` | Poc probable amb 2 processos PHP; si cal, bloquejar la fila `config` o reintentar |
| Mode estricte | Si falta una columna `NOT NULL`, l'`INSERT` falla | L'esquema actual hi és; el problema seria un esquema antic (vegeu §8) |
| Dates i zona horària | `date('Y')` i `new DateTimeImmutable('today')` fan servir la zona per defecte de PHP; no hi ha `date_default_timezone_set()` | Afegir `date_default_timezone_set('Europe/Madrid')` a `bootstrap.php` |
| `TEXT NOT NULL` | `descripcio`, `contingut`, etc. no tenen valor per defecte | El codi sempre envia cadena (pot ser buida); correcte |
| `Require SSL` | `Db` no configura CA | Deixar desactivat o afegir suport SSL |
| `utf8mb4_unicode_ci` | Els IDs són case-insensitive | Correcte per a `MAT-001`/`mat-001`; no barrejar majúscules |

### 5.5. Migracions i manteniment

- **No hi ha taula de versions d'esquema.** Cada canvi s'aplica a mà i cal recordar-lo. Recomanació:
  afegir una clau `schema_version` a `config` o un fitxer `sql/migrations/`.
- **No hi ha claus foranes.** `eliminarMaterial()` fa un `DELETE` dur; si el material té reserves,
  queden òrfenes. És millor fer servir l'estat `Baixa` que esborrar.
- **No hi ha esborrat suau** ni historial de materials; `registre` guarda l'acció, però no el contingut
  anterior.
- **Abans de qualsevol migració:** exportar la BD des de phpMyAdmin i guardar el fitxer fora del
  hosting.

### 5.6. RGPD i dades personals

- Les taules `reserves`, `notificacions` i `registre` contenen noms, centres, municipis, correus i
  IP. Només el panell hi accedeix, però les **còpies de Hetzner** i els **exports** també les
  contenen.
- El seed conté **5 reserves amb PII falsa** i imatges d'Unsplash. No s'ha d'importar sencer a
  producció: només els torns i, si es vol, els materials.
- No hi ha purga automàtica de reserves finalitzades ni de notificacions. Cal una política de
  retenció (per exemple, esborrar o anonimitzar en acabar el curs) i documentar-la.
- La política de privacitat i el consentiment del formulari són incomplets (vegeu §7).

---

## 6. Correu: com funciona i què cal vigilar

### 6.1. Circuit al codi

| Esdeveniment | Mètode | Destinatari | Còpia | Tipus |
| --- | --- | --- | --- | --- |
| Nova reserva | `crearReserva()` → `notificaAvisCrp()` | `correu_crp` (`crp-martorell@xtec.cat`) | **Docent** | `avis_crp` |
| Reserva concedida | `validarReserva('Concedida')` | Docent | — | `aprovacio_usuari` |
| Reserva denegada | `validarReserva('Denegada')` | Docent | — | `denegacio_usuari` |
| Recordatori de retorn | `recordatoris()` | Docent | — | `recordatori_retorn` |

Cada enviament s'insereix primer a `notificacions` i després es crida `Correu::enviar()`. En
desenvolupament, el transport `log` escriu a `server/var/correus.log`; en producció, `mail` fa
servir `mail()`.

### 6.2. Configuració

```php
'correu_crp' => 'crp-martorell@xtec.cat',
'remitent' => 'no-reply@EL_TEU_DOMINI',
'mail_transport' => 'mail', // 'log' només en desenvolupament
```

- `remitent` **ha de ser del domini allotjat a Hetzner** (o un domini amb SPF/DKIM que autoritzi el
  servidor). Si poses `@xtec.cat`, els filtres antispam el poden rebutjar o marcar com a spam.
- `correu_crp` pot ser perfectament `@xtec.cat`: és el destinatari, no el remitent.
- `Reply-To` ja apunta a `correu_crp`, de manera que les respostes del docent van al CRP.

### 6.3. Com envia el correu el codi

`Correu::enviar()` fa:

```php
$capçaleres = [
    'From: ' . $this->config['remitent'],
    'Reply-To: ' . $this->config['correu_crp'],
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0',
];
if ($copia !== null) {
    $capçaleres[] = 'Cc: ' . $copia;
}
return @mail($destinatari, $assumpte, $cos, implode("\r\n", $capçaleres));
```

Problemes detectats:

1. **Falta el 5è paràmetre `-f` (envelope-from).** Hetzner ho recomana explícitament perquè els
   correus no es tractin com a spam i perquè els rebots tornin a una bústia controlada. Sense això,
   l'envelope sender pot ser un usuari del sistema i els rebots es perden.
2. **El resultat de `mail()` s'ignora.** `notifica()` insereix la notificació i crida `enviar()`,
   però no mira si ha retornat `false`. La taula `notificacions` és un registre d'**intents**, no de
   lliuraments. No hi ha estat `enviat`/`error` ni reintent.
3. **L'assumpte no s'encode en UTF-8.** Els accents i els punts volats poden arribar malament en
   alguns clients. Cal `mb_encode_mimeheader($assumpte, 'UTF-8')` o equivalent.
4. **Possible injecció de capçaleres.** L'assumpte d'`avis_crp` inclou el nom del centre que ve del
   formulari. Si conté `\r\n`, es podrien injectar capçaleres. Cal eliminar CR/LF dels camps que
   arriben a l'assumpte.
5. **No hi ha `Content-Transfer-Encoding`.** El cos és UTF-8 directe; la majoria de clients
   l'accepten, però afegir `8bit` o `quoted-printable` és més robust.
6. **El correu s'envia dins de la transacció de la reserva.** Si `mail()` triga, la transacció queda
   oberta. Amb poc volum no és greu, però el patró correcte seria un «outbox» o enviar després del
   `commit`.

Correcció mínima recomanada a `Correu::enviar()`:

```php
$assumpte = mb_encode_mimeheader(str_replace(["\r", "\n"], ' ', $assumpte), 'UTF-8', 'B');
$resultat = @mail(
    $destinatari,
    $assumpte,
    $cos,
    implode("\r\n", $capçaleres),
    '-f' . $this->config['remitent']
);
if (!$resultat) {
    error_log('[crp] no s\'ha pogut enviar el correu a ' . $destinatari);
}
return $resultat;
```

### 6.4. Correu a Hetzner: el que cal saber

- Hetzner allotja el correu amb **Dovecot/Exim** i **`mail()` està suportat** des dels scripts del
  web. La documentació oficial dona un exemple amb el 5è paràmetre `-f`.
- Si mai cal SMTP autenticat, el servidor és **`mail.your-server.de`**, port **587** (STARTTLS) o
  **465** (SSL). Les connexions a servidors externs només surten pel 587; el port 25 no és per a
  scripts.
- **SPF, DKIM i DMARC** es configuren des de konsoleH. Si el domini és de Hetzner, l'SPF per defecte
  ja autoritza el servidor; cal activar **DKIM**. Si el DNS és extern, cal posar els registres a mà.
- Els **registres de correu** es guarden **7 dies** i mostren recepció, rebuig, retard, error i
  lliurament. Són la primera eina per diagnosticar un enviament.
- Hetzner aplica **filtres de sortida**. Si un script envia molts correus en poc temps o amb enllaços
  externs sospitosos, el correu es pot **retardar** (puntuació ≥ 50). El volum del CRP és molt baix,
  però un bucle de proves podria activar-ho.

### 6.5. Prova de correu recomanada

1. Crear la bústia o l'àlies `no-reply@EL_TEU_DOMINI` a konsoleH.
2. Activar DKIM i comprovar l'SPF.
3. Fer una reserva real de prova amb un correu del CRP i un altre d'extern.
4. Comprovar:
   - que arriba a `correu_crp`;
   - que el docent rep la **còpia**;
   - que `Reply-To` és `crp-martorell@xtec.cat`;
   - que l'assumpte amb accents es veu bé;
   - que no cau a spam;
   - que el registre de correu de Hetzner diu «delivered».
5. Repetir amb una concessió i una denegació.
6. Executar els recordatoris i comprovar que no se n'envien de duplicats.

### 6.6. Recordatoris i cron

El codi actual **no té cap script CLI de recordatoris**. El botó «Executar trigger» del panell crida
`POST /api/recordatoris` amb sessió. Per automatitzar-ho al pla S cal:

1. Crear `server/tools/recordatoris.php` (CLI) que faci `crp_bootstrap()` i cridi
   `$crp->recordatoris('cron')`.
2. Pujar-lo fora de `public_html` o dins de `tools/` (bloquejat per `.htaccess`).
3. Crear **l'única tasca programada** del pla amb `/usr/bin/php /ruta/absoluta/recordatoris.php`,
   per exemple cada dia a les 08:00.
4. Configurar l'email de sortida del cron per rebre el resultat.
5. Fer la funció **idempotent**: ara `recordatoris()` envia cada dia mentre faltin ≤ 2 dies, sense
   mirar si ja s'ha enviat. Si el cron s'executa cada dia, el docent rebrà el mateix recordatori
   diverses vegades. Cal consultar `notificacions` abans d'enviar.

> El pla S només té **1 cron**. Si es fa servir per als recordatoris, no queda cap altre per a
> neteges o informes. Les còpies ja les fa Hetzner.

---

## 7. Seguretat i RGPD: punts a corregir

### 7.1. Els esborranys surten per l'API pública

`Crp::cataleg()` fa:

```php
$materials = array_map([self::class, 'material'], $this->db->all('SELECT * FROM materials ORDER BY id'));
```

No filtra per `estat_general`. La interfície `PublicCatalog` sí que els amaga:

```tsx
() => materials.filter(m => m.estatGeneral !== 'Esborrany')
```

Però qualsevol pot cridar `/api/cataleg` i veure el nom, la descripció, la imatge i el contingut
dels materials en esborrany. Això contradiu [`AGENTS.md`](AGENTS.md) i [`documentacion.md`](documentacion.md)
i és una fuita d'informació interna (no de PII, però sí de material no publicat).

**Correcció:** filtrar al servidor (`WHERE estat_general <> 'Esborrany'`) i mantenir el filtre del
client com a defensa addicional. Cal afegir una prova E2E que comprovi que l'API no retorna cap
esborrany.

### 7.2. Varnish i la sessió

Varnish pot:

- guardar a la cache `/` i `/api/cataleg` (TTL de contingut dinàmic);
- **treure cookies** que no estiguin a les llistes `Nocache cookies`/`Cache cookies`;
- servir HTML antic després d'un desplegament.

La sessió es diu **`crp_sessio`**, no `PHPSESSID`. Si no s'afegeix a `Nocache cookies`, Varnish la
pot eliminar i el panell pot perdre la sessió de manera intermitent. A més, `/api/sessio` i
`/api/panell` no s'han de guardar mai a la cache.

**Recomanació:** per a aquesta aplicació, **desactivar Varnish** al domini. El trànsit és baix i el
guany no compensa el risc. Si es vol mantenir:

- `Nocache cookies`: `crp_sessio`;
- `Nocache URLs`: `^/api/`;
- TTL de contingut dinàmic: 0;
- purgar la cache després de cada desplegament;
- afegir `Cache-Control: no-store` a les respostes de l'API.

### 7.3. `config.php` no falla si falta

`bootstrap.php` fa:

```php
$config = is_file($fitxer)
    ? require $fitxer
    : require __DIR__ . '/../config/config.example.php';
```

Si `config.php` no existeix, l'aplicació **no s'atura**: arrenca amb `driver=sqlite`, `entorn=dev`,
`mail_transport=log` i `remitent=no-reply@example.cat`. Això pot crear una SQLite buida, mostrar
errors amb rutes i fer veure que el lloc «funciona» quan no hi ha base de dades.

**Correcció:** si `entorn` és `prod` o si falta `config.php`, aturar amb un 500 controlat i un
missatge genèric; validar `driver`, `entorn` i `mail_transport` en arrencar.

### 7.4. Eines i endpoint de proves

- `server/tools/install.php` **no comprova `PHP_SAPI`**. Si `.htaccess` fallés i `/tools/` fos
  accessible, es podria executar una instal·lació des del navegador.
- `POST /api/test/reset` existeix **abans** de l'autenticació i només depèn de
  `getenv('CRP_TEST_RESET') === '1'`. Si aquesta variable s'activa per error a producció, qualsevol
  pot esborrar i repoblar la BD.
- `tools/` es pot eliminar en producció; si es necessita el cron, deixar-hi només el script de
  recordatoris i protegir-lo.

**Correcció:** afegir `if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }` a les eines;
no definir `CRP_TEST_RESET` a producció; comprovar que `/tools/install.php` i `/api/test/reset`
retornen 404.

### 7.5. CSRF i formulari públic

`documentacion.md` diu que «les mutacions exigeixen `X-CSRF`». No és exacte: `POST /api/reserves`
és públic i **no** demana CSRF (té sentit, perquè el formula el visitant anònim). La resta de
mutacions sí que el demanen.

El que sí que falta és una **limitació d'abús** al formulari públic: no hi ha CAPTCHA, honeypot ni
límits per IP. Un bot podria omplir la BD de reserves i fer saltar els avisos al CRP. Amb el volum
habitual no és crític, però convé un mínim (rate limit per IP, honeypot o validació temporal).

### 7.6. Privacitat, consentiment i tercers

- El formulari només mostra un text informatiu de RGPD; **no hi ha enllaç a la política de
  privacitat ni una casella de consentiment**. Per a una administració pública, cal revisar-ho amb
  l'assessorament jurídic del centre.
- `index.html` carrega **Google Fonts** des de `fonts.googleapis.com`: la IP del visitant arriba a
  Google. Per a un web públic del CRP, és millor **autoallotjar les fonts** o fer servir fonts del
  sistema.
- Les imatges del seed són d'**Unsplash** (URLs externes). A producció cal pujar imatges pròpies a
  `uploads/` i actualitzar `url_imatge`; així s'evita dependre d'un tercer i es compleix millor la
  privacitat.
- Les notificacions i les còpies de seguretat contenen PII. Cal definir **retenció**, **accés** i
  **esborrat** (per curs, per exemple).

### 7.7. Capçaleres, cookies i HTTPS

- La cookie de sessió és `HttpOnly`, `SameSite=Lax` i `Secure` **només si `$_SERVER['HTTPS']` és
  `on`**. Darrere de Varnish o d'un proxy SSL, aquesta variable pot no arribar; cal comprovar-ho i,
  si cal, mirar també `X-Forwarded-Proto`.
- Falta **HSTS** (`Strict-Transport-Security`). Afegir-lo quan HTTPS estigui estable.
- Falta **CSP**. No és imprescindible, però amb Google Fonts i altres recursos externs convé
  planificar-la.
- `admin.html` porta `noindex, nofollow`; el catàleg públic no. Correcte.
- `uploads/.htaccess` impedeix executar PHP, PL, PY, CGI, etc. Correcte.
- `config.php` no està cobert pel `<FilesMatch>` actual (només `.sql`, `.ini`, `.log`,
  `example.php`). La carpeta `/config` ja es bloqueja, però convé afegir `config.php` al
  `<FilesMatch>` com a defensa en profunditat.

### 7.8. Fitxer intern dins del build públic

`public/assets/aistudio/` conté el document de disseny original (Google Sheets/Apps Script). Vite
el copia a `dist/public/assets/aistudio/` i `prep-deploy` el puja a `deploy/assets/aistudio/`, de
manera que queda accessible a `https://EL_DOMINI/assets/aistudio/...md`.

No és PII, però és documentació interna obsoleta. **Cal esborrar `public/assets/aistudio/` abans
de compilar** o excloure'l del build. `npm run check:bundle` no ho detecta perquè només mira els
`.js`.

---

## 8. Troballes prioritzades

### 8.1. Bloquejants (corregir o verificar abans de publicar)

| ID | Troballa | Evidència | Acció |
| --- | --- | --- | --- |
| **B1** | La carpeta `deploy/` és d'una versió anterior i és incompatible amb el codi actual | `deploy/` és del 17/11; `server/src/Crp.php` és del 24/11. `deploy/src/Imatges.php` no existeix; `deploy/index.php` no té la ruta `/api/materials/imatge`; `deploy/sql/schema.mysql.sql:38` encara té `telefon NOT NULL`; `deploy/src/Crp.php` encara demana `telefon`; `deploy/sql` no té `copia` ni `mostra_*`; `deploy/config/config.example.php` no té `uploads_dir`/`uploads_url` | **No pujar `deploy/`**. Executar `npm run deploy:prep` amb el codi actual i revisar el contingut abans de pujar |
| **B2** | Editar un material existent pot fallar a MySQL | `server/src/Db.php:98-103` genera `id = :id ... WHERE id = :id`; `PDO::ATTR_EMULATE_PREPARES=false` a `Db.php:30` | Provar-ho en MySQL; si falla, excloure `id` del `SET` o usar un placeholder diferent; afegir prova d'integració |
| **B3** | La documentació diu `localhost` per a MySQL; a Hetzner la BD és en un altre host | [`desplegament.md`](desplegament.md):20-22; docs oficials de connexió | Usar el **host i port de konsoleH**, no `localhost`; usar la contrasenya **R/W** |
| **B4** | El correu no s'ha provat i el codi no usa l'envelope sender | `server/src/Correu.php:23-33`; docs de Hetzner sobre `mail()` | Afegir `-f`, provar `mail()` real, revisar DKIM/SPF, comprovar registres |
| **B5** | Varnish pot trencar la sessió o servir dades antigues | Sessió `crp_sessio`; Varnish treu cookies desconegudes; TTL dinàmic | Desactivar Varnish o configurar `Nocache cookies: crp_sessio`, `Nocache URLs: ^/api/` i purgar |
| **B6** | No hi ha script de cron per als recordatoris i el trigger no és idempotent | `server/src/Crp.php:361-402`; no hi ha `tools/recordatoris.php` | Crear CLI, programar l'única tasca, deduplicar per `notificacions` |
| **B7** | L'API pública retorna els esborranys | `server/src/Crp.php:101`; `PublicCatalog.tsx:22` | Filtrar al servidor i afegir prova E2E |
| **B8** | Si falta `config.php`, l'app arrenca en SQLite/dev/log | `server/src/bootstrap.php:18-21` | Fail-fast i validació de configuració |
| **B9** | Cal decidir domini i domini de correu; sense domini no hi ha web ni correu | FAQ de Hetzner: no hi ha URL temporal; el domini no està inclòs | Contractar/connectar domini abans de provar; decidir el `From` |

### 8.2. Importants (abans o just després de publicar)

| ID | Troballa | Evidència | Acció |
| --- | --- | --- | --- |
| **I1** | La guia diu que el pla S no té còpies; sí que en té (14 dies) | [`desplegament.md`](desplegament.md):139-140; docs de backup | Actualitzar la guia; fer export abans de migracions |
| **I2** | No hi ha cap prova contra MySQL; les E2E són SQLite | `playwright.config.ts`; `server/src/Db.php` | Provar MySQL local o BD addicional; smoke test a producció |
| **I3** | `tools/install.php` no té guarda CLI i `/tools` depèn del `.htaccess` | `server/tools/install.php:1-18` | Afegir `PHP_SAPI` o eliminar `tools/` en producció |
| **I4** | El seed conté PII falsa i imatges externes; els torns no s'editen des del panell | `server/sql/seed.mysql.sql:20-25`; `AdminDashboard` | Importar només el necessari; crear imatges pròpies; preveure manteniment dels torns |
| **I5** | No s'estableix la zona horària de PHP | No hi ha `date_default_timezone_set()` | Afegir `Europe/Madrid` a `bootstrap.php` |
| **I6** | Els límits d'upload de PHP poden ser inferiors a 3 MB | `Imatges.php`; configuració PHP de Hetzner | Pujar `upload_max_filesize`/`post_max_size` a 8 MB |
| **I7** | Assumpte de correu sense encoding i possible injecció de capçaleres | `server/src/Correu.php`; `Crp.php:453` | `mb_encode_mimeheader`; eliminar CR/LF |
| **I8** | Google Fonts i Unsplash són tercers | `index.html:12-14`; `seed.mysql.sql` | Autoallotjar fonts i imatges |
| **I9** | El build públic inclou documentació interna | `public/assets/aistudio/`; `deploy/assets/aistudio/` | Esborrar la carpeta abans de compilar |
| **I10** | HSTS i `Secure` de cookie no estan garantits darrere de Varnish | `Auth.php:15-23`; `.htaccess` | Afegir HSTS; detectar `X-Forwarded-Proto` |
| **I11** | Comptador de reserves no atòmic entre materials | `Crp.php:262-273` | Acceptar el risc baix o bloquejar `config` |
| **I12** | Esborrar un material deixa reserves òrfenes | `Crp.php:353-359`; sense FK | Fer servir `Baixa` en lloc de `DELETE` |

### 8.3. Menors o documentals

| ID | Troballa | Acció |
| --- | --- | --- |
| **M1** | `documentacion.md` diu que totes les mutacions exigeixen CSRF; la reserva pública no | Matisar la documentació |
| **M2** | `desplegament.md` diu que el pla S no té backups | Corregir |
| **M3** | El workflow de GitHub Pages és manual i només publica el catàleg; no és el desplegament real | Deixar clar que Hetzner és la via principal |
| **M4** | `permet_install` no s'usa | Eliminar o implementar |
| **M5** | El panell encara descriu columnes de Sheets amb «Telèfon» | Actualitzar textos de l'AdminDashboard |
| **M6** | El CSV no porta BOM UTF-8; Excel pot mostrar accents malament | Afegir BOM si es vol Excel directe |
| **M7** | No hi ha `robots.txt` ni sitemap | Opcional |
| **M8** | No hi ha purga d'imatges òrfenes | Neteja manual periòdica |
| **M9** | El login només té un `usleep(300 ms)`; no hi ha límit per IP | Valorar throttle si el panell és exposat |
| **M10** | Les sessions PHP poden caducar per GC (~24 min) encara que la cookie sigui de sessió | Ajustar `session.gc_maxlifetime` si cal |

---

## 9. Checklist de publicació

### 9.1. Abans de contractar

- [ ] Decidir el **domini** (Hetzner o extern) i qui controla el DNS.
- [ ] Decidir el **domini de correu** del remitent; no usar `@xtec.cat` com a `From`.
- [ ] Decidir si es contracta una **BD addicional** per a staging o es prova en local.
- [ ] Confirmar que el contracte de Hetzner va a nom del **centre** (no personal).
- [ ] Valorar el contracte **AV/DPA** de Hetzner per a l'administració pública.

### 9.2. Codi i build

- [ ] `git status` net i commit desplegat anotat.
- [ ] `npm run lint`.
- [ ] `npm test`.
- [ ] `npm run test:e2e` (SQLite).
- [ ] `php -l` de tots els PHP.
- [ ] `npm run deploy:prep`.
- [ ] Revisar `deploy/`: `index.php` amb `/api/materials/imatge`, `src/Imatges.php`, esquema amb
      `mostra_*` i `copia`, sense `telefon`, `admin.html` actual.
- [ ] Esborrar `public/assets/aistudio/` abans del build.
- [ ] Comprovar que `deploy/` no conté `var/crp.sqlite` ni `var/correus.log`.
- [ ] Comprovar `deploy/assets` no conté documentació interna.

### 9.3. Hetzner

- [ ] Contractar Webhosting S.
- [ ] Afegir el domini i configurar DNS (A/AAAA).
- [ ] Esperar propagació; comprovar HTTP.
- [ ] Activar SSL Let's Encrypt i forçar HTTPS.
- [ ] Seleccionar PHP 8.3/8.4.
- [ ] Pujar `upload_max_filesize`/`post_max_size`.
- [ ] Crear la BD; anotar host, port, nom, usuari i contrasenyes.
- [ ] Crear la bústia/àlies `no-reply@`.
- [ ] Activar DKIM; revisar SPF; opcionalment DMARC.
- [ ] Decidir Varnish (recomanat: desactivar).

### 9.4. Pujada i configuració

- [ ] Pujar el **contingut** de `deploy/` a `public_html`, inclòs `.htaccess`.
- [ ] Crear `config/config.php` al servidor amb `driver=mysql`, `entorn=prod`, `mail_transport=mail`.
- [ ] Permisos: `uploads/` 775, `var/` 775, `config.php` 600/640.
- [ ] Comprovar que `config/config.php` no es pot baixar.
- [ ] Comprovar que `/tools/install.php` i `/api/test/reset` retornen 404.
- [ ] Comprovar que `/assets/aistudio/...md` retorna 404.

### 9.5. Base de dades

- [ ] Importar `schema.mysql.sql` amb la contrasenya principal.
- [ ] Importar els 6 torns.
- [ ] No importar les 5 reserves d'exemple.
- [ ] Crear l'usuari del CRP amb hash.
- [ ] **No** reutilitzar l'usuari demo del README (`crp@example.cat` / `prova-segura-2026`).
- [ ] Ajustar `config.reserva_counter` si cal.
- [ ] Comprovar `SHOW TABLES`, `COUNT(*)` i `utf8mb4`.
- [ ] Exportar la BD just després de configurar-la (estat net).

### 9.6. Proves funcionals

- [ ] `GET /` mostra el catàleg.
- [ ] `GET /admin.html` mostra el login.
- [ ] `GET /api/cataleg` retorna 200 i **no** retorna esborranys.
- [ ] `GET /api/panell` sense sessió retorna **401**.
- [ ] Login correcte i incorrecte.
- [ ] Crear reserva; comprovar codi, estat i disponibilitat.
- [ ] Intentar repetir el mateix torn; ha de retornar **409**.
- [ ] Pujar una imatge JPG/PNG/WebP de menys de 3 MB; comprovar `/uploads/...`.
- [ ] Pujar una imatge de més de 3 MB; ha de fallar amb missatge.
- [ ] Editar un material existent (prova específica MySQL).
- [ ] Concedir i denegar una reserva; comprovar correus.
- [ ] Exportar CSV; comprovar accents i columnes.
- [ ] Executar recordatoris manualment; comprovar correu i duplicats.
- [ ] Comprovar capçaleres de seguretat i cookie `Secure`.
- [ ] Comprovar `Age`/Varnish o que no hi ha cache.

### 9.7. Post-publicació

- [ ] Configurar la tasca de recordatoris i l'email de sortida.
- [ ] Exportar la BD i guardar una còpia fora del hosting.
- [ ] Guardar una còpia del `deploy/` publicat i el commit.
- [ ] Comprovar les còpies de Hetzner i fer una restauració de prova (en un entorn segur).
- [ ] Actualitzar [`desplegament.md`](desplegament.md) amb el host real, els límits i el correu.
- [ ] Actualitzar [`documentacion.md`](documentacion.md) amb l'estat real i les correccions.
- [ ] Documentar la política de retenció de dades.

---

## 10. Pla de correcció recomanat

### 10.1. Abans de publicar (bloquejants)

1. **Regenerar `deploy/`** amb el codi actual i revisar-lo. Eliminar la carpeta vella; no reutilitzar-la.
2. **Provar l'edició de materials en MySQL** i corregir `Db::update()` si cal.
3. **Filtrar els esborranys** a `Crp::cataleg()` i afegir una prova E2E.
4. **Afegir `-f` a `mail()`**, encodar l'assumpte, sanejar CR/LF i registrar el resultat de
   `mail()`.
5. **Decidir Varnish**: desactivar-lo o configurar `crp_sessio` i `/api/`.
6. **Crear el script de recordatoris i deduplicar-los**; programar l'única tasca.
7. **Fer que `config.php` sigui obligatori** i validar `driver`, `entorn` i `mail_transport`.
8. **Decidir domini i correu**; crear bústia i DKIM/SPF abans de les proves.

### 10.2. Just després de publicar

- Afegir HSTS i revisar `Secure` darrere de Varnish.
- Afegir `config.php` al `<FilesMatch>` i `Cache-Control: no-store` a l'API.
- Treure `tools/` o protegir-lo amb `PHP_SAPI`.
- Esborrar `public/assets/aistudio/` i tornar a compilar.
- Autoallotjar fonts i imatges.
- Afegir política de privacitat, consentiment i retenció.
- Afegir monitoratge d'uptime, correu i cron.
- Afegir `schema_version` i un procediment de migració.

### 10.3. Més endavant

- Proves d'integració del backend PHP/MySQL.
- Exportació real a `.xlsx` multi-pestanya.
- Purga d'imatges òrfenes.
- Revisió de la màquina d'estats de les reserves.
- Activar `strict` a TypeScript i netejar dependències no usades.

---

## 11. Decisions obertes

| Decisió | Opcions | Recomanació |
| --- | --- | --- |
| **Domini** | Registrar a Hetzner (~5,93 €/any) / connectar un d'extern (~0,64 €/mes) / subdomini de `xtec.cat` | Un domini propi del CRP a Hetzner; evita dependències i permet correu |
| **Remitent** | `no-reply@domini-propi` / `no-reply@xtec.cat` | Domini propi; `Reply-To` a `crp-martorell@xtec.cat` |
| **Varnish** | Activat amb configuració / desactivat | **Desactivat** per a aquesta aplicació |
| **Cron** | Script CLI al pla S / servei extern / manual | Script CLI diari a les 08:00, idempotent |
| **Staging** | BD addicional (~1 €/mes) / MySQL local / producció | BD addicional o MySQL local; no provar a cegues a producció |
| **Contracte** | Compte del centre / compte personal | Compte del centre; documentar accessos |
| **RGPD** | Text informatiu actual / política + consentiment | Política + consentiment + retenció |
| **Backups** | Només Hetzner / Hetzner + export propi | Tots dos; export abans de migracions |

---

## 12. Rollback i manteniment

### 12.1. Abans de desplegar

- Guardar una còpia del `deploy/` actual (zip) i el commit desplegat.
- Exportar la BD des de phpMyAdmin.
- Anotar els canvis d'esquema i les comandes executades.
- Fer el desplegament fora d'horari lectiu.

### 12.2. Si falla

1. Restaurar el `deploy/` anterior per FTP.
2. Si l'esquema ha canviat, restaurar la BD des de la còpia de phpMyAdmin o konsoleH.
3. Si el domini/DNS ha canviat, tenir en compte el TTL.
4. Comprovar `/api/cataleg`, `/admin.html` i un correu.
5. Documentar la incidència i la causa.

### 12.3. Manteniment

- Revisar els registres de correu i l'error log de PHP.
- Comprovar que el cron s'executa i que no envia duplicats.
- Exportar la BD mensualment.
- Revisar les còpies de Hetzner i fer una restauració de prova.
- Actualitzar la documentació quan canviï el curs, el domini o el correu.

---

## 13. Referències

### Documents del repositori

- [`AGENTS.md`](AGENTS.md) — convencions, proves i flux de Git.
- [`documentacion.md`](documentacion.md) — arquitectura; Part I (PHP/MySQL) i Part II (Apps Script,
  històrica).
- [`desplegament.md`](desplegament.md) — guia actual; conté les inexactituds assenyalades.
- [`README.md`](README.md) — arrencada local.

### Hetzner

- [Webhosting (ES)](https://www.hetzner.com/es/webhosting/)
- [Visió general S/M/L/XL](https://docs.hetzner.com/managed/webhosting/overview/)
- [FAQ de Webhosting](https://docs.hetzner.com/managed/webhosting/webhosting-faq/)
- [MariaDB/MySQL](https://docs.hetzner.com/managed/databases/mariadb-mysql/)
- [Connexió a la BD](https://docs.hetzner.com/managed/databases/general/connection-details-database/)
- [PHP](https://docs.hetzner.com/managed/webserver/php-configuration/)
- [Cron](https://docs.hetzner.com/managed/administration-on-konsoleh/cronmanager/)
- [Correu: configuració i `mail()`](https://docs.hetzner.com/managed/email/set-up-email-account/setting-up-an-email-account/)
- [Registres de correu](https://docs.hetzner.com/managed/email/maillogs-mailsystem/)
- [DKIM/SPF/DMARC](https://docs.hetzner.com/managed/email/email-security/)
- [Backups](https://docs.hetzner.com/managed/administration-on-konsoleh/backup/)
- [Varnish](https://docs.hetzner.com/managed/administration-on-konsoleh/varnish/)
- [SSL gratuït](https://docs.hetzner.com/managed/ssl/ssl-guide/)
- [Fair use](https://docs.hetzner.com/managed/webhosting/fair-use-web-hosting/)
- [Nou webhosting 2025](https://www.hetzner.com/pressroom/new-webhosting-2025/)

---

## Annex A. Plantilla de `config/config.php` per a producció

> Copiar a `public_html/config/config.php`. **No** versionar. Canviar els valors pels de konsoleH.

```php
<?php
// Configuració de producció del CRP. No pujar aquest fitxer al repositori.
return [
    'driver' => 'mysql',

    'mysql' => [
        'host' => 'HOST_DE_KONSOLEH',   // no 'localhost'
        'port' => '3306',               // el que indiqui konsoleH
        'name' => 'NOM_DE_LA_BD',
        'user' => 'USUARI_DE_LA_BD',
        'pass' => 'CONTRASENYA_RW',     // no la principal
        'charset' => 'utf8mb4',
    ],

    'uploads_dir' => __DIR__ . '/../uploads',
    'uploads_url' => '/uploads',

    'correu_crp' => 'crp-martorell@xtec.cat',
    'remitent' => 'no-reply@EL_TEU_DOMINI',
    'mail_transport' => 'mail',

    'entorn' => 'prod',
    'permet_install' => false,
];
```

## Annex B. Comprovacions ràpides

```bash
# Build i paquet
npm run lint
npm test
npm run deploy:prep

# PHP (Git Bash / Linux)
find server -name '*.php' -print0 | xargs -0 -n1 php -l

# Hash de contrasenya
php -r "echo password_hash('la-teva-contrasenya', PASSWORD_DEFAULT), PHP_EOL;"
```

```bash
# Un cop publicat
curl -i https://EL_DOMINI/
curl -i https://EL_DOMINI/admin.html
curl -i https://EL_DOMINI/api/cataleg
curl -i https://EL_DOMINI/api/panell          # 401
curl -i https://EL_DOMINI/config/config.php   # 404
curl -i https://EL_DOMINI/tools/install.php   # 404
curl -i https://EL_DOMINI/api/test/reset      # 404
```

## Annex C. Ordre recomanat de la primera publicació

1. Contractar hosting i domini; esperar DNS.
2. Crear BD i bústia; activar SSL, PHP i DKIM.
3. `npm run deploy:prep`; revisar `deploy/`.
4. Pujar a `public_html`; crear `config.php`; permisos.
5. Importar esquema i torns; crear usuari.
6. Provar catàleg, login, reserva, imatge, CSV i correu.
7. Configurar cron de recordatoris (o deixar-lo manual fins que estigui provat).
8. Exportar BD i guardar el paquet publicat.
9. Actualitzar la documentació amb el que realment s'ha fet.
