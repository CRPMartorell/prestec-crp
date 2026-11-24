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
});
