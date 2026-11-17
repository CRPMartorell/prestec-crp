// Comprovació ràpida de l'entorn local: npm run doctor
// Diu què hi ha instal·lat, si els ports són lliures i què falta.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { delimiter, join } from 'node:path';

const arrel = process.cwd();

function troba(alPath) {
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    if (!dir) continue;
    for (const nom of process.platform === 'win32' ? [`${alPath}.exe`, `${alPath}.cmd`] : [alPath]) {
      if (existsSync(join(dir, nom))) return join(dir, nom);
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
    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(true);
    });
  });
}

function versio(comanda, args) {
  const r = spawnSync(comanda, args, { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  return (r.stdout || '').split('\n')[0].trim();
}

const php = troba('php');
const npm = troba('npm');
const versioPhp = php ? versio(php, ['-v']) : null;

console.log('Entorn local\n');
console.log('  node  ', process.version, process.execPath);
console.log('  npm   ', npm ?? 'NO TROBAT');
console.log('  php   ', php ? `${php}${versioPhp ? ` (${versioPhp})` : ''}` : 'NO TROBAT');
console.log('  base  ', existsSync(join(arrel, 'server', 'var', 'crp.sqlite')) ? 'server/var/crp.sqlite' : 'encara no creada (es crea amb npm run local)');

const [lliure3000, lliure8080] = await Promise.all([portLliure(3000), portLliure(8080)]);
console.log('  port 3000', lliure3000 ? 'lliure' : 'OCUPAT');
console.log('  port 8080', lliure8080 ? 'lliure' : 'OCUPAT');

console.log('');
if (!php) {
  console.log('✗ Falta PHP. Instal·la\'l i afegeix-lo al PATH.');
} else if (!lliure3000 || !lliure8080) {
  console.log('✗ Hi ha un port ocupat. Tanca el procés que el fa servir i torna-ho a provar.');
} else {
  console.log('✓ Tot a punt. Executa: npm run local');
}
