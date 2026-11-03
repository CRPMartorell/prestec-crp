import React, { useState } from 'react';
import { useCrp } from '../../context/CrpContext';
import { Reserva, Material, EstatReserva } from '../../types/crp';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Layers,
  FileSpreadsheet,
  Mail,
  Send,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Play,
  RotateCcw,
  Download,
  Copy,
  Check,
  Building,
  User,
  Phone,
  MessageSquare
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    reserves,
    materials,
    torns,
    notificacions,
    validarReserva,
    afegirMaterial,
    actualitzarMaterial,
    eliminarMaterial,
    executarTriggerRecordatoriDiari,
    esborrarNotificacions,
    restablirDadesPerDefecte,
    exportarCSVSheets,
  } = useCrp();

  const [activeTab, setActiveTab] = useState<'reserves' | 'materials' | 'torns' | 'automations' | 'sheets'>('reserves');
  const [filtreEstat, setFiltreEstat] = useState<string>('tots');
  const [cercaReserva, setCercaReserva] = useState<string>('');

  // Modal for approving reservation with pickup date/time
  const [reservaPerValidar, setReservaPerValidar] = useState<Reserva | null>(null);
  const [dataHoraRecollidaInput, setDataHoraRecollidaInput] = useState<string>('');

  // Modal for adding / editing material
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isNewMaterial, setIsNewMaterial] = useState(false);

  // Trigger feedback
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  // Filtered reservations
  const reservesFiltrades = reserves.filter(r => {
    if (filtreEstat !== 'tots' && r.estatReserva !== filtreEstat) return false;
    if (cercaReserva.trim()) {
      const q = cercaReserva.toLowerCase();
      const matchId = r.idReserva.toLowerCase().includes(q);
      const matchMat = r.idMaterial.toLowerCase().includes(q);
      const matchNom = r.nomSollicitant.toLowerCase().includes(q);
      const matchCentre = r.centreEducatiu.toLowerCase().includes(q);
      const matchMunicipi = r.municipi.toLowerCase().includes(q);
      if (!matchId && !matchMat && !matchNom && !matchCentre && !matchMunicipi) return false;
    }
    return true;
  });

  const handleOpenValidate = (r: Reserva) => {
    setReservaPerValidar(r);
    setDataHoraRecollidaInput(r.dataHoraRecollida || 'Dilluns vinent de 09:30 a 13:00 h');
  };

  const handleConfirmValidation = (estat: EstatReserva) => {
    if (!reservaPerValidar) return;
    validarReserva(reservaPerValidar.idReserva, estat, dataHoraRecollidaInput);
    setReservaPerValidar(null);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    if (isNewMaterial) {
      afegirMaterial(editingMaterial);
    } else {
      actualitzarMaterial(editingMaterial);
    }
    setEditingMaterial(null);
  };

  const handleRunDailyTrigger = () => {
    const res = executarTriggerRecordatoriDiari();
    setTriggerResult(
      `Trigger executat: S'han revisat ${res.processades} reserves actives i s'han enviat ${res.notificacionsEnviades} recordatoris de devolució (2 dies abans).`
    );
    setTimeout(() => setTriggerResult(null), 6000);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2500);
  };

  // Google Apps Script source codes as specified in doc sections 6.1, 6.2, 6.3
  const script1 = `/**
 * S'executa quan un usuari envia el formulari de sol·licitud.
 * Envia una notificació immediata a la bústia del CRP.
 */
function enEnviarSollicitud(e) {
  var bustiaCRP = "crp@centre-recursos.cat"; // Canviar pel correu real del CRP
  var respostes = e.values;
  
  var idMaterial = respostes[2];
  var nomUsuari = respostes[3] + " " + respostes[4];
  var centre = respostes[5];
  var periode = respostes[9];
  var observacions = respostes[10] || "Cap";
  
  var assumpte = "📥 Nova Sol·licitud de Préstec: " + idMaterial + " - " + centre;
  var cos = "S'ha rebut una nova petició de préstec:\\n\\n" +
            "• Material: " + idMaterial + "\\n" +
            "• Sol·licitant: " + nomUsuari + "\\n" +
            "• Centre Educatiu: " + centre + "\\n" +
            "• Període/Torn sol·licitat: " + periode + "\\n" +
            "• Observacions: " + observacions + "\\n\\n" +
            "Accedeix al full de càlcul per revisar i validar aquesta reserva.";
            
  MailApp.sendEmail(bustiaCRP, assumpte, cos);
}`;

  const script2 = `/**
 * S'executa quan el personal del CRP canvia l'estat a 'Concedida' a la pestanya 'Disponibilitat_i_Reserves'.
 */
function alEditarValidacio(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Disponibilitat_i_Reserves") return;
  
  var fila = e.range.getRow();
  var columna = e.range.getColumn();
  
  // Columna M (13) correspon a Estat_Reserva
  if (columna === 13 && e.value === "Concedida") {
    var emailUsuari = sheet.getRange(fila, 10).getValue(); // Columna J
    var nomUsuari = sheet.getRange(fila, 7).getValue();    // Columna G
    var idMaterial = sheet.getRange(fila, 2).getValue();   // Columna B
    var dataRecollida = sheet.getRange(fila, 14).getValue(); // Columna N
    
    var assumpte = "✅ Confirmació de Reserva i Acord de Recollida - CRP";
    var cos = "Hola " + nomUsuari + ",\\n\\n" +
              "La teva sol·licitud de préstec per al material (" + idMaterial + ") ha estat APROVADA.\\n\\n" +
              "• Data i hora prevista de recollida: " + (dataRecollida ? dataRecollida : "A concretar amb el CRP") + "\\n\\n" +
              "Si necessites proposar un altre horari de recollida, respon directament a aquest correu.\\n\\n" +
              "Atentament,\\nEquip del Centre de Recursos Pedagògics";
              
    MailApp.sendEmail(emailUsuari, assumpte, cos);
  }
}`;

  const script3 = `/**
 * Funció programada (Trigger diari) per enviar un correu de recordatori 2 dies abans de la devolució.
 */
function enviarRecordatoriDevolucio() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Disponibilitat_i_Reserves");
  var dades = sheet.getDataRange().getValues();
  var avui = new Date();
  
  for (var i = 1; i < dades.length; i++) {
    var estat = dades[i][12]; // Columna M (Estat_Reserva)
    var dataFi = new Date(dades[i][5]); // Columna F (Data_Fi_Setmana o Data Fi de Torn)
    var emailUsuari = dades[i][9]; // Columna J
    var nomUsuari = dades[i][6]; // Columna G
    var idMaterial = dades[i][1]; // Columna B
    
    if (estat === "Concedida" && dataFi) {
      var diesRestants = Math.ceil((dataFi - avui) / (1000 * 60 * 60 * 24));
      
      if (diesRestants === 2) {
        var assumpte = "⏰ Recordatori: Finalització del préstec de " + idMaterial;
        var cos = "Hola " + nomUsuari + ",\\n\\n" +
                  "Et recordem que el préstec del material " + idMaterial + 
                  " finalitza d'aquí a 2 dies (Data límit de devolució: " + dataFi.toLocaleDateString() + ").\\n\\n" +
                  "Si us plau, assegura't de tenir tot el contingut a punt per al retorn al CRP.\\n\\n" +
                  "Moltes gràcies per la teva col·laboració.";
                  
        MailApp.sendEmail(emailUsuari, assumpte, cos);
      }
    }
  }
}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Notice Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 mb-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
              🔒 Vista Privada CRP
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Model RGPD: Dades de contacte només visibles aquí
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Panell de Gestió del Personal del CRP</h2>
          <p className="text-sm text-slate-300 mt-1">
            Administració centralitzada de reserves, validació amb acord de recollida, control d'inventari i automatitzacions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportarCSVSheets}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV (Google Sheets)</span>
          </button>

          <button
            onClick={restablirDadesPerDefecte}
            title="Restablir dades inicials"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('reserves')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === 'reserves'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Sol·licituds i Reserves ({reserves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === 'materials'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Inventari de Materials ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('torns')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === 'torns'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Torns Pedagògics (6)</span>
        </button>

        <button
          onClick={() => setActiveTab('automations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === 'automations'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Automatitzacions & Correu ({notificacions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === 'sheets'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Estructura Google Sheets</span>
        </button>
      </div>

      {/* TAB 1: RESERVES I SOL·LICITUDS */}
      {activeTab === 'reserves' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {['tots', 'Pendent de Validació', 'Concedida', 'Finalitzada', 'Denegada'].map(st => (
                <button
                  key={st}
                  onClick={() => setFiltreEstat(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                    filtreEstat === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'tots' ? 'Totes' : st}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Cerca per docent, centre, municipi, ID..."
                value={cercaReserva}
                onChange={(e) => setCercaReserva(e.target.value)}
                className="w-full sm:w-72 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50"
              />
            </div>
          </div>

          {/* Table of Reservations */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">ID / Data</th>
                    <th className="p-3.5">Material</th>
                    <th className="p-3.5">Període Sol·licitat</th>
                    <th className="p-3.5">Docent & Centre (RGPD Intern)</th>
                    <th className="p-3.5">Estat Reserva</th>
                    <th className="p-3.5">Acord de Recollida</th>
                    <th className="p-3.5 text-right">Accions CRP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservesFiltrades.length > 0 ? (
                    reservesFiltrades.map(reserva => {
                      const mat = materials.find(m => m.id === reserva.idMaterial);
                      const isPending = reserva.estatReserva === 'Pendent de Validació';
                      const isGranted = reserva.estatReserva === 'Concedida';

                      return (
                        <tr key={reserva.idReserva} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-indigo-700">{reserva.idReserva}</span>
                            <div className="text-[10px] text-slate-400">
                              {new Date(reserva.dataCreacio).toLocaleDateString('ca-ES')}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{mat?.nom || reserva.idMaterial}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{reserva.idMaterial} • {reserva.tipus}</div>
                          </td>
                          <td className="p-3.5">
                            {reserva.tornAssignat ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                <Calendar className="w-3 h-3" />
                                {torns.find(t => t.id === reserva.tornAssignat)?.nom || reserva.tornAssignat}
                              </span>
                            ) : (
                              <div className="font-mono text-slate-700">
                                {reserva.dataIniciSetmana} ➜ {reserva.dataFiSetmana}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-900 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {reserva.nomSollicitant}
                            </div>
                            <div className="text-slate-600 flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3 text-slate-400" />
                              {reserva.centreEducatiu} ({reserva.municipi})
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              ✉️ {reserva.correu} • 📞 {reserva.telefon}
                            </div>
                            {reserva.observacions && (
                              <div className="mt-1 text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                                "{reserva.observacions}"
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                              reserva.estatReserva === 'Concedida'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : reserva.estatReserva === 'Pendent de Validació'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : reserva.estatReserva === 'Finalitzada'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {reserva.estatReserva === 'Concedida' && <CheckCircle2 className="w-3 h-3" />}
                              {reserva.estatReserva === 'Pendent de Validació' && <Clock className="w-3 h-3" />}
                              {reserva.estatReserva}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {reserva.dataHoraRecollida ? (
                              <span className="text-slate-800 font-medium bg-slate-100 px-2 py-1 rounded text-[11px]">
                                {reserva.dataHoraRecollida}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Pendent d'acord</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleOpenValidate(reserva)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 transition-colors"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Aprovar</span>
                                  </button>
                                  <button
                                    onClick={() => validarReserva(reserva.idReserva, 'Denegada')}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold transition-colors"
                                  >
                                    Denegar
                                  </button>
                                </>
                              )}

                              {isGranted && (
                                <button
                                  onClick={() => validarReserva(reserva.idReserva, 'Finalitzada')}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold transition-colors"
                                >
                                  Retornat / Finalitzar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No hi ha cap reserva que compleixi els criteris de cerca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTARI DE MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Pestanya 1 de la base de dades (<code>Materials</code>). Pots editar o afegir nous materials al catàleg del CRP.
            </p>
            <button
              onClick={() => {
                setIsNewMaterial(true);
                setEditingMaterial({
                  id: `MAT-00${materials.length + 1}`,
                  nom: '',
                  tipus: 'Recurs Pedagògic',
                  ambit: 'Ciències Naturals',
                  urlImatge: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
                  descripcio: '',
                  contingutMaleta: '',
                  urlGuiaDrive: 'https://drive.google.com/',
                  modelPrestec: 'Torns',
                  estatGeneral: 'Actiu',
                });
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Afegir Nou Material</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">ID / Foto</th>
                    <th className="p-3.5">Nom del Material</th>
                    <th className="p-3.5">Tipus & Model</th>
                    <th className="p-3.5">Àmbit Temàtic</th>
                    <th className="p-3.5">Estat General</th>
                    <th className="p-3.5">Dossier Drive</th>
                    <th className="p-3.5 text-right">Accions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.map(mat => (
                    <tr key={mat.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 flex items-center gap-2.5">
                        <img
                          src={mat.urlImatge}
                          alt={mat.nom}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <span className="font-mono font-bold text-indigo-700">{mat.id}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{mat.nom}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">{mat.descripcio}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-700">{mat.tipus}</span>
                        <div className="text-[10px] text-slate-400 font-mono">Model: {mat.modelPrestec}</div>
                      </td>
                      <td className="p-3.5 text-slate-700">{mat.ambit}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          mat.estatGeneral === 'Actiu'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {mat.estatGeneral}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <a
                          href={mat.urlGuiaDrive}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                        >
                          <span>Guia Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setIsNewMaterial(false);
                              setEditingMaterial(mat);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Editar material"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarMaterial(mat.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Eliminar material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TORNS PEDAGÒGICS */}
      {activeTab === 'torns' && (
        <div className="space-y-6">
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 text-xs text-indigo-950">
            <h4 className="font-bold text-sm mb-1 text-indigo-900">Calendari Oficial del Curs Escolar (Pestanya 2: Torns_Pedagogics)</h4>
            <p>
              El curs es divideix en 6 torns oficials tancats i prefixats. Els recursos pedagògics només es poden reservar dins d'aquestes dates per garantir una rotació equitativa entre centres escolars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {torns.map(t => {
              const activeInThisTurn = reserves.filter(r => r.tornAssignat === t.id && (r.estatReserva === 'Concedida' || r.estatReserva === 'Pendent de Validació'));

              return (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      {t.id}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {activeInThisTurn.length} maletes reservades
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-2">{t.nom}</h3>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Data d'inici:</span>
                      <span className="font-bold text-slate-800">{t.dataInici}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Data de finalització:</span>
                      <span className="font-bold text-slate-800">{t.dataFinal}</span>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500">
                    {activeInThisTurn.length > 0 ? (
                      <div>
                        <span className="font-semibold text-slate-700">Centres amb préstec concedit o sol·licitat:</span>
                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                          {activeInThisTurn.map(r => (
                            <li key={r.idReserva} className="truncate">
                              {r.centreEducatiu} ({r.idMaterial})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <span className="text-emerald-600 font-semibold">Tots els recursos estan lliures per a aquest torn.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATITZACIONS I GOOGLE APPS SCRIPT */}
      {activeTab === 'automations' && (
        <div className="space-y-6">
          {/* Action Trigger Diari */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-700">
                  Trigger Diari Programat (Apps Script 6.3)
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Recordatori Automàtic de Finalització del Préstec (2 dies abans)
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Executa la rutina automàtica que comprova les reserves en estat <code>Concedida</code> la data límit de les quals venci en exactament 2 dies, i envia el correu per revisar contingut de la maleta.
              </p>
            </div>

            <button
              onClick={handleRunDailyTrigger}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0"
            >
              <Play className="w-4 h-4" />
              <span>Executar Trigger Manualment</span>
            </button>
          </div>

          {triggerResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold animate-in fade-in">
              {triggerResult}
            </div>
          )}

          {/* Email Notification Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Registre de Notificacions per Correu Enviades</h4>
                <p className="text-xs text-slate-500">Historial dels correus generats per les automatitzacions</p>
              </div>
              {notificacions.length > 0 && (
                <button
                  onClick={esborrarNotificacions}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Netejar registre
                </button>
              )}
            </div>

            {notificacions.length > 0 ? (
              <div className="space-y-3">
                {notificacions.map(notif => (
                  <div key={notif.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{notif.assumpte}</span>
                      <span className="text-slate-400 text-[10px]">{notif.dataHora}</span>
                    </div>
                    <div className="text-slate-600 font-mono text-[11px]">
                      Destinatari: <strong className="text-indigo-700">{notif.destinatari}</strong>
                    </div>
                    <pre className="mt-2 p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-sans text-xs whitespace-pre-wrap">
                      {notif.cos}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Encara no s'ha generat cap notificació per correu.
              </div>
            )}
          </div>

          {/* Apps Script Codes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Codi per a Google Apps Script (Extensions &gt; Apps Script)</h4>
              <p className="text-xs text-slate-500">
                Pots copiar aquest codi directament a l'editor d'script del teu full de Google Sheets per activar les 3 automatitzacions reals de Google Workspace.
              </p>
            </div>

            {/* Script 1 */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">
                  6.1 Notificació Automàtica a la Bústia del CRP (En enviar formulari)
                </span>
                <button
                  onClick={() => copyToClipboard(script1, 1)}
                  className="px-2.5 py-1 text-xs font-bold bg-white text-indigo-700 border border-slate-300 rounded-lg flex items-center gap-1 hover:bg-indigo-50"
                >
                  {copiedCodeIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodeIndex === 1 ? 'Copiat!' : 'Copiar Codi'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-56">
                {script1}
              </pre>
            </div>

            {/* Script 2 */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">
                  6.2 Validació pel CRP i Notificació a l'Usuari (Acord de recollida)
                </span>
                <button
                  onClick={() => copyToClipboard(script2, 2)}
                  className="px-2.5 py-1 text-xs font-bold bg-white text-indigo-700 border border-slate-300 rounded-lg flex items-center gap-1 hover:bg-indigo-50"
                >
                  {copiedCodeIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodeIndex === 2 ? 'Copiat!' : 'Copiar Codi'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-56">
                {script2}
              </pre>
            </div>

            {/* Script 3 */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">
                  6.3 Recordatori Automàtic de Finalització del Préstec (Trigger diari)
                </span>
                <button
                  onClick={() => copyToClipboard(script3, 3)}
                  className="px-2.5 py-1 text-xs font-bold bg-white text-indigo-700 border border-slate-300 rounded-lg flex items-center gap-1 hover:bg-indigo-50"
                >
                  {copiedCodeIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodeIndex === 3 ? 'Copiat!' : 'Copiar Codi'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-56">
                {script3}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ESTRUCTURA GOOGLE SHEETS */}
      {activeTab === 'sheets' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Arquitectura de Dades del Llibre de Google Sheets</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Aquesta aplicació s'estructura exactament en les 4 pestanyes dissenyades a la proposta. Pots descarregar el fitxer CSV complet amb un sol clic i importar-lo directament al teu Google Drive.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="font-bold text-sm text-indigo-700 mb-1">Pestanya 1: Materials</div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>• Columnes A-J: <code>ID_Material, Nom, Tipus, Àmbit, URL_Imatge, Descripció, Contingut_Maleta, URL_Guia_Drive, Model_Préstec, Estat_General</code>.</p>
                  <p>• Conté el catàleg enriquits amb imatges i enllaços a la documentació a Google Drive.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="font-bold text-sm text-indigo-700 mb-1">Pestanya 2: Torns_Pedagogics</div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>• Columnes: <code>ID_Torn, Nom_Torn, Data_Inici, Data_Final</code>.</p>
                  <p>• Calendari oficial dels 6 torns escolars (14/09 a 16/06).</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="font-bold text-sm text-indigo-700 mb-1">Pestanya 3: Disponibilitat_i_Reserves (Privada)</div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>• Columnes A-N: <code>ID_Reserva, ID_Material, Tipus, Torn_Assignat, Data_Inici, Data_Fi, Nom_Sol·licitant, Centre_Educatiu, Municipi, Correu, Telèfon, Observacions, Estat_Reserva, Data_Hora_Recollida</code>.</p>
                  <p>• Dades personals protegides pel RGPD només accessibles pel personal autoritzat.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="font-bold text-sm text-indigo-700 mb-1">Pestanya 4: Automatitzacions & Historial</div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>• Execució automàtica amb Google Apps Script i MailApp.</p>
                  <p>• Notificacions immediates, acord de cita de recollida i avisos 2 dies abans.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportarCSVSheets}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descarregar CSV Estructurat per a Google Sheets</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Validate & Arrange Pickup */}
      {reservaPerValidar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Aprovar Reserva i Concretar Recollida
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Sol·licitud <strong>{reservaPerValidar.idReserva}</strong> per a <strong>{reservaPerValidar.nomSollicitant}</strong> ({reservaPerValidar.centreEducatiu}).
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data i hora acordada per a la recollida del material:
                </label>
                <input
                  type="text"
                  value={dataHoraRecollidaInput}
                  onChange={(e) => setDataHoraRecollidaInput(e.target.value)}
                  placeholder="Ex: Dilluns 15 de setembre a les 10:30 h a la seu del CRP"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Aquesta informació s'enviarà automàticament al docent per correu (correu electrònic: <code>{reservaPerValidar.correu}</code>).
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                <span className="font-semibold block mb-0.5">Material:</span>
                <span>{reservaPerValidar.idMaterial} • {reservaPerValidar.tipus}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReservaPerValidar(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
              >
                Cancel·lar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmValidation('Concedida')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar i Notificar Docent</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Material */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {isNewMaterial ? 'Afegir Nou Material al Catàleg' : `Editar Material ${editingMaterial.id}`}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Camps corresponents a les columnes A-J de la pestanya <code>Materials</code>.
            </p>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Codi ID:</label>
                  <input
                    type="text"
                    value={editingMaterial.id}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, id: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipus:</label>
                  <select
                    value={editingMaterial.tipus}
                    onChange={(e) => {
                      const tipus = e.target.value as any;
                      setEditingMaterial({
                        ...editingMaterial,
                        tipus,
                        modelPrestec: tipus === 'Recurs Pedagògic' ? 'Torns' : 'Setmanes',
                      });
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Recurs Pedagògic">Recurs Pedagògic</option>
                    <option value="Maquinària i Equipament">Maquinària i Equipament</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom del Material:</label>
                <input
                  type="text"
                  value={editingMaterial.nom}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, nom: e.target.value })}
                  required
                  placeholder="Ex: Maleta de Robòtica Bee-Bot"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Àmbit Temàtic:</label>
                  <input
                    type="text"
                    value={editingMaterial.ambit}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, ambit: e.target.value })}
                    required
                    placeholder="Ex: Robòtica, Ciències Naturals..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estat General:</label>
                  <select
                    value={editingMaterial.estatGeneral}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, estatGeneral: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Actiu">Actiu</option>
                    <option value="En Manteniment">En Manteniment</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Imatge de Portada:</label>
                <input
                  type="url"
                  value={editingMaterial.urlImatge}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, urlImatge: e.target.value })}
                  required
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripció Pedagògica:</label>
                <textarea
                  rows={2}
                  value={editingMaterial.descripcio}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, descripcio: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contingut Detallat de la Maleta o Equip:</label>
                <textarea
                  rows={2}
                  value={editingMaterial.contingutMaleta}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, contingutMaleta: e.target.value })}
                  required
                  placeholder="Llistat detallat de peces, guies i components..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Guia didàctica / Google Drive:</label>
                <input
                  type="url"
                  value={editingMaterial.urlGuiaDrive}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, urlGuiaDrive: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  Cancel·lar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Guardar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
