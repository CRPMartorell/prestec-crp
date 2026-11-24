import { Material, EstatReserva } from '../types/crp';
import {
  CatalegPublic,
  CrpRepository,
  ErrorApi,
  NovaReserva,
  Panell,
  ResultatRecordatoris,
} from './CrpRepository';

interface RespostaApi<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface Sessio {
  autenticat: boolean;
  correu: string | null;
  nom: string | null;
  csrf: string;
}

/**
 * Implementació HTTP contra el backend PHP. Mateix origen (el proxy de Vite
 * en desenvolupament, l'Apache del hosting en producció).
 */
export class HttpRepository implements CrpRepository {
  private csrf: string | null = null;

  constructor(private readonly base: string = '') {}

  private async peticio<T>(ruta: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    };

    const metode = (init.method ?? 'GET').toUpperCase();
    if (metode !== 'GET' && this.csrf) {
      headers['X-CSRF'] = this.csrf;
    }

    let resposta: Response;
    try {
      resposta = await fetch(this.base + ruta, { credentials: 'include', ...init, headers });
    } catch {
      throw new ErrorApi('No hi ha connexió amb el servidor del CRP', 0);
    }

    if (resposta.status === 204) {
      return undefined as T;
    }

    const text = await resposta.text();
    let json: RespostaApi<T> | null = null;
    try {
      json = text ? (JSON.parse(text) as RespostaApi<T>) : null;
    } catch {
      throw new ErrorApi('Resposta no vàlida del servidor', resposta.status);
    }

    if (!resposta.ok || !json || json.ok === false) {
      throw new ErrorApi(json?.error ?? 'Error del servidor', resposta.status);
    }

    return json.data as T;
  }

  async sessio(): Promise<Sessio> {
    const s = await this.peticio<Sessio>('/api/sessio');
    this.csrf = s.csrf;
    return s;
  }

  async login(correu: string, contrasenya: string): Promise<void> {
    const s = await this.peticio<{ correu: string; csrf: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ correu, contrasenya }),
    });
    this.csrf = s.csrf;
  }

  async logout(): Promise<void> {
    await this.peticio<boolean>('/api/logout', { method: 'POST' });
    this.csrf = null;
  }

  async sessioActual(): Promise<{ autenticat: boolean; correu: string | null }> {
    const s = await this.sessio();
    return { autenticat: s.autenticat, correu: s.correu };
  }

  carregarCataleg(): Promise<CatalegPublic> {
    return this.peticio<CatalegPublic>('/api/cataleg');
  }

  carregarPanell(): Promise<Panell> {
    return this.peticio<Panell>('/api/panell');
  }

  crearReserva(dades: NovaReserva) {
    return this.peticio<import('../types/crp').Reserva>('/api/reserves', {
      method: 'POST',
      body: JSON.stringify(dades),
    });
  }

  async validarReserva(id: string, estat: EstatReserva, recollida?: string): Promise<void> {
    await this.peticio<boolean>(`/api/reserves/${encodeURIComponent(id)}/validar`, {
      method: 'POST',
      body: JSON.stringify({ estat, dataHoraRecollida: recollida ?? null }),
    });
  }

  async desarMaterial(material: Material): Promise<void> {
    await this.peticio<Material>('/api/materials', {
      method: 'POST',
      body: JSON.stringify(material),
    });
  }

  async eliminarMaterial(id: string): Promise<void> {
    await this.peticio<boolean>(`/api/materials/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async pujarImatge(fitxer: File): Promise<string> {
    const dades = new FormData();
    dades.append('imatge', fitxer);

    const resposta = await fetch(this.base + '/api/materials/imatge', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF': this.csrf ?? '' },
      body: dades,
    });

    const json = (await resposta.json().catch(() => null)) as
      | { ok: boolean; data?: { url: string }; error?: string }
      | null;

    if (!resposta.ok || !json?.ok || !json.data) {
      throw new ErrorApi(json?.error ?? "No s'ha pogut pujar la imatge", resposta.status);
    }

    return json.data.url;
  }

  executarRecordatoris(): Promise<ResultatRecordatoris> {
    return this.peticio<ResultatRecordatoris>('/api/recordatoris', { method: 'POST' });
  }

  async exportarCsv(): Promise<string> {
    const resposta = await fetch(this.base + '/api/export.csv', { credentials: 'include' });
    if (!resposta.ok) {
      throw new ErrorApi("No s'ha pogut exportar el CSV", resposta.status);
    }
    return resposta.text();
  }
}
