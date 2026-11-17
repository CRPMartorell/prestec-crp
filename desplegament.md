# Desplegament a Hetzner Webhosting S

Guia per publicar l'aplicació al hosting compartit de Hetzner (Apache + PHP + MySQL). Encara no hi
ha servidor: aquests passos es faran quan el tinguis contractat.

---

## 1. Què cal

- Pla **Webhosting S** (o superior). Inclou PHP, **1 base de dades MySQL** i accés **FTP**.
- Un domini apuntant al hosting (el pots registrar a Hetzner, ~5 €/any).
- Al teu ordinador: `npm run deploy:prep` genera la carpeta `deploy/`.

> No cal SSH ni Composer: el pla S no els ofereix, i l'aplicació no en depèn.

---

## 2. Crear la base de dades

1. Entra a **konsoleH** → *Bases de dades* → *Crear una base de dades MySQL*.
2. Anota: **servidor** (normalment `localhost`), **nom**, **usuari** i **contrasenya**.
   Hetzner crea l'usuari amb permisos sobre aquesta base.

---

## 3. Generar el paquet

```bash
npm run deploy:prep
```

Crea `deploy/` amb:

```
deploy/
├── index.html, assets/        catàleg públic compilat
├── admin.html                 panell (sense dades; l'API exigeix sessió)
├── index.php, .htaccess       entrada i regles d'Apache
├── src/                       codi PHP
├── sql/schema.mysql.sql       estructura
├── sql/seed.mysql.sql         dades d'exemple
├── tools/install.php          alternativa per CLI
├── data/seed.json
├── config/config.example.php
└── var/                       fitxers temporals (buida)
```

---

## 4. Configurar

Copia `deploy/config/config.example.php` a `deploy/config/config.php` i omple:

```php
'driver' => 'mysql',
'mysql' => [
    'host' => 'localhost',
    'port' => '3306',
    'name' => 'el_teu_nom_de_base',
    'user' => 'el_teu_usuari',
    'pass' => 'la_teva_contrasenya',
],
'correu_crp' => 'crp@elnoucentre.cat',
'remitent' => 'no-reply@elnoucentre.cat',
'mail_transport' => 'mail',
'entorn' => 'prod',
'permet_install' => false,
```

---

## 5. Pujar per FTP

Amb FileZilla (o similar), connecta amb les dades FTP de konsoleH i puja **el contingut** de
`deploy/` dins de `public_html` (no la carpeta `deploy` sencera).

Comprova que hi arriben també els fitxers ocults: **`.htaccess`** (si no, no hi haurà ni API ni
seguretat).

---

## 6. Crear l'esquema i les dades

Al **phpMyAdmin** de konsoleH, dins la base de dades:

1. Pestanya *Importar* → `sql/schema.mysql.sql`.
2. Pestanya *Importar* → `sql/seed.mysql.sql` (dades d'exemple; no cal en producció real, però ajuda
   a comprovar que tot funciona).
3. Crear l'usuari del CRP. Genera el hash al teu ordinador:

   ```bash
   php -r "echo password_hash('la-teva-contrasenya', PASSWORD_DEFAULT), PHP_EOL;"
   ```

   I executa a phpMyAdmin:

   ```sql
   INSERT INTO usuaris (correu, nom, hash, actiu, creat)
   VALUES ('crp@elnoucentre.cat', 'Personal del CRP', '$2y$10$...', 1, NOW());
   ```

---

## 7. Comprovar

| Què | Resultat esperat |
| --- | --- |
| `https://elteudomini.cat/` | catàleg amb els 10 materials |
| `https://elteudomini.cat/admin.html` | pantalla d'inici de sessió |
| `https://elteudomini.cat/api/cataleg` | JSON amb `materials` i `torns` |
| `https://elteudomini.cat/api/panell` | **401** (sense sessió) |
| Login amb l'usuari creat | panell amb les reserves |

Si `/api/cataleg` dona error 500, revisa `config/config.php` i que l'esquema s'hagi importat.

---

## 8. Actualitzacions

1. `npm run deploy:prep`
2. Puja de nou `index.html`, `admin.html`, `assets/` i, si ha canviat, `src/`.
3. **No** tornis a pujar `config/config.php` (trepitjaries la configuració).
4. Si hi ha canvis d'esquema, aplica'ls a mà a phpMyAdmin.

---

## 9. Detalls que estalvien problemes

- **`tools/`** només serveix per crear dades des de línia de comandes. En producció es pot esborrar:
  les carpetes internes ja estan bloquejades per `.htaccess`.
- **`var/`** ha de tenir permisos d'escriptura (`775`) si algun dia tornes a SQLite o vols el log de
  correus.
- **Correu**: `mail_transport = mail` fa servir `mail()` del hosting. El remitent ha de ser del
  domini, o els filtres antispam el rebutjaran.
- **HTTPS**: activa'l a konsoleH (Let's Encrypt gratuït). El `Secure` de la cookie de sessió
  s'activa sol quan la petició arriba per HTTPS.
- **Còpies**: el pla S no inclou backups automàtics; fes una exportació periòdica des de phpMyAdmin.
