/**
 * Àmbits temàtics del catàleg. Són una llista tancada: el desplegable del
 * catàleg i el formulari d'inventari només ofereixen aquestes categories.
 */
export const AMBIITS = ['Tècnic i audiovisual', 'Impuls a la lectura', 'STEAM'] as const;

export type Ambit = (typeof AMBIITS)[number];

export const esAmbit = (valor: string): valor is Ambit =>
  (AMBIITS as readonly string[]).includes(valor);
