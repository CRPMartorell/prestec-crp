import { screen } from '@testing-library/react';
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
  await user.type(screen.getByPlaceholderText('Ex: 612345678'), '611223344');
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

  it('crea la reserva i mostra el codi de seguiment', async () => {
    const user = userEvent.setup();
    const { crp } = renderWithCrp(
      <ReservationModal material={MATERIALS_DEFAULT[1]} onClose={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: /T-03/ }));
    await omplirFormulari(user);
    await user.click(screen.getByRole('button', { name: /Enviar Sol·licitud de Préstec/ }));

    expect(screen.getByText('Sol·licitud Enregistrada!')).toBeInTheDocument();
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
    const user = userEvent.setup();
    renderWithCrp(<ReservationModal material={MATERIALS_DEFAULT[0]} onClose={vi.fn()} />);

    const tornOcupat = screen.getByRole('button', { name: /T-01/ });
    expect(tornOcupat).toBeDisabled();
    expect(screen.getByRole('button', { name: /T-03/ })).toBeEnabled();
  });
});
