import React from 'react';
import { useCrp } from '../context/CrpContext';
import { BookOpen, ShieldCheck, Settings, Users, Sparkles, Bell } from 'lucide-react';

export const Header: React.FC = () => {
  const { activeView, setActiveView, notificacions, reserves } = useCrp();

  const pendents = reserves.filter(r => r.estatReserva === 'Pendent de Validació').length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Title */}
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
                  RGPD Actiu
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Préstec de Material Educatiu
              </h1>
            </div>
          </div>

          {/* Navigation / Mode Switcher */}
          <div className="flex items-center space-x-3">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
              <button
                onClick={() => setActiveView('public')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeView === 'public'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Catàleg Públic</span>
                <span className="sm:hidden">Públic</span>
              </button>

              <button
                onClick={() => setActiveView('crp-admin')}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeView === 'crp-admin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Gestió Interna CRP</span>
                <span className="sm:hidden">Gestió</span>
                {pendents > 0 && (
                  <span className={`px-1.5 py-0.2 text-xs font-bold rounded-full ${
                    activeView === 'crp-admin' ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white'
                  }`}>
                    {pendents}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
