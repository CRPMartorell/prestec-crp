import React, { useState } from 'react';
import { Material } from '../../types/crp';
import { useCrp } from '../../context/CrpContext';
import { FileText, Calendar, Box, ExternalLink, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp, Wrench, Sparkles } from 'lucide-react';

interface MaterialCardProps {
  material: Material;
  onReservar: (material: Material) => void;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({ material, onReservar }) => {
  const { torns, reserves, getDisponibilitatMaterialTorn } = useCrp();
  const [showContent, setShowContent] = useState(false);

  const isPedagogic = material.modelPrestec === 'Torns';

  // Count availability
  let tornsDisponibles = 0;
  if (isPedagogic) {
    torns.forEach(t => {
      const { disponible } = getDisponibilitatMaterialTorn(material.id, t.id);
      if (disponible) tornsDisponibles++;
    });
  }

  // Check upcoming weeks if machinery
  const machineryBookings = !isPedagogic
    ? reserves.filter(r => r.idMaterial === material.id && (r.estatReserva === 'Concedida' || r.estatReserva === 'Pendent de Validació'))
    : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group">
      {/* Cover Image */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
        <img
          src={material.urlImatge}
          alt={material.nom}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // fallback image if external url fails
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/95 text-slate-800 shadow-xs backdrop-blur-xs flex items-center gap-1">
            {isPedagogic ? <Box className="w-3.5 h-3.5 text-indigo-600" /> : <Wrench className="w-3.5 h-3.5 text-amber-600" />}
            {material.tipus}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg shadow-xs backdrop-blur-xs ${
            material.estatGeneral === 'Actiu'
              ? 'bg-emerald-600/90 text-white'
              : 'bg-amber-600/90 text-white'
          }`}>
            {material.estatGeneral}
          </span>
        </div>

        <div className="absolute bottom-2 left-3 right-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-900/75 text-slate-100 backdrop-blur-xs">
            {material.ambit}
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
              {material.nom}
            </h3>
            <span className="text-xs font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {material.id}
            </span>
          </div>

          <p className="text-slate-600 text-sm line-clamp-2 mb-3">
            {material.descripcio}
          </p>

          {/* Toggleable Maleta / Equipment Contents */}
          <div className="mb-3.5">
            <button
              onClick={() => setShowContent(!showContent)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <span>{showContent ? 'Amagar detall del contingut' : 'Veure contingut de la maleta'}</span>
              {showContent ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showContent && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1">
                  <Box className="w-3.5 h-3.5 text-indigo-600" />
                  Elements inclosos a la maleta:
                </p>
                {material.contingutMaleta}
              </div>
            )}
          </div>

          {/* Link to Google Drive Guide / PDF */}
          <div className="mb-4">
            <a
              href={material.urlGuiaDrive}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Dossier Pedagògic / Guia (Drive)</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Section: Anonymous Availability Strip */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {isPedagogic ? 'Disponibilitat per Torns:' : 'Reserva per Setmanes:'}
            </span>
            <span className={`font-medium ${
              isPedagogic
                ? (tornsDisponibles > 0 ? 'text-emerald-700' : 'text-rose-700')
                : 'text-indigo-700'
            }`}>
              {isPedagogic
                ? `${tornsDisponibles} de ${torns.length} torns lliures`
                : `${machineryBookings.length} períodes reservats`}
            </span>
          </div>

          {/* Torns Visual Bar */}
          {isPedagogic ? (
            <div className="grid grid-cols-6 gap-1 mb-4">
              {torns.map(torn => {
                const { disponible } = getDisponibilitatMaterialTorn(material.id, torn.id);
                return (
                  <div
                    key={torn.id}
                    title={`${torn.nom} (${torn.dataInici} - ${torn.dataFinal}): ${disponible ? '🟢 Lliure' : '🔴 Ocupat (RGPD: reserva anònima)'}`}
                    className={`py-1.5 px-1 rounded text-center text-[10px] font-bold transition-transform hover:scale-105 cursor-help ${
                      disponible
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <div>{torn.id}</div>
                    <div className="text-[9px] font-normal leading-tight opacity-80">
                      {disponible ? 'Lliure' : 'Ocupat'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-600 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Préstec setmanal de Dilluns a Divendres</span>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">Setmanes naturals</span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => onReservar(material)}
            disabled={material.estatGeneral !== 'Actiu' || (isPedagogic && tornsDisponibles === 0)}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              material.estatGeneral !== 'Actiu' || (isPedagogic && tornsDisponibles === 0)
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>
              {material.estatGeneral !== 'Actiu'
                ? 'Material no disponible'
                : (isPedagogic && tornsDisponibles === 0)
                  ? 'Tots els torns ocupats'
                  : 'Reservar aquest Material'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
