import React from 'react';
import { CrpProvider, useCrp } from './context/CrpContext';
import { PrivateHeader } from './components/PrivateHeader';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Login } from './components/admin/Login';
import { HttpRepository } from './data/httpRepository';

const repository = new HttpRepository();

const PrivateShell: React.FC = () => {
  const { autenticat, carregant } = useCrp();

  if (carregant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Carregant el panell…</p>
      </div>
    );
  }

  if (!autenticat) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PrivateHeader />
      <main className="flex-1">
        <AdminDashboard />
      </main>
      <Footer variant="private" />
    </div>
  );
};

/**
 * Aplicació privada: panell de gestió amb sessió. Es publica en un desplegament
 * separat (o darrere d'autenticació) i mai dins del bundle públic.
 */
export default function AppPrivate() {
  return (
    <CrpProvider repository={repository} mode="private">
      <PrivateShell />
    </CrpProvider>
  );
}
