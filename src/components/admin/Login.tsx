import React, { useState } from 'react';
import { useCrp } from '../../context/CrpContext';
import { BookOpen, Lock, Mail, AlertCircle } from 'lucide-react';

/**
 * Inici de sessió del panell intern. Les credencials es validen al servidor
 * PHP contra la taula `usuaris` (password_hash + sessió).
 */
export const Login: React.FC = () => {
  const { login } = useCrp();
  const [correu, setCorreu] = useState('');
  const [contrasenya, setContrasenya] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviant, setEnviant] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviant) return;

    setEnviant(true);
    setError(null);
    try {
      await login(correu.trim(), contrasenya);
    } catch (err) {
      setError((err as Error).message || 'No s\'ha pogut iniciar sessió');
    } finally {
      setEnviant(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">CRP</p>
            <h1 className="text-lg font-extrabold text-slate-900">Gestió interna</h1>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6">
          Accés restringit al personal del Centre de Recursos Pedagògics.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="correu" className="block text-xs font-semibold text-slate-700 mb-1">
              Correu electrònic
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="correu"
                type="email"
                autoComplete="username"
                required
                value={correu}
                onChange={e => setCorreu(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                placeholder="nom@xtec.cat"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contrasenya" className="block text-xs font-semibold text-slate-700 mb-1">
              Contrasenya
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="contrasenya"
                type="password"
                autoComplete="current-password"
                required
                value={contrasenya}
                onChange={e => setContrasenya(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={enviant}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-colors"
          >
            {enviant ? 'Entrant…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-slate-400 leading-relaxed">
          Les dades de contacte dels sol·licitants només són visibles des d'aquest panell.
        </p>
      </div>
    </div>
  );
};
