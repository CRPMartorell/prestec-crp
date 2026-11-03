import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reserva } from '../types/crp';
import { renderWithCrp } from '../test/utils';

type NovaReserva = Omit<Reserva, 'idReserva' | 'estatReserva' | 'dataCreacio'>;

const reservaBase: NovaReserva = {
  idMaterial: 'MAT-002',
  tipus: 'Recurs Pedagògic',
  tornAssignat: 'T-03',
  nomSollicitant: 'Marta Soler',
  centreEducatiu: 'Escola El Drac',
  municipi: 'Terrassa',
  correu: 'marta@escolaeldrac.cat',
  telefon: '611223344',
  observacions: 'Projecte de nanociència a 4t de primària.',
};

describe('CrpContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('carrega les dades per defecte del curs', () => {
    const { crp } = renderWithCrp();

    expect(crp.materials).toHaveLength(10);
    expect(crp.torns).toHaveLength(6);
    expect(crp.reserves).toHaveLength(5);
    expect(crp.activeView).toBe('public');
  });

  it('crea una reserva pendent, amb codi i data de retorn del torn', () => {
    const { crp } = renderWithCrp();
    let creada: Reserva | undefined;

    act(() => {
      creada = crp.crearReserva(reservaBase);
    });

    expect(creada).toBeDefined();
    expect(creada!.idReserva).toMatch(/^RES-\d{4}-\d{3}$/);
    expect(creada!.estatReserva).toBe('Pendent de Validació');
    expect(creada!.dataRetornPrevista).toBe('2027-02-10');
    expect(crp.reserves[0].idReserva).toBe(creada!.idReserva);
  });

  it('notifica la bústia del CRP en rebre una sol·licitud', () => {
    const { crp } = renderWithCrp();

    act(() => {
      crp.crearReserva(reservaBase);
    });

    const notif = crp.notificacions[0];
    expect(notif.tipus).toBe('avis_crp');
    expect(notif.destinatari).toBe('crp@centre-recursos.cat');
    expect(notif.cos).toContain('Marta Soler');
    expect(notif.cos).toContain('T-03');
  });

  it('calcula la disponibilitat per torn ignorant reserves denegades', () => {
    const { crp } = renderWithCrp();

    // RES-2026-001 (MAT-001, T-01) està concedida i RES-2026-002 (MAT-001, T-02) pendent
    expect(crp.getDisponibilitatMaterialTorn('MAT-001', 'T-01').disponible).toBe(false);
    expect(crp.getDisponibilitatMaterialTorn('MAT-001', 'T-02').disponible).toBe(false);
    expect(crp.getDisponibilitatMaterialTorn('MAT-001', 'T-03').disponible).toBe(true);
  });

  it('allibera el torn quan la reserva es denega', () => {
    const { crp } = renderWithCrp();
    let denegada: Reserva | undefined;

    act(() => {
      crp.validarReserva('RES-2026-002', 'Denegada');
    });

    denegada = crp.reserves.find(r => r.idReserva === 'RES-2026-002');
    expect(denegada!.estatReserva).toBe('Denegada');
    expect(crp.getDisponibilitatMaterialTorn('MAT-001', 'T-02').disponible).toBe(true);
  });

  it('envia el correu de confirmació amb la data i hora de recollida', () => {
    const { crp } = renderWithCrp();

    act(() => {
      crp.validarReserva('RES-2026-002', 'Concedida', '18/11/2026 a les 10:30 h');
    });

    const reserva = crp.reserves.find(r => r.idReserva === 'RES-2026-002')!;
    expect(reserva.estatReserva).toBe('Concedida');
    expect(reserva.dataHoraRecollida).toBe('18/11/2026 a les 10:30 h');

    const notif = crp.notificacions[0];
    expect(notif.tipus).toBe('aprovacio_usuari');
    expect(notif.destinatari).toBe('jrius@iesbrossa.cat');
    expect(notif.cos).toContain('18/11/2026 a les 10:30 h');
    expect(notif.cos).toContain('APROVADA');
  });

  it('envia el correu de denegació indicant el motiu', () => {
    const { crp } = renderWithCrp();

    act(() => {
      crp.validarReserva('RES-2026-005', 'Denegada');
    });

    const notif = crp.notificacions[0];
    expect(notif.tipus).toBe('denegacio_usuari');
    expect(notif.destinatari).toBe('nbosch@paucasals.cat');
    expect(notif.cos).toContain("no s'ha pogut concedir");
  });

  it('el trigger diari recorda els retorns que vencen en 2 dies', () => {
    // RES-2026-001 i RES-2026-003 retornen el 23/10/2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T10:00:00'));

    const { crp } = renderWithCrp();
    let resultat: { processades: number; notificacionsEnviades: number } | undefined;

    act(() => {
      resultat = crp.executarTriggerRecordatoriDiari();
    });

    expect(resultat).toEqual({ processades: 3, notificacionsEnviades: 2 });
    const recordatoris = crp.notificacions.filter(n => n.tipus === 'recordatori_retorn');
    expect(recordatoris).toHaveLength(2);
    expect(recordatoris.map(n => n.destinatari).sort()).toEqual([
      'cpons@escolanova.cat',
      'msoler@escolaeldrac.cat',
    ]);
  });

  it('el trigger diari no envia res si el retorn encara és lluny', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T10:00:00'));

    const { crp } = renderWithCrp();
    let resultat: { processades: number; notificacionsEnviades: number } | undefined;

    act(() => {
      resultat = crp.executarTriggerRecordatoriDiari();
    });

    expect(resultat!.notificacionsEnviades).toBe(0);
  });

  it('exporta un CSV amb les dues seccions i les dades del catàleg', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // jsdom no implementa aquestes APIs de descàrrega
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });

    const { crp } = renderWithCrp();

    act(() => {
      crp.exportarCSVSheets();
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const blob = createObjectURL.mock.calls[0][0];
    const text = await blob.text();

    expect(text).toContain('### PESTANYA 1: MATERIALS ###');
    expect(text).toContain('### PESTANYA 3: DISPONIBILITAT_I_RESERVES ###');
    expect(text).toContain('MAT-001');
    expect(text).toContain('RES-2026-001');
    expect(text.split('\n').filter(l => /^"(MAT|MAQ)-/.test(l))).toHaveLength(10);
  });

  it('restableix les dades per defecte', () => {
    const { crp } = renderWithCrp();

    act(() => {
      crp.crearReserva(reservaBase);
      crp.restablirDadesPerDefecte();
    });

    expect(crp.reserves).toHaveLength(5);
    expect(crp.notificacions).toHaveLength(0);
  });
});
