// Munta la carpeta `deploy/` llesta per pujar per FTP a Hetzner:
// el build públic a l'arrel, el panell com a admin.html i el backend PHP
// amb l'estructura plana que espera el document root.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arrel = process.cwd();
const deploy = join(arrel, 'deploy');

function copia(origen, desti) {
  if (!existsSync(origen)) {
    console.error(`✗ No existeix ${origen}`);
    process.exit(1);
  }
  cpSync(origen, desti, { recursive: true });
}

if (!existsSync(join(arrel, 'dist/public/index.html'))) {
  console.error('✗ Falta dist/public. Executa abans: npm run build:public');
  process.exit(1);
}
if (!existsSync(join(arrel, 'dist/private/admin.html'))) {
  console.error('✗ Falta dist/private. Executa abans: npm run build:private');
  process.exit(1);
}

rmSync(deploy, { recursive: true, force: true });
mkdirSync(deploy, { recursive: true });

// 1. Front públic a l'arrel
copia(join(arrel, 'dist/public/index.html'), join(deploy, 'index.html'));
copia(join(arrel, 'dist/public/assets'), join(deploy, 'assets'));

// 2. Panell privat (el JavaScript no conté dades; l'API exigeix sessió)
copia(join(arrel, 'dist/private/admin.html'), join(deploy, 'admin.html'));
for (const fitxer of readdirSync(join(arrel, 'dist/private/assets'))) {
  copia(join(arrel, 'dist/private/assets', fitxer), join(deploy, 'assets', fitxer));
}

// 3. Backend PHP, pla al document root
copia(join(arrel, 'server/public/index.php'), join(deploy, 'index.php'));
copia(join(arrel, 'server/public/.htaccess'), join(deploy, '.htaccess'));

for (const carpeta of ['src', 'sql', 'tools', 'data']) {
  copia(join(arrel, 'server', carpeta), join(deploy, carpeta));
}

mkdirSync(join(deploy, 'config'), { recursive: true });
copia(join(arrel, 'server/config/config.example.php'), join(deploy, 'config', 'config.example.php'));

mkdirSync(join(deploy, 'var'), { recursive: true });
writeFileSync(join(deploy, 'var', '.gitkeep'), '');

// Imatges pujades: carpeta amb protecció perquè ningú hi executi codi.
mkdirSync(join(deploy, 'uploads'), { recursive: true });
copia(join(arrel, 'server/public/uploads/.htaccess'), join(deploy, 'uploads', '.htaccess'));
writeFileSync(join(deploy, 'uploads', '.gitkeep'), '');

console.log('✓ deploy/ llest');
console.log('  index.html + assets/   catàleg públic');
console.log('  admin.html             panell (requereix sessió)');
console.log('  index.php + src/       API PHP');
console.log('  config/config.example.php  copia-ho a config.php i ajusta MySQL');
