import React, { useState } from 'react';
import { Material, TornPedagogic } from '../../types/crp';
import { useCrp } from '../../context/CrpContext';
import { X, Calendar, User, School, MapPin, Mail, Phone, MessageSquare, CheckCircle, Shield, AlertCircle, ArrowRight } from 'lucide-react';

interface ReservationModalProps {
  material: Material | null;
  onClose: () => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({ material, onClose }) => {
  const { torns, reserves, getDisponibilitatMaterialTorn, crearReserva } = useCrp();

  const [tornSeleccionat, setTornSeleccionat] = useState<string>('');
  const [dataIniciSetmana, setDataIniciSetmana] = useState<string>('');
  const [dataFiSetmana, setDataFiSetmana] = useState<string>('');

  const [nomSollicitant, setNomSollicitant] = useState('');
  const [centreEducatiu, setCentreEducatiu] = useState('');
  const [municipi, setMunicipi] = useState('');
  const [correu, setCorreu] = useState('');
  const [telefon, setTelefon] = useState('');
  const [observacions, setObservacions] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reservaConfirmada, setReservaConfirmada] = useState<{ idReserva: string } | null>(null);

  if (!material) return null;

  const isPedagogic = material.modelPrestec === 'Torns';

  const validate = () => {
    const errs: Record<string, string> = {};

    if (isPedagogic) {
      if (!tornSeleccionat) {
        errs.torn = 'Cal seleccionar un dels torns disponibles.';
      } else {
        const { disponible } = getDisponibilitatMaterialTorn(material.id, tornSeleccionat);
        if (!disponible) {
          errs.torn = 'Aquest torn ja està reservat. Si us plau, tria un altre torn.';
        }
      }
    } else {
      if (!dataIniciSetmana) {
        errs.dataInici = 'Indica la data d’inici (dilluns).';
      }
      if (!dataFiSetmana) {
        errs.dataFi = 'Indica la data de finalització (divendres).';
      }
      if (dataIniciSetmana && dataFiSetmana && new Date(dataIniciSetmana) > new Date(dataFiSetmana)) {
        errs.dates = 'La data d’inici ha de ser anterior a la data de finalització.';
      }
    }

    if (!nomSollicitant.trim()) errs.nom = 'El nom i cognoms són obligatoris.';
    if (!centreEducatiu.trim()) errs.centre = 'El nom del centre educatiu és obligatori.';
    if (!municipi.trim()) errs.municipi = 'El municipi és obligatori.';
    if (!correu.trim() || !correu.includes('@')) errs.correu = 'Cal un correu electrònic vàlid.';
    if (!telefon.trim() || telefon.length < 9) errs.telefon = 'Cal un número de telèfon de contacte vàlid.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const nova = crearReserva({
      idMaterial: material.id,
      tipus: material.tipus,
      tornAssignat: isPedagogic ? tornSeleccionat : undefined,
      dataIniciSetmana: !isPedagogic ? dataIniciSetmana : undefined,
      dataFiSetmana: !isPedagogic ? dataFiSetmana : undefined,
      nomSollicitant,
      centreEducatiu,
      municipi,
      correu,
      telefon,
      observacions,
    });

    setReservaConfirmada({ idReserva: nova.idReserva });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {material.id}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {material.tipus}
              </span>
            </div>
            <h2 className="text-xl font-bold">{material.nom}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {reservaConfirmada ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Sol·licitud Enregistrada!</h3>
              <p className="text-sm font-semibold text-indigo-700 bg-indigo-50 inline-block px-3 py-1.5 rounded-lg border border-indigo-200 mb-4 font-mono">
                Codi de Reserva: {reservaConfirmada.idReserva}
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-sm text-slate-700 mb-6 space-y-2">
                <p className="font-semibold text-slate-900">Següents passos segons el protocol del CRP:</p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-150 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>S'ha enviat una notificació automàtica a la bústia oficial del CRP (<code>crp@centre-recursos.cat</code>).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-150 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>El personal tècnic del CRP validarà la reserva i t'enviarà un correu amb l'acord de recollida a <strong>{correu}</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-150 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Rebràs un recordatori automàtic 2 dies abans de la devolució per comprovar tot el material.</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors"
              >
                Tancar i tornar al catàleg
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Select Period */}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  1. Període de Préstec Desitjat
                </h4>

                {isPedagogic ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-3">
                      Els recursos pedagògics es presten per torns oficials tancats. Selecciona el torn disponible pel teu projecte:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {torns.map(t => {
                        const { disponible } = getDisponibilitatMaterialTorn(material.id, t.id);
                        const isSelected = tornSeleccionat === t.id;

                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={!disponible}
                            onClick={() => setTornSeleccionat(t.id)}
                            className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between ${
                              !disponible
                                ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed text-slate-400'
                                : isSelected
                                ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/30'
                                : 'bg-white border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {t.id}
                                </span>
                                <span className="font-bold text-sm text-slate-900">{t.nom}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                {t.dataInici} - {t.dataFinal}
                              </div>
                            </div>
                            <div>
                              {disponible ? (
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Lliure
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  Ocupat
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {errors.torn && (
                      <p className="text-xs text-rose-600 mt-2 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.torn}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-500 mb-3">
                      La maquinària es reserva per setmanes naturals (de dilluns a divendres segons necessitat).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Data d'inici (Dilluns):
                        </label>
                        <input
                          type="date"
                          value={dataIniciSetmana}
                          onChange={(e) => setDataIniciSetmana(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Data de finalització (Divendres):
                        </label>
                        <input
                          type="date"
                          value={dataFiSetmana}
                          onChange={(e) => setDataFiSetmana(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                        />
                      </div>
                    </div>
                    {errors.dates && (
                      <p className="text-xs text-rose-600 mt-2 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.dates}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Teacher & School Contact Form */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  2. Dades de Contacte del Sol·licitant
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom i Cognoms del docent:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Montserrat Soler i Puig"
                      value={nomSollicitant}
                      onChange={(e) => setNomSollicitant(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                        errors.nom ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    />
                    {errors.nom && <p className="text-xs text-rose-600 mt-1">{errors.nom}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Centre Educatiu:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Escola El Pi Gros / Institut Ramon Muntaner"
                      value={centreEducatiu}
                      onChange={(e) => setCentreEducatiu(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                        errors.centre ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    />
                    {errors.centre && <p className="text-xs text-rose-600 mt-1">{errors.centre}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Municipi del Centre:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Terrassa, Sabadell, Rubí..."
                      value={municipi}
                      onChange={(e) => setMunicipi(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                        errors.municipi ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    />
                    {errors.municipi && <p className="text-xs text-rose-600 mt-1">{errors.municipi}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Correu electrònic:
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: nom@xtec.cat o nom@centre.cat"
                      value={correu}
                      onChange={(e) => setCorreu(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                        errors.correu ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    />
                    {errors.correu && <p className="text-xs text-rose-600 mt-1">{errors.correu}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Telèfon de contacte:
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: 612345678"
                      value={telefon}
                      onChange={(e) => setTelefon(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                        errors.telefon ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    />
                    {errors.telefon && <p className="text-xs text-rose-600 mt-1">{errors.telefon}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Observacions o necessitats pedagògiques (opcional):
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Indica el nivell educatiu, cicle o detalls específics..."
                      value={observacions}
                      onChange={(e) => setObservacions(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* RGPD Disclaimer */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Privadesa RGPD:</strong> Les teves dades personals queden allotjades exclusivament a la base de dades interna del CRP per gestionar la sol·licitud. En cap cas es publiquen ni es comparteixen al catàleg públic.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                >
                  <span>Enviar Sol·licitud de Préstec</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
