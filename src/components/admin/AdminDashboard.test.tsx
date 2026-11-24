import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboard } from './AdminDashboard';
import { renderWithCrp } from '../../test/utils';

describe('AdminDashboard · inventari', () => {
  beforeEach(() => {
    // jsdom no implementa createObjectURL.
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:imatge-de-prova'),
    });
  });

  it('aconsella mida i format i deixa pujar una imatge', async () => {
    const user = userEvent.setup();
    renderWithCrp(<AdminDashboard />);

    await user.click(await screen.findByRole('button', { name: /Inventari de Materials/ }));
    await user.click(screen.getByRole('button', { name: /Afegir Nou Material/ }));

    expect(screen.getByText(/JPG, PNG o WebP/)).toBeInTheDocument();
    expect(screen.getByText(/màxim 3 MB/)).toBeInTheDocument();
    expect(screen.getByText(/1200 × 800 px/)).toBeInTheDocument();

    const camp = screen.getByLabelText(/Imatge de portada/);
    await user.upload(camp, new File(['contingut'], 'foto.png', { type: 'image/png' }));

    expect(await screen.findByDisplayValue('blob:imatge-de-prova')).toBeInTheDocument();
  });

  it('desa el material amb la imatge pujada', async () => {
    const user = userEvent.setup();
    const { crp } = renderWithCrp(<AdminDashboard />);

    await user.click(await screen.findByRole('button', { name: /Inventari de Materials/ }));
    await user.click(screen.getByRole('button', { name: /Afegir Nou Material/ }));

    await user.upload(
      screen.getByLabelText(/Imatge de portada/),
      new File(['contingut'], 'foto.png', { type: 'image/png' })
    );
    await user.type(
      screen.getByPlaceholderText('Ex: Maleta de Robòtica Bee-Bot'),
      'Material amb imatge'
    );
    const [descripcio, contingut] = Array.from(
      document.querySelectorAll('form textarea')
    ) as HTMLTextAreaElement[];
    await user.type(descripcio, 'Descripció');
    await user.type(contingut, 'Contingut');

    await user.click(screen.getByRole('button', { name: /Guardar Material/ }));

    const desat = crp.materials.find(m => m.nom === 'Material amb imatge');
    expect(desat?.urlImatge).toBe('blob:imatge-de-prova');
  });
});
