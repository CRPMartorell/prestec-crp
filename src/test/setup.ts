import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cada test arrenca amb el localStorage net perquè el CrpProvider
// torni a carregar les dades per defecte.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
