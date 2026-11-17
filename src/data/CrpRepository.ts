import { Material, Reserva, TornPedagogic, NotificacioEmail, EstatReserva } from '../types/crp';

/** Resposta del catàleg públic: mai conté dades personals. */
export interface CatalegPublic {
  materials: Material[];
  torns: TornPedagogic[];
  /** { 'MAT-001': ['T-01','T-02'] } */
  ocupacio: Record<string, string[]>;
  /** { 'MAQ-001': ['2026-10-05/2026-10-09'] } */
  setmanesOcupades: Record<string, string[]>;
}

export interface Panell {
  materials: Material[];
  torns: TornPedagogic[];
  reserves: Reserva[];
  notificacions: NotificacioEmail[];
}

export type NovaReserva = Omit<Reserva, 'idReserva' | 'estatReserva' | 'dataCreacio'>;

export interface ResultatRecordatoris {
  processades: number;
  enviades: number;
}

/**
 * Contracte únic de dades. Les tres implementacions (local, pública i privada)
 * han de retornar les mateixes formes.
 */
export interface CrpRepository {
  carregarCataleg(): Promise<CatalegPublic>;
  carregarPanell(): Promise<Panell>;
  crearReserva(dades: NovaReserva): Promise<Reserva>;
  validarReserva(id: string, estat: EstatReserva, recollida?: string): Promise<void>;
  desarMaterial(material: Material): Promise<void>;
  eliminarMaterial(id: string): Promise<void>;
  executarRecordatoris(): Promise<ResultatRecordatoris>;
  exportarCsv(): Promise<string>;

  // Opcionals: només els repositoris amb sessió (HTTP) els implementen.
  login?(correu: string, contrasenya: string): Promise<void>;
  logout?(): Promise<void>;
  sessioActual?(): Promise<{ autenticat: boolean; correu: string | null }>;
}

/** Error amb codi HTTP per poder distingir conflictes (409) d'altres errors. */
export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly codi: number = 0
  ) {
    super(message);
    this.name = 'ErrorApi';
  }
}
