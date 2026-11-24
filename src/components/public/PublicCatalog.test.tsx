import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PublicCatalog } from './PublicCatalog';
import { renderWithCrp } from '../../test/utils';

describe('PublicCatalog', () => {
  it('mostra el títol i el text de presentació del CRP', async () => {
    renderWithCrp(<PublicCatalog />);

    expect(
      await screen.findByRole('heading', {
        name: 'Catàleg de Préstec de Recursos Pedagògics Baix Llobregat VII',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Els centres educatius i el professorat podeu consultar la disponibilitat dels recursos\./)
    ).toBeInTheDocument();
  });

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

  it('deixa fer una segona sol·licitud després de tancar la confirmació', async () => {
    const user = userEvent.setup();
    renderWithCrp(<PublicCatalog />);
    await screen.findByText('Nanokit');

    // Primera sol·licitud
    await user.type(screen.getByPlaceholderText(/Cerca per nom/), 'Nanokit');
    await user.click(screen.getByRole('button', { name: /Reservar aquest Material/ }));
    await screen.findByRole('button', { name: /T-03/ });
    await user.click(screen.getByRole('button', { name: /T-03/ }));
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
    await screen.findByText('Sol·licitud Enregistrada!');
    await user.click(screen.getByRole('button', { name: /Tancar i tornar al catàleg/ }));

    // Segona sol·licitud: el formulari ha de tornar a aparèixer net
    await user.clear(screen.getByPlaceholderText(/Cerca per nom/));
    await user.type(screen.getByPlaceholderText(/Cerca per nom/), 'Bee-Bot');
    await user.click(screen.getByRole('button', { name: /Reservar aquest Material/ }));

    expect(
      await screen.findByRole('button', { name: /Enviar Sol·licitud de Préstec/ })
    ).toBeInTheDocument();
    expect(screen.queryByText('Sol·licitud Enregistrada!')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Montserrat Soler i Puig')).toHaveValue('');
  });
});
