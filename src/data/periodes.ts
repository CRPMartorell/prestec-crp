/**
 * Regles del període de préstec de la maquinària: 7 dies i ni l'inici ni el
 * final poden caure en dissabte o diumenge.
 */
export const DIES_PRESTEC_MAQUINARIA = 7;

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const esDataISO = (valor: string): boolean => DATA_ISO.test(valor);

/** Construeix la data a migdia perquè els canvis d'hora no la moguin de dia. */
const aData = (iso: string): Date => new Date(`${iso}T12:00:00`);

const aISO = (data: Date): string => {
  const any = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${any}-${mes}-${dia}`;
};

export const esCapDeSetmana = (iso: string): boolean => {
  if (!esDataISO(iso)) return false;
  const dia = aData(iso).getDay();
  return dia === 0 || dia === 6;
};

/**
 * Data de finalització = inici + 7 dies. Com que suma una setmana exacta,
 * conserva el dia de la setmana i mai no cau en cap de setmana.
 */
export const calculaDataFi = (inici: string): string => {
  if (!esDataISO(inici)) return '';
  const data = aData(inici);
  data.setDate(data.getDate() + DIES_PRESTEC_MAQUINARIA);
  return aISO(data);
};
