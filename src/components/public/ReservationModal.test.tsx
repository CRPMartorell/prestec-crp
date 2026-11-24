import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReservationModal } from './ReservationModal';
import { renderWithCrp } from '../../test/utils';
import { MATERIALS_DEFAULT } from '../../data/defaultData';

const omplirFormulari = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText('Ex: Montserrat Soler i Puig'), 'Marta Soler');
  await user.type(
    screen.getByPlaceholderText('Ex: Escola El Pi Gros / Institut Ramon Muntaner'),
    'Escola El Drac'
  );
  await user.type(screen.getByPlaceholderText('Ex: Terrassa, Sabadell, Rubí...'), 'Terrassa');
  await user.type(
    screen.getByPlaceholderText('Ex: nom@xtec.cat o nom@centre.cat'),
    'marta@escolaeldrac.cat'
  );
};

describe('ReservationModal', () => {
  it('valida els camps obligatoris abans d’enviar', async () => {
    const user = userEvent.setup();
    renderWithCrp(<ReservationModal material={MATERIALS_DEFAULT[1]} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Enviar Sol·licitud de Préstec/ }));

    expect(screen.getByText('Cal seleccionar un dels torns disponibles.')).toBeInTheDocument();
    expect(screen.getByText('El nom i cognoms són obligatoris.')).toBeInTheDocument();
    expect(screen.getByText('El nom del centre educatiu és obligatori.')).toBeInTheDocument();
  });

  it('posa el correu de la persona responsable just després del nom', () => {
    renderWithCrp(<ReservationModal material={MATERIALS_DEFAULT[1]} onClose={vi.fn()} />);

    const nom = screen.getByPlaceholderText('Ex: Montserrat Soler i Puig');
    const correu = screen.getByPlaceholderText('Ex: nom@xtec.cat o nom@centre.cat');

    // El correu ha de venir després del nom en l'ordre del document.
    expect(nom.compareDocumentPosition(correu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Correu electrònic de la persona responsable:')).toBeInTheDocument();
  });

  it('crea la reserva i mostra el codi de seguiment', async () => {
    const user = userEvent.setup();
    const { crp } = renderWithCrp(
      <ReservationModal material={MATERIALS_DEFAULT[1]} onClose={vi.fn()} />
    );
    await screen.findByRole('button', { name: /T-03/ });

    await user.click(screen.getByRole('button', { name: /T-03/ }));
    await omplirFormulari(user);
    await user.click(screen.getByRole('button', { name: /Enviar Sol·licitud de Préstec/ }));

    expect(await screen.findByText('Sol·licitud Enregistrada!')).toBeInTheDocument();
    expect(screen.getByText(/RES-\d{4}-\d{3}/)).toBeInTheDocument();
    expect(crp.reserves).toHaveLength(6);
    expect(crp.reserves[0]).toMatchObject({
      idMaterial: 'MAT-002',
      tornAssignat: 'T-03',
      centreEducatiu: 'Escola El Drac',
      estatReserva: 'Pendent de Validació',
    });
  });

  it('no permet reservar un torn ja ocupat', async () => {
    renderWithCrp(<ReservationModal material={MATERIALS_DEFAULT[0]} onClose={vi.fn()} />);

    const tornOcupat = await screen.findByRole('button', { name: /T-01/ });
    expect(tornOcupat).toBeDisabled();
    expect(screen.getByRole('button', { name: /T-03/ })).toBeEnabled();
  });

  it('calcula la data de fi a 7 dies en triar la data d’inici', async () => {
    renderWithCrp(<ReservationModal material={MATERIALS_DEFAULT[6]} onClose={vi.fn()} />);

    const inici = screen.getByLabelText(/Data d'inici/) as HTMLInputElement;
    const fi = screen.getByLabelText(/Data de finalització/) as HTMLInputElement;

    fireEvent.change(inici, { target: { value: '2026-11-09' } }); // dilluns
    expect(fi.value).toBe('2026-11-16'); // dilluns següent
    expect(fi).toHaveAttribute('readonly');

    fireEvent.change(inici, { target: { value: '2026-11-13' } }); // divendres
    expect(fi.value).toBe('2026-11-20');
  });

  it('bloqueja un període que comença en cap de setmana', async () => {
    const user = userEvent.setup();
    renderWithCrp(<ReservationModal material={MATERIALS_DEFAULT[6]} onClose={vi.fn()} />);

    const inici = screen.getByLabelText(/Data d'inici/) as HTMLInputElement;
    fireEvent.change(inici, { target: { value: '2026-11-14' } }); // dissabte
    expect((screen.getByLabelText(/Data de finalització/) as HTMLInputElement).value).toBe('');

    await user.type(screen.getByPlaceholderText('Ex: Montserrat Soler i Puig'), 'Marta Soler');
    await user.type(
      screen.getByPlaceholderText('Ex: Escola El Pi Gros / Institut Ramon Muntaner'),
      'Escola El Drac'
    );
    await user.type(screen.getByPlaceholderText('Ex: Terrassa, Sabadell, Rubí...'), 'Terrassa');
    await user.type(
      screen.getByPlaceholderText('Ex: nom@xtec.cat o nom@centre.cat'),
      'marta@escolaeldrac.cat'
    );
    await user.click(screen.getByRole('button', { name: /Enviar Sol·licitud de Préstec/ }));

    expect(
      await screen.findByText('La data d’inici no pot ser dissabte ni diumenge.')
    ).toBeInTheDocument();
  });
});
