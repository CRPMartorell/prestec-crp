// Arrenca tot el que cal per provar l'aplicació en local:
//   1. comprova que PHP hi sigui i que els ports estiguin lliures
//   2. crea la base SQLite i l'usuari del CRP si encara no existeixen
//   3. aixeca l'API PHP (:8080) i Vite (:3000) i espera que responguin
//
//   npm run local      (o local.cmd a Windows, sense passar per npm)
//
// Ctrl+C atura els dos processos.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { delimiter, join } from 'node:path';

const arrel = process.cwd();
const dbPath = join(arrel, 'server', 'var', 'crp.sqlite');

const ADMIN = {
  correu: process.env.CRP_ADMIN_CORREU || 'crp@example.cat',
  contrasenya: process.env.CRP_ADMIN_CONTRASENYA || 'prova-segura-2026',
  nom: process.env.CRP_ADMIN_NOM || 'Personal del CRP',
};

function surtAmbError(missatge) {
  console.error(`\n✗ ${missatge}\n`);
  process.exit(1);
}

function trobaPhp() {
  const noms = process.platform === 'win32' ? ['php.exe', 'php.cmd', 'php.bat'] : ['php'];
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    if (!dir) continue;
    for (const nom of noms) {
      const candidat = join(dir, nom);
      if (existsSync(candidat)) return candidat;
    }
  }
  return null;
}

function portLliure(port) {
  return new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port }, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(true));
    socket.setTimeout(700, () => {
      socket.destroy();
      resolve(true);
    });
  });
}

function esperaResposta(url, intents = 60) {
  return new Promise(resolve => {
    let restants = intents;
    const prova = async () => {
      try {
        const r = await fetch(url);
        if (r.ok) return resolve(true);
      } catch {
        // encara no escolta
      }
      if (--restants <= 0) return resolve(false);
      setTimeout(prova, 500);
    };
    void prova();
  });
}

const phpBin = trobaPhp();
if (!phpBin) {
  surtAmbError(
    'No trobo PHP al PATH.\n\n' +
      '  Windows: instal·la PHP i afegeix-lo al PATH (per exemple %LOCALAPPDATA%\\Programs\\php)\n' +
      '  macOS:   brew install php\n' +
      '  Linux:   sudo apt install php php-sqlite3'
  );
}

const [lliure3000, lliure8080] = await Promise.all([portLliure(3000), portLliure(8080)]);
if (!lliure3000 || !lliure8080) {
  const ocupat = !lliure3000 ? '3000' : '8080';
  surtAmbError(
    `El port ${ocupat} ja està ocupat.\n\n` +
      '  Tanca el procés que el fa servir (o reinicia la màquina) i torna-ho a provar.\n' +
      '  A Windows:  netstat -ano | findstr :' +
      ocupat
  );
}

if (!existsSync(dbPath)) {
  console.log('· Creant base de dades i dades d\'exemple…');
  const resultat = spawnSync(phpBin, ['server/tools/install.php'], {
    cwd: arrel,
    stdio: 'inherit',
    env: {
      ...process.env,
      CRP_ADMIN_CORREU: ADMIN.correu,
      CRP_ADMIN_CONTRASENYA: ADMIN.contrasenya,
      CRP_ADMIN_NOM: ADMIN.nom,
    },
  });
  if (resultat.status !== 0) {
    surtAmbError('No s\'ha pogut preparar la base de dades. Mira els missatges de dalt.');
  }
} else {
  console.log('· Base de dades local ja preparada (server/var/crp.sqlite)');
}

const fills = [];
let error = false;

function arrenca(etiqueta, comanda, args) {
  const fill = spawn(comanda, args, { cwd: arrel, stdio: 'inherit', env: process.env });
  fill.on('error', err => {
    console.error(`✗ No s'ha pogut arrencar ${etiqueta}: ${err.message}`);
    error = true;
  });
  fill.on('exit', codi => {
    if (codi !== 0 && codi !== null) {
      console.error(`✗ ${etiqueta} ha acabat amb codi ${codi}`);
      error = true;
    }
  });
  fills.push(fill);
  return fill;
}

const api = arrenca('api', phpBin, ['-S', '127.0.0.1:8080', '-t', 'server/public', 'server/public/index.php']);

const viteBin = join(arrel, 'node_modules', 'vite', 'bin', 'vite.js');
if (!existsSync(viteBin)) {
  surtAmbError('No trobo Vite. Executa abans: npm install');
}
const web = arrenca('web', process.execPath, [viteBin, '--port=3000', '--host=127.0.0.1']);

const [apiOk, webOk] = await Promise.all([
  esperaResposta('http://127.0.0.1:8080/api/cataleg'),
  esperaResposta('http://127.0.0.1:3000/'),
]);

if (!apiOk || !webOk) {
  for (const fill of fills) fill.kill();
  surtAmbError(
    `No s'han aixecat els serveis (api: ${apiOk ? 'ok' : 'ko'}, web: ${webOk ? 'ok' : 'ko'}).\n\n` +
      '  Revisa els missatges de dalt. Si a PowerShell et falla npm, prova:\n' +
      '    npm.cmd run local     o bé     local.cmd'
  );
}

console.log('\n  Catàleg   http://127.0.0.1:3000/');
console.log('  Panell    http://127.0.0.1:3000/admin.html');
console.log(`  Accés     ${ADMIN.correu} / ${ADMIN.contrasenya}`);
console.log('\n  Ctrl+C per aturar-ho\n');

let aturant = false;
const atura = (codi = 0) => {
  if (aturant) return;
  aturant = true;
  for (const fill of fills) {
    if (!fill.killed) fill.kill();
  }
  setTimeout(() => process.exit(codi), 300);
};

process.on('SIGINT', () => atura(error ? 1 : 0));
process.on('SIGTERM', () => atura(error ? 1 : 0));

for (const fill of [api, web]) {
  fill.on('exit', () => {
    if (!aturant) atura(error ? 1 : 0);
  });
}
