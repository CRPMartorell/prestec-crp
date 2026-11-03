import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  variant?: 'public' | 'private';
}

export const Footer: React.FC<FooterProps> = ({ variant = 'public' }) => (
  <footer className="bg-white border-t border-slate-200 mt-16 py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="font-bold text-slate-800">Préstec de Material CRP</span>
          <span>•</span>
          <span>
            {variant === 'private'
              ? 'Vista privada · accés restringit al personal del CRP'
              : 'Model RGPD de 2 Capes (Pública / Privada)'}
          </span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Consulta Anònima sense Registre
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>Curs Escolar 2026-2027 (6 Torns Oficials)</span>
        </div>
      </div>
    </div>
  </footer>
);
