import React from 'react';
import { useCrp } from '../context/CrpContext';
import { BookOpen, ShieldCheck, Settings, ArrowLeft } from 'lucide-react';

/**
 * Capçalera de l'aplicació privada. Només s'importa des de `AppPrivate`,
 * de manera que aquest codi no arriba mai al bundle públic.
 */
export const PrivateHeader: React.FC = () => {
  const { reserves } = useCrp();
  const pendents = reserves.filter(r => r.estatReserva === 'Pendent de Validació').length;
  const urlPublica = import.meta.env.VITE_PUBLIC_URL || '/';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-150">
                  Centre de Recursos Pedagògics
                </span>
                <span className="hidden sm:inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-150">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Accés restringit
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Gestió Interna del CRP
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              <Settings className="w-3.5 h-3.5" />
              {pendents} pendent{pendents === 1 ? '' : 's'}
            </span>
            <a
              href={urlPublica}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Catàleg públic</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
