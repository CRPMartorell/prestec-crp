import React from 'react';
import { CrpProvider, useCrp } from './context/CrpContext';
import { Header } from './components/Header';
import { PublicCatalog } from './components/public/PublicCatalog';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ShieldCheck, BookOpen, FileSpreadsheet, ExternalLink, Heart } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeView, setActiveView } = useCrp();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header />

      <main className="flex-1">
        {activeView === 'public' ? <PublicCatalog /> : <AdminDashboard />}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Préstec de Material CRP</span>
              <span>•</span>
              <span>Model RGPD de 2 Capes (Pública / Privada)</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Consulta Anònima sense Registre
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveView(activeView === 'public' ? 'crp-admin' : 'public')}
                className="hover:text-indigo-600 transition-colors font-medium underline"
              >
                {activeView === 'public' ? 'Accedir a la Gestió Interna CRP' : 'Tornar al Catàleg Públic'}
              </button>
              <span>•</span>
              <span>Curs Escolar 2026-2027 (6 Torns Oficials)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <CrpProvider>
      <MainContent />
    </CrpProvider>
  );
}
