import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PublicCatalog } from './PublicCatalog';
import { renderWithCrp } from '../../test/utils';

describe('PublicCatalog', () => {
  it('mostra tot el catàleg públic', async () => {
    renderWithCrp(<PublicCatalog />);

    expect(await screen.findByText("De l'hort a casa")).toBeInTheDocument();
    expect(screen.getByText('Nanokit')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Reservar aquest Material/ })).toHaveLength(10);
  });

  it('filtra pel terme de cerca', async () => {
    const user = userEvent.setup();
    renderWithCrp(<PublicCatalog />);
    await screen.findByText('Nanokit');

    await user.type(screen.getByPlaceholderText(/Cerca per nom/), 'nanokit');

    expect(screen.getByText('Nanokit')).toBeInTheDocument();
    expect(screen.queryByText("De l'hort a casa")).not.toBeInTheDocument();
  });

  it('filtra per tipologia de material', async () => {
    const user = userEvent.setup();
    renderWithCrp(<PublicCatalog />);
    await screen.findByText('Nanokit');

    await user.click(screen.getByRole('button', { name: /Maquinària/ }));

    expect(screen.getAllByRole('button', { name: /Reservar aquest Material/ })).toHaveLength(4);
    expect(screen.queryByText('Nanokit')).not.toBeInTheDocument();
    expect(screen.getByText(/Impressora 3D/)).toBeInTheDocument();
  });

  it('mostra un estat buit quan cap material coincideix', async () => {
    const user = userEvent.setup();
    renderWithCrp(<PublicCatalog />);
    await screen.findByText('Nanokit');

    await user.type(screen.getByPlaceholderText(/Cerca per nom/), 'zzzz');

    expect(screen.getByText('Cap recurs trobat')).toBeInTheDocument();
  });

  it('ofereix només els tres àmbits temàtics', async () => {
    renderWithCrp(<PublicCatalog />);
    await screen.findByText('Nanokit');

    const select = screen.getByRole('combobox');
    const opcions = within(select)
      .getAllByRole('option')
      .map(o => o.textContent);

    expect(opcions).toEqual([
      'Tots els àmbits temàtics',
      'Tècnic i audiovisual',
      'Impuls a la lectura',
      'STEAM',
    ]);
  });

  it('filtra per àmbit temàtic', async () => {
    const user = userEvent.setup();
    renderWithCrp(<PublicCatalog />);
    await screen.findByText('Nanokit');

    await user.selectOptions(screen.getByRole('combobox'), 'Tècnic i audiovisual');
    expect(screen.getAllByRole('button', { name: /Reservar aquest Material/ })).toHaveLength(4);

    await user.selectOptions(screen.getByRole('combobox'), 'Impuls a la lectura');
    expect(screen.getAllByRole('button', { name: /Reservar aquest Material/ })).toHaveLength(1);

    await user.selectOptions(screen.getByRole('combobox'), 'STEAM');
    expect(screen.getAllByRole('button', { name: /Reservar aquest Material/ })).toHaveLength(5);
  });
});
