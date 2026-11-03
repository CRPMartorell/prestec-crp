import React from 'react';
import { CrpProvider } from './context/CrpContext';
import { PrivateHeader } from './components/PrivateHeader';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/admin/AdminDashboard';

/**
 * Aplicació privada. Es desplega en un entorn separat i amb autenticació
 * (vegeu documentacion.md): mai dins del bundle públic.
 */
export default function AppPrivate() {
  return (
    <CrpProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <PrivateHeader />
        <main className="flex-1">
          <AdminDashboard />
        </main>
        <Footer variant="private" />
      </div>
    </CrpProvider>
  );
}
