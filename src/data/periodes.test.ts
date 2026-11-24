import { describe, expect, it } from 'vitest';
import { calculaDataFi, DIES_PRESTEC_MAQUINARIA, esCapDeSetmana } from './periodes';

describe('període de préstec de la maquinària', () => {
  it('calcula 7 dies exactes des de l’inici', () => {
    expect(DIES_PRESTEC_MAQUINARIA).toBe(7);
    expect(calculaDataFi('2026-11-09')).toBe('2026-11-16'); // dilluns -> dilluns
    expect(calculaDataFi('2026-11-13')).toBe('2026-11-20'); // divendres -> divendres
    expect(calculaDataFi('2026-11-11')).toBe('2026-11-18'); // dimecres -> dimecres
  });

  it('detecta els caps de setmana', () => {
    expect(esCapDeSetmana('2026-11-14')).toBe(true); // dissabte
    expect(esCapDeSetmana('2026-11-15')).toBe(true); // diumenge
    expect(esCapDeSetmana('2026-11-16')).toBe(false); // dilluns
    expect(esCapDeSetmana('2026-11-13')).toBe(false); // divendres
  });

  it('mai no acaba en cap de setmana si comença entre setmana', () => {
    const inici = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
    for (const data of inici) {
      expect(esCapDeSetmana(calculaDataFi(data))).toBe(false);
    }
  });

  it('torna buit si la data no és ISO', () => {
    expect(calculaDataFi('')).toBe('');
    expect(calculaDataFi('13/11/2026')).toBe('');
  });
});
