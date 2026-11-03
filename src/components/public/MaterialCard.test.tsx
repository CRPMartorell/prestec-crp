import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MaterialCard } from './MaterialCard';
import { renderWithCrp } from '../../test/utils';
import { MATERIALS_DEFAULT } from '../../data/defaultData';

describe('MaterialCard', () => {
  it('resumeix la disponibilitat dels 6 torns', () => {
    renderWithCrp(<MaterialCard material={MATERIALS_DEFAULT[0]} onReservar={vi.fn()} />);

    // MAT-001 té T-01 (concedit) i T-02 (pendent) ocupats
    expect(screen.getByText('4 de 6 torns lliures')).toBeInTheDocument();
  });

  it('desplega el contingut de la maleta', async () => {
    const user = userEvent.setup();
    renderWithCrp(<MaterialCard material={MATERIALS_DEFAULT[0]} onReservar={vi.fn()} />);

    expect(screen.queryByText(/Elements inclosos a la maleta/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Veure contingut de la maleta/ }));

    expect(screen.getByText(/Elements inclosos a la maleta/)).toBeInTheDocument();
    expect(screen.getByText(/5 guies docents de camp/)).toBeInTheDocument();
  });

  it('bloqueja la reserva si el material no està actiu', () => {
    renderWithCrp(
      <MaterialCard
        material={{ ...MATERIALS_DEFAULT[0], estatGeneral: 'En Manteniment' }}
        onReservar={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Material no disponible/ })).toBeDisabled();
  });

  it('notifica el pare quan es prem reservar', async () => {
    const user = userEvent.setup();
    const onReservar = vi.fn();
    renderWithCrp(<MaterialCard material={MATERIALS_DEFAULT[1]} onReservar={onReservar} />);

    await user.click(screen.getByRole('button', { name: /Reservar aquest Material/ }));

    expect(onReservar).toHaveBeenCalledWith(MATERIALS_DEFAULT[1]);
  });
});
