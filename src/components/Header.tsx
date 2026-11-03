import React from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';

/**
 * Capçalera del catàleg públic. No hi ha cap accés al panell intern:
 * el panell viu en una aplicació i un desplegament separats.
 */
export const Header: React.FC = () => (
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
                RGPD Actiu
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Préstec de Material Educatiu
            </h1>
          </div>
        </div>
      </div>
    </div>
  </header>
);
