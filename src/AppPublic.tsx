import React from 'react';
import { CrpProvider } from './context/CrpContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PublicCatalog } from './components/public/PublicCatalog';

/**
 * Aplicació pública: només catàleg i formulari de reserva.
 * No importa cap component del panell intern, de manera que el bundle
 * publicat no conté ni una línia del codi de gestió.
 */
export default function AppPublic() {
  return (
    <CrpProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <Header />
        <main className="flex-1">
          <PublicCatalog />
        </main>
        <Footer variant="public" />
      </div>
    </CrpProvider>
  );
}
