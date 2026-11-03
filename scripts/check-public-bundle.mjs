// Comprova que el build public no contingui cap rastre del panell intern.
// S'executa despres de `npm run build:public` (local i a la CI).
//
// Nota: no es busca "Panell de Gestió" perque aquest text apareix legitimament
// al cos del correu que genera una reserva (CrpContext), que en produccio
// passara a generar-se al servidor.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/public/assets';

const prohibits = [
  'Gestió Interna',
  'Aprovar i Notificar',
  'Inventari de Materials',
  'Estructura Google Sheets',
  'Executar Trigger',
  'Registre de Notificacions',
  'Torns Pedagògics',
];

const fitxers = readdirSync(dir).filter(f => f.endsWith('.js'));
let errors = 0;

for (const fitxer of fitxers) {
  const contingut = readFileSync(join(dir, fitxer), 'utf8');
  for (const paraula of prohibits) {
    if (contingut.includes(paraula)) {
      console.error(`✗ ${fitxer} conte "${paraula}"`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\nEl build public inclou codi del panell intern (${errors} coincidencies).`);
  process.exit(1);
}

console.log(`✓ El bundle public (${fitxers.length} fitxers) no conte codi del panell intern.`);
