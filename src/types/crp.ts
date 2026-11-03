export type TipusMaterial = 'Recurs Pedagògic' | 'Maquinària i Equipament';

export type ModelPrestec = 'Torns' | 'Setmanes';

export type EstatGeneralMaterial = 'Actiu' | 'En Manteniment' | 'Baixa';

export type EstatReserva = 'Pendent de Validació' | 'Concedida' | 'Denegada' | 'Finalitzada';

export interface Material {
  id: string; // Ex: 'MAT-001', 'MAQ-001'
  nom: string;
  tipus: TipusMaterial;
  ambit: string;
  urlImatge: string;
  descripcio: string;
  contingutMaleta: string;
  urlGuiaDrive: string;
  modelPrestec: ModelPrestec;
  estatGeneral: EstatGeneralMaterial;
}

export interface TornPedagogic {
  id: string; // 'T-01' a 'T-06'
  nom: string; // '1r Torn', '2n Torn', ...
  dataInici: string; // '14/09/2026'
  dataFinal: string; // '23/10/2026'
  dataIniciISO: string; // '2026-09-14'
  dataFinalISO: string; // '2026-10-23'
}

export interface Reserva {
  idReserva: string; // 'RES-2026-001'
  idMaterial: string;
  tipus: TipusMaterial;
  tornAssignat?: string; // 'T-01' a 'T-06' o 'N/A'
  dataIniciSetmana?: string; // 'YYYY-MM-DD'
  dataFiSetmana?: string; // 'YYYY-MM-DD'
  nomSollicitant: string;
  centreEducatiu: string;
  municipi: string;
  correu: string;
  telefon: string;
  observacions: string;
  estatReserva: EstatReserva;
  dataHoraRecollida?: string;
  dataCreacio: string;
  dataRetornPrevista?: string;
}

export interface NotificacioEmail {
  id: string;
  dataHora: string;
  tipus: 'avis_crp' | 'aprovacio_usuari' | 'denegacio_usuari' | 'recordatori_retorn';
  destinatari: string;
  assumpte: string;
  cos: string;
  idReserva: string;
}
