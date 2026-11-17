import React from 'react';
import { render } from '@testing-library/react';
import { CrpProvider, useCrp } from '../context/CrpContext';
import { CrpRepository } from '../data/CrpRepository';
import { LocalRepository } from '../data/localRepository';

export type CrpApi = ReturnType<typeof useCrp>;

interface OpcionsRender {
  repository?: CrpRepository;
  mode?: 'public' | 'private';
}

/**
 * Renderitza un component dins del CrpProvider amb un repositori local i
 * retorna una vista sempre actualitzada de l'API del context.
 */
export function renderWithCrp(ui?: React.ReactNode, opcions: OpcionsRender = {}) {
  const repository = opcions.repository ?? new LocalRepository();
  const mode = opcions.mode ?? 'private';
  const ref: { current: CrpApi | null } = { current: null };

  const Probe: React.FC = () => {
    ref.current = useCrp();
    return null;
  };

  const result = render(
    <CrpProvider repository={repository} mode={mode}>
      {ui}
      <Probe />
    </CrpProvider>
  );

  const crp = new Proxy({} as CrpApi, {
    get(_target, prop) {
      if (!ref.current) {
        throw new Error('El context CRP encara no està disponible');
      }
      return Reflect.get(ref.current, prop);
    },
  });

  return { ...result, crp };
}
