import React, { useState, useMemo } from 'react';
import { useCrp } from '../../context/CrpContext';
import { Material } from '../../types/crp';
import { MaterialCard } from './MaterialCard';
import { ReservationModal } from './ReservationModal';
import { Search, Filter, Box, Wrench, Shield, Calendar, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';

export const PublicCatalog: React.FC = () => {
  const { materials, torns, getDisponibilitatMaterialTorn } = useCrp();
  const [cerca, setCerca] = useState('');
  const [filtreTipus, setFiltreTipus] = useState<string>('tots');
  const [filtreAmbit, setFiltreAmbit] = useState<string>('tots');
  const [nomésDisponibles, setNomésDisponibles] = useState(false);
  const [materialPerReservar, setMaterialPerReservar] = useState<Material | null>(null);

  // Extract unique ambits
  const ambits = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => set.add(m.ambit));
    return Array.from(set).sort();
  }, [materials]);

  // Filter materials
  const materialsFiltrats = useMemo(() => {
    return materials.filter(m => {
      // Search term
      if (cerca.trim()) {
        const query = cerca.toLowerCase();
        const matchName = m.nom.toLowerCase().includes(query);
        const matchId = m.id.toLowerCase().includes(query);
        const matchDesc = m.descripcio.toLowerCase().includes(query);
        const matchContingut = m.contingutMaleta.toLowerCase().includes(query);
        const matchAmbit = m.ambit.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchDesc && !matchContingut && !matchAmbit) {
          return false;
        }
      }

      // Filter by type
      if (filtreTipus !== 'tots' && m.tipus !== filtreTipus) {
        return false;
      }

      // Filter by ambit
      if (filtreAmbit !== 'tots' && m.ambit !== filtreAmbit) {
        return false;
      }

      // Filter by availability
      if (nomésDisponibles) {
        if (m.estatGeneral !== 'Actiu') return false;
        if (m.modelPrestec === 'Torns') {
          const hasFreeTurn = torns.some(t => getDisponibilitatMaterialTorn(m.id, t.id).disponible);
          if (!hasFreeTurn) return false;
        }
      }

      return true;
    });
  }, [materials, cerca, filtreTipus, filtreAmbit, nomésDisponibles, torns, getDisponibilitatMaterialTorn]);

  const resetFilters = () => {
    setCerca('');
    setFiltreTipus('tots');
    setFiltreAmbit('tots');
    setNomésDisponibles(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Informative Banner / Hero */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-white/10">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Accés Lliure sense Registre • Privadesa RGPD Garantida</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Catàleg de Préstec de Recursos Pedagògics i Maquinària
          </h2>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6">
            Els centres educatius i el professorat podeu consultar la disponibilitat dels recursos de manera anònima. 
            Les maletes pedagògiques es presten en <strong>6 torns escolars</strong> prefixats i l'equipament tecnològic per <strong>setmanes</strong> puntuals.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <span className="font-bold block text-white text-sm mb-0.5">📦 1. Tria el recurs</span>
              <span className="text-slate-300">Consulta descripció, contingut de la maleta i guia a Google Drive.</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <span className="font-bold block text-white text-sm mb-0.5">🗓️ 2. Comprova torns</span>
              <span className="text-slate-300">Visualitza en verd els torns o setmanes lliures en temps real.</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <span className="font-bold block text-white text-sm mb-0.5">✉️ 3. Sol·licita online</span>
              <span className="text-slate-300">Envia el formulari i acorda la data de recollida amb el CRP.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Search Input */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per nom, maleta, àmbit o codi (ex: Nanokit, MAT-001)..."
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
            />
            {cerca && (
              <button
                onClick={() => setCerca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Esborrar
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-4 flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setFiltreTipus('tots')}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                filtreTipus === 'tots'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tots ({materials.length})
            </button>
            <button
              onClick={() => setFiltreTipus('Recurs Pedagògic')}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
                filtreTipus === 'Recurs Pedagògic'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Recursos Pedagògics</span>
            </button>
            <button
              onClick={() => setFiltreTipus('Maquinària i Equipament')}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
                filtreTipus === 'Maquinària i Equipament'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Maquinària</span>
            </button>
          </div>

          {/* Ambit select & Only Available checkbox */}
          <div className="lg:col-span-3 flex items-center gap-3">
            <div className="w-full">
              <select
                value={filtreAmbit}
                onChange={(e) => setFiltreAmbit(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="tots">Tots els àmbits temàtics</option>
                {ambits.map(ambit => (
                  <option key={ambit} value={ambit}>{ambit}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Second row: Quick checkbox for only available */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={nomésDisponibles}
              onChange={(e) => setNomésDisponibles(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span>Mostrar només materials amb torns o dates lliures</span>
          </label>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              S'han trobat <strong>{materialsFiltrats.length}</strong> materials
            </span>
            {(cerca || filtreTipus !== 'tots' || filtreAmbit !== 'tots' || nomésDisponibles) && (
              <button
                onClick={resetFilters}
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restablir filtres</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Materials */}
      {materialsFiltrats.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materialsFiltrats.map(material => (
            <MaterialCard
              key={material.id}
              material={material}
              onReservar={(m) => setMaterialPerReservar(m)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Cap recurs trobat</h3>
          <p className="text-xs text-slate-500 mb-5">
            No hi ha cap material que coincideixi amb els criteris de cerca i filtres seleccionats.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Netejar tots els filtres
          </button>
        </div>
      )}

      {/* Reservation Modal */}
      <ReservationModal
        material={materialPerReservar}
        onClose={() => setMaterialPerReservar(null)}
      />
    </div>
  );
};
