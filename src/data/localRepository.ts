import { Material, Reserva, EstatReserva, NotificacioEmail } from '../types/crp';
import { MATERIALS_DEFAULT, RESERVES_DEFAULT, TORNS_PEDAGOGICS_DEFAULT } from './defaultData';
import { CatalegPublic, CrpRepository, NovaReserva, Panell, ResultatRecordatoris } from './CrpRepository';
import { CORREU_CRP } from './contacte';

const clau = (m: string, t: string) => `${m}::${t}`;

/**
 * Implementació en memòria: desenvolupament sense backend i proves unitàries.
 * Reprodueix les regles del servidor PHP (disponibilitat, estats, correus).
 */
export class LocalRepository implements CrpRepository {
  private materials: Material[];
  private reserves: Reserva[];
  private notificacions: NotificacioEmail[] = [];
  private comptador: number;

  constructor(dades?: { materials?: Material[]; reserves?: Reserva[] }) {
    this.materials = structuredClone(dades?.materials ?? MATERIALS_DEFAULT);
    this.reserves = structuredClone(dades?.reserves ?? RESERVES_DEFAULT);
    this.comptador = this.reserves.length;
  }

  async carregarCataleg(): Promise<CatalegPublic> {
    const ocupacio: Record<string, string[]> = {};
    const setmanesOcupades: Record<string, string[]> = {};

    for (const r of this.reserves) {
      if (r.estatReserva !== 'Concedida' && r.estatReserva !== 'Pendent de Validació') continue;
      if (r.tornAssignat) {
        (ocupacio[r.idMaterial] ??= []).push(r.tornAssignat);
      }
      if (r.dataIniciSetmana && r.dataFiSetmana) {
        (setmanesOcupades[r.idMaterial] ??= []).push(`${r.dataIniciSetmana}/${r.dataFiSetmana}`);
      }
    }

    return {
      materials: structuredClone(this.materials),
      torns: structuredClone(TORNS_PEDAGOGICS_DEFAULT),
      ocupacio,
      setmanesOcupades,
    };
  }

  async carregarPanell(): Promise<Panell> {
    return {
      materials: structuredClone(this.materials),
      torns: structuredClone(TORNS_PEDAGOGICS_DEFAULT),
      reserves: structuredClone(this.reserves),
      notificacions: structuredClone(this.notificacions) as Panell['notificacions'],
    };
  }

  private ocupat(idMaterial: string, torn: string): boolean {
    return this.reserves.some(
      r =>
        r.idMaterial === idMaterial &&
        r.tornAssignat === torn &&
        (r.estatReserva === 'Concedida' || r.estatReserva === 'Pendent de Validació')
    );
  }

  async crearReserva(dades: NovaReserva): Promise<Reserva> {
    const material = this.materials.find(m => m.id === dades.idMaterial);
    if (!material) throw new Error('El material no existeix');

    if (dades.tornAssignat && this.ocupat(dades.idMaterial, dades.tornAssignat)) {
      const err = new Error("Aquest torn acaba d'ocupar-se. Tria'n un altre.");
      (err as Error & { codi?: number }).codi = 409;
      throw err;
    }

    const torn = dades.tornAssignat
      ? TORNS_PEDAGOGICS_DEFAULT.find(t => t.id === dades.tornAssignat)
      : undefined;

    this.comptador += 1;
    const idReserva = `RES-${new Date().getFullYear()}-${String(this.comptador).padStart(3, '0')}`;

    const reserva: Reserva = {
      ...dades,
      idReserva,
      estatReserva: 'Pendent de Validació',
      dataCreacio: new Date().toISOString(),
      dataRetornPrevista: torn ? torn.dataFinalISO : dades.dataFiSetmana,
    };

    this.reserves = [reserva, ...this.reserves];
    this.notifica(
      'avis_crp',
      CORREU_CRP,
      `Nova sol·licitud de préstec: ${material.id} - ${dades.centreEducatiu}`,
      `S'ha rebut una nova petició de préstec per a ${material.nom} (${material.id}) de ${dades.nomSollicitant} (${dades.centreEducatiu}).`,
      idReserva,
      dades.correu
    );

    return structuredClone(reserva);
  }

  async validarReserva(id: string, estat: EstatReserva, recollida?: string): Promise<void> {
    const reserva = this.reserves.find(r => r.idReserva === id);
    if (!reserva) throw new Error('La reserva no existeix');

    reserva.estatReserva = estat;
    if (recollida) reserva.dataHoraRecollida = recollida;

    const material = this.materials.find(m => m.id === reserva.idMaterial);
    const nom = material ? `${material.nom} (${material.id})` : reserva.idMaterial;

    if (estat === 'Concedida') {
      this.notifica(
        'aprovacio_usuari',
        reserva.correu,
        'Confirmació de Reserva i Acord de Recollida - CRP',
        `Hola ${reserva.nomSollicitant},\n\nLa teva sol·licitud per a ${nom} ha estat APROVADA.\n\nData de recollida: ${recollida ?? 'a concretar'}.`,
        id
      );
    } else if (estat === 'Denegada') {
      this.notifica(
        'denegacio_usuari',
        reserva.correu,
        'Sol·licitud no disponible - CRP',
        `Hola ${reserva.nomSollicitant},\n\nLa sol·licitud ${id} per a ${nom} no s'ha pogut concedir.`,
        id
      );
    }
  }

  async desarMaterial(material: Material): Promise<void> {
    const i = this.materials.findIndex(m => m.id === material.id);
    if (i >= 0) this.materials[i] = structuredClone(material);
    else this.materials = [structuredClone(material), ...this.materials];
  }

  async eliminarMaterial(id: string): Promise<void> {
    this.materials = this.materials.filter(m => m.id !== id);
  }

  // Sense servidor: retorna una URL temporal del navegador.
  async pujarImatge(fitxer: File): Promise<string> {
    return URL.createObjectURL(fitxer);
  }

  async executarRecordatoris(): Promise<ResultatRecordatoris> {
    const avui = new Date();
    let processades = 0;
    let enviades = 0;

    for (const r of this.reserves) {
      if (r.estatReserva !== 'Concedida' || !r.dataRetornPrevista) continue;
      processades++;
      const dies = Math.ceil(
        (new Date(r.dataRetornPrevista).getTime() - avui.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dies < 0 || dies > 2) continue;

      this.notifica(
        'recordatori_retorn',
        r.correu,
        `Recordatori: finalització del préstec de ${r.idMaterial}`,
        `El préstec ${r.idReserva} finalitza el ${r.dataRetornPrevista}.`,
        r.idReserva
      );
      enviades++;
    }

    return { processades, enviades };
  }

  async exportarCsv(): Promise<string> {
    const files: string[] = ['### PESTANYA 1: MATERIALS ###'];
    files.push('ID_Material,Nom,Tipus,Ambit,URL_Imatge,Descripcio,Contingut_Maleta,URL_Guia_Drive,Model_Prestec,Estat_General');
    for (const m of this.materials) {
      files.push(
        [m.id, m.nom, m.tipus, m.ambit, m.urlImatge, m.descripcio, m.contingutMaleta, m.urlGuiaDrive, m.modelPrestec, m.estatGeneral]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
    }
    files.push('', '### PESTANYA 3: DISPONIBILITAT_I_RESERVES ###');
    files.push('ID_Reserva,ID_Material,Tipus,Torn,Inici,Fi,Nom,Centre,Municipi,Correu,Observacions,Estat,Recollida');
    for (const r of this.reserves) {
      files.push(
        [r.idReserva, r.idMaterial, r.tipus, r.tornAssignat ?? '', r.dataIniciSetmana ?? '', r.dataFiSetmana ?? '', r.nomSollicitant, r.centreEducatiu, r.municipi, r.correu, r.observacions, r.estatReserva, r.dataHoraRecollida ?? '']
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
    }
    return files.join('\r\n');
  }

  private notifica(
    tipus: NotificacioEmail['tipus'],
    destinatari: string,
    assumpte: string,
    cos: string,
    idReserva: string,
    copia: string | null = null
  ) {
    this.notificacions = [
      {
        id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        dataHora: new Date().toISOString(),
        tipus,
        destinatari,
        copia,
        assumpte,
        cos,
        idReserva,
      },
      ...this.notificacions,
    ];
  }
}
