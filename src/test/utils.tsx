import React from 'react';
import { render } from '@testing-library/react';
import { CrpProvider, useCrp } from '../context/CrpContext';

export type CrpApi = ReturnType<typeof useCrp>;

/**
 * Renderitza un component dins del CrpProvider i retorna una vista de l'API
 * del context que sempre llegeix l'estat més recent (encara que es
 * desestructuri el resultat).
 */
export function renderWithCrp(ui?: React.ReactNode) {
  const ref: { current: CrpApi | null } = { current: null };

  const Probe: React.FC = () => {
    ref.current = useCrp();
    return null;
  };

  const result = render(
    <CrpProvider>
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
