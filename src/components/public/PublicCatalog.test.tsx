import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PublicCatalog } from './PublicCatalog';
import { renderWithCrp } from '../../test/utils';

describe('PublicCatalog', () => {
  it('mostra tot el catàleg públic', () => {
    renderWithCrp(<PublicCatalog />);

    expect(screen.getByText("De l'hort a casa")).toBeInTheDocument();
    expect(screen.getByText('Nanokit')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Reservar aquest Material/ })).toHaveLength(10);
  });

  it('filtra pel terme de cerca', async () => {
    const user = userEvent.setup();
    renderWithCrp(<PublicCatalog />);

    await user.type(screen.getByPlaceholderText(/Cerca per nom/), 'nanokit');

    expect(screen.getByText('Nanokit')).toBeInTheDocument();
    expect(screen.queryByText("De l'hort a casa")).not.toBeInTheDocument();
  });

  it('filtra per tipologia de material', async () => {
    const user = userEvent.setup();
    renderWithCrp(<PublicCatalog />);

    await user.click(screen.getByRole('button', { name: /Maquinària/ }));

    expect(screen.getAllByRole('button', { name: /Reservar aquest Material/ })).toHaveLength(4);
    expect(screen.queryByText('Nanokit')).not.toBeInTheDocument();
    expect(screen.getByText(/Impressora 3D/)).toBeInTheDocument();
  });

  it("mostra un estat buit quan cap material coincideix", async () => {
    const user = userEvent.setup();
    renderWithCrp(<PublicCatalog />);

    await user.type(screen.getByPlaceholderText(/Cerca per nom/), 'zzzz');

    expect(screen.getByText('Cap recurs trobat')).toBeInTheDocument();
  });
});
