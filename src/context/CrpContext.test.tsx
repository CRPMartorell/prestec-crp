import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reserva } from '../types/crp';
import { renderWithCrp } from '../test/utils';
import { LocalRepository } from '../data/localRepository';
import { MATERIALS_DEFAULT, RESERVES_DEFAULT } from '../data/defaultData';
import { NovaReserva } from '../data/CrpRepository';

const reservaBase: NovaReserva = {
  idMaterial: 'MAT-002',
  tipus: 'Recurs Pedagògic',
  tornAssignat: 'T-03',
  nomSollicitant: 'Marta Soler',
  centreEducatiu: 'Escola El Drac',
  municipi: 'Terrassa',
  correu: 'marta@escolaeldrac.cat',
  observacions: 'Projecte de nanociència a 4t de primària.',
};

const ILLA = { materials: MATERIALS_DEFAULT, reserves: RESERVES_DEFAULT };

describe('CrpContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('carrega les dades per defecte del curs', async () => {
    const { crp } = renderWithCrp(undefined, { repository: new LocalRepository(ILLA) });

    await waitFor(() => expect(crp.materials).toHaveLength(10));
    expect(crp.torns).toHaveLength(6);
    expect(crp.reserves).toHaveLength(5);
    expect(crp.carregant).toBe(false);
  });

  it('crea una reserva pendent, amb codi i data de retorn del torn', async () => {
    const { crp } = renderWithCrp(undefined, { repository: new LocalRepository(ILLA) });
    await waitFor(() => expect(crp.materials).toHaveLength(10));

    let creada: Reserva | undefined;
    await act(async () => {
      creada = await crp.crearReserva(reservaBase);
    });

    expect(creada).toBeDefined();
    expect(creada!.idReserva).toMatch(/^RES-\d{4}-\d{3}$/);
    expect(creada!.estatReserva).toBe('Pendent de Validació');
    expect(creada!.dataRetornPrevista).toBe('2027-02-10');
    expect(crp.reserves[0].idReserva).toBe(creada!.idReserva);
  });

  it('notifica la bústia del CRP en rebre una sol·licitud', async () => {
    const { crp } = renderWithCrp(undefined, { repository: new LocalRepository(ILLA) });
    await waitFor(() => expect(crp.materials).toHaveLength(10));

    await act(async () => {
      await crp.crearReserva(reservaBase);
    });

    const notif = crp.notificacions[0];
    expect(notif.tipus).toBe('avis_crp');
    expect(notif.destinatari).toBe('crp-martorell@xtec.cat');
    expect(notif.copia).toBe('marta@escolaeldrac.cat');
    expect(notif.cos).toContain('Marta Soler');
  });

  it('calcula la disponibilitat per torn ignorant reserves denegades', async () => {
    const { crp } = renderWithCrp(undefined, { repository: new LocalRepository(ILLA) });
    await waitFor(() => expect(crp.reserves).toHaveLength(5));

    expect(crp.getDisponibilitatMaterialTorn('MAT-001', 'T-01').disponible).toBe(false);
    expect(crp.getDisponibilitatMaterialTorn('MAT-001', 'T-02').disponible).toBe(false);
    expect(crp.getDisponibilitatMaterialTorn('MAT-001', 'T-03').disponible).toBe(true);
  });

  it('allibera el torn quan la reserva es denega', async () => {
    const { crp } = renderWithCrp(undefined, { repository: new LocalRepository(ILLA) });
    await waitFor(() => expect(crp.reserves).toHaveLength(5));

    await act(async () => {
      await crp.validarReserva('RES-2026-002', 'Denegada');
    });

    const denegada = crp.reserves.find(r => r.idReserva === 'RES-2026-002');
    expect(denegada!.estatReserva).toBe('Denegada');
    expect(crp.getDisponibilitatMaterialTorn('MAT-001', 'T-02').disponible).toBe(true);
  });

  it('envia el correu de confirmació amb la data i hora de recollida', async () => {
    const { crp } = renderWithCrp(undefined, { repository: new LocalRepository(ILLA) });
    await waitFor(() => expect(crp.reserves).toHaveLength(5));

    await act(async () => {
      await crp.validarReserva('RES-2026-002', 'Concedida', '18/11/2026 a les 10:30 h');
    });

    const reserva = crp.reserves.find(r => r.idReserva === 'RES-2026-002')!;
    expect(reserva.estatReserva).toBe('Concedida');
    expect(reserva.dataHoraRecollida).toBe('18/11/2026 a les 10:30 h');

    const notif = crp.notificacions[0];
    expect(notif.tipus).toBe('aprovacio_usuari');
    expect(notif.destinatari).toBe('jrius@iesbrossa.cat');
    expect(notif.cos).toContain('18/11/2026 a les 10:30 h');
  });

  it('envia el correu de denegació indicant el motiu', async () => {
    const { crp } = renderWithCrp(undefined, { repository: new LocalRepository(ILLA) });
    await waitFor(() => expect(crp.reserves).toHaveLength(5));

    await act(async () => {
      await crp.validarReserva('RES-2026-005', 'Denegada');
    });

    const notif = crp.notificacions[0];
    expect(notif.tipus).toBe('denegacio_usuari');
    expect(notif.destinatari).toBe('nbosch@paucasals.cat');
    expect(notif.cos).toContain("no s'ha pogut concedir");
  });

  it('el trigger diari recorda els retorns que vencen en 2 dies', async () => {
    const dinsDeDosDies = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const repository = new LocalRepository({
      materials: MATERIALS_DEFAULT,
      reserves: [{ ...RESERVES_DEFAULT[0], dataRetornPrevista: dinsDeDosDies }],
    });

    const { crp } = renderWithCrp(undefined, { repository });
    await waitFor(() => expect(crp.reserves).toHaveLength(1));

    let resultat: { processades: number; enviades: number } | undefined;
    await act(async () => {
      resultat = await crp.executarRecordatoris();
    });

    expect(resultat).toEqual({ processades: 1, enviades: 1 });
    const recordatoris = crp.notificacions.filter(n => n.tipus === 'recordatori_retorn');
    expect(recordatoris).toHaveLength(1);
    expect(recordatoris[0].destinatari).toBe('msoler@escolaeldrac.cat');
  });

  it('el trigger diari no envia res si el retorn encara és lluny', async () => {
    const dinsDeVintDies = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
    const repository = new LocalRepository({
      materials: MATERIALS_DEFAULT,
      reserves: [{ ...RESERVES_DEFAULT[0], dataRetornPrevista: dinsDeVintDies }],
    });

    const { crp } = renderWithCrp(undefined, { repository });
    await waitFor(() => expect(crp.reserves).toHaveLength(1));

    let resultat: { processades: number; enviades: number } | undefined;
    await act(async () => {
      resultat = await crp.executarRecordatoris();
    });

    expect(resultat!.enviades).toBe(0);
  });

  it('exporta un CSV amb les dues seccions i les dades del catàleg', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });

    const { crp } = renderWithCrp(undefined, { repository: new LocalRepository(ILLA) });
    await waitFor(() => expect(crp.materials).toHaveLength(10));

    await act(async () => {
      await crp.exportarCsv();
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const blob = createObjectURL.mock.calls[0][0];
    const text = await blob.text();

    expect(text).toContain('### PESTANYA 1: MATERIALS ###');
    expect(text).toContain('### PESTANYA 3: DISPONIBILITAT_I_RESERVES ###');
    expect(text).toContain('MAT-001');
    expect(text).toContain('RES-2026-001');
    expect(text.split('\r\n').filter(l => /^"(MAT|MAQ)-/.test(l))).toHaveLength(10);
  });
});
