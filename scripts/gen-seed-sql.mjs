// Genera server/sql/seed.mysql.sql a partir de server/data/seed.json, per poder
// importar les dades d'exemple amb phpMyAdmin (Hetzner no dona SSH).
import { readFileSync, writeFileSync } from 'node:fs';

const seed = JSON.parse(readFileSync('server/data/seed.json', 'utf8'));

const esc = v => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`);

const linies = ['-- Generat per scripts/gen-seed-sql.mjs', 'SET NAMES utf8mb4;', ''];

for (const m of seed.materials) {
  linies.push(
    `INSERT INTO materials (id, nom, tipus, ambit, url_imatge, descripcio, contingut, url_guia, model_prestec, estat_general) VALUES (${[
      m.id, m.nom, m.tipus, m.ambit, m.urlImatge, m.descripcio, m.contingutMaleta, m.urlGuiaDrive, m.modelPrestec, m.estatGeneral,
    ].map(esc).join(', ')});`
  );
}

for (const t of seed.torns) {
  linies.push(
    `INSERT INTO torns (id, nom, data_inici, data_final, data_inici_iso, data_final_iso) VALUES (${[
      t.id, t.nom, t.dataInici, t.dataFinal, t.dataIniciISO, t.dataFinalISO,
    ].map(esc).join(', ')});`
  );
}

for (const r of seed.reserves) {
  linies.push(
    `INSERT INTO reserves (id_reserva, id_material, tipus, torn_assignat, data_inici_setmana, data_fi_setmana, nom_sollicitant, centre, municipi, correu, telefon, observacions, estat, data_hora_recollida, data_creacio, data_retorn) VALUES (${[
      r.idReserva, r.idMaterial, r.tipus, r.tornAssignat ?? null, r.dataIniciSetmana ?? null, r.dataFiSetmana ?? null,
      r.nomSollicitant, r.centreEducatiu, r.municipi, r.correu, r.telefon, r.observacions ?? '', r.estatReserva,
      r.dataHoraRecollida ?? null, r.dataCreacio, r.dataRetornPrevista ?? null,
    ].map(esc).join(', ')});`
  );
}

linies.push("INSERT INTO config (clau, valor) VALUES ('reserva_counter', '5');", '');

writeFileSync('server/sql/seed.mysql.sql', linies.join('\n'));
console.log(`✓ server/sql/seed.mysql.sql (${linies.length} línies)`);
