import React, { createContext, useContext, useState, useEffect } from 'react';
import { Material, TornPedagogic, Reserva, NotificacioEmail, EstatReserva } from '../types/crp';
import { MATERIALS_DEFAULT, TORNS_PEDAGOGICS_DEFAULT, RESERVES_DEFAULT } from '../data/defaultData';

interface CrpContextType {
  materials: Material[];
  torns: TornPedagogic[];
  reserves: Reserva[];
  notificacions: NotificacioEmail[];
  activeView: 'public' | 'crp-admin';
  setActiveView: (view: 'public' | 'crp-admin') => void;
  crearReserva: (novaReserva: Omit<Reserva, 'idReserva' | 'estatReserva' | 'dataCreacio'>) => Reserva;
  validarReserva: (idReserva: string, estat: EstatReserva, dataHoraRecollida?: string) => void;
  afegirMaterial: (material: Material) => void;
  actualitzarMaterial: (material: Material) => void;
  eliminarMaterial: (id: string) => void;
  executarTriggerRecordatoriDiari: () => { processades: number; notificacionsEnviades: number };
  esborrarNotificacions: () => void;
  restablirDadesPerDefecte: () => void;
  getDisponibilitatMaterialTorn: (idMaterial: string, idTorn: string) => { disponible: boolean; reserva?: Reserva };
  exportarCSVSheets: () => void;
}

const STORAGE_KEYS = {
  MATERIALS: 'crp_materials_v1',
  RESERVES: 'crp_reserves_v1',
  TORNS: 'crp_torns_v1',
  NOTIFICACIONS: 'crp_notificacions_v1',
};

const CrpContext = createContext<CrpContextType | undefined>(undefined);

export const CrpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [materials, setMaterials] = useState<Material[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MATERIALS);
    return saved ? JSON.parse(saved) : MATERIALS_DEFAULT;
  });

  const [torns] = useState<TornPedagogic[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TORNS);
    return saved ? JSON.parse(saved) : TORNS_PEDAGOGICS_DEFAULT;
  });

  const [reserves, setReserves] = useState<Reserva[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RESERVES);
    return saved ? JSON.parse(saved) : RESERVES_DEFAULT;
  });

  const [notificacions, setNotificacions] = useState<NotificacioEmail[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICACIONS);
    return saved ? JSON.parse(saved) : [
      {
        id: 'NOTIF-001',
        dataHora: new Date().toLocaleDateString('ca-ES') + ' 10:35',
        tipus: 'aprovacio_usuari',
        destinatari: 'msoler@escolaeldrac.cat',
        assumpte: "✅ Confirmació de Reserva i Acord de Recollida - CRP",
        cos: "Hola Marta Soler Garcia,\n\nLa teva sol·licitud de préstec per al material (MAT-001 - De l'hort a casa) ha estat APROVADA.\n\n• Data i hora de recollida acordada: 14/09/2026 a les 10:30 h\n• Lloc: Seu del Centre de Recursos Pedagògics (CRP)\n\nSi necessites proposar un altre horari de recollida, respon directament a aquest correu.\n\nAtentament,\nEquip del Centre de Recursos Pedagògics",
        idReserva: 'RES-2026-001',
      }
    ];
  });

  const [activeView, setActiveView] = useState<'public' | 'crp-admin'>('public');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RESERVES, JSON.stringify(reserves));
  }, [reserves]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICACIONS, JSON.stringify(notificacions));
  }, [notificacions]);

  // Check if a pedagogical turn is available for a material
  const getDisponibilitatMaterialTorn = (idMaterial: string, idTorn: string) => {
    const r = reserves.find(
      res => res.idMaterial === idMaterial &&
             res.tornAssignat === idTorn &&
             (res.estatReserva === 'Concedida' || res.estatReserva === 'Pendent de Validació')
    );
    return {
      disponible: !r,
      reserva: r,
    };
  };

  // 6.1 Apps Script simulation: enEnviarSollicitud
  const crearReserva = (novaReserva: Omit<Reserva, 'idReserva' | 'estatReserva' | 'dataCreacio'>): Reserva => {
    const nextNum = reserves.length + 1;
    const year = new Date().getFullYear();
    const idReserva = `RES-${year}-${String(nextNum).padStart(3, '0')}`;

    // Determine target return date
    let dataRetornPrevista = novaReserva.dataFiSetmana;
    if (novaReserva.tornAssignat) {
      const t = torns.find(item => item.id === novaReserva.tornAssignat);
      if (t) {
        dataRetornPrevista = t.dataFinalISO;
      }
    }

    const reservaCreada: Reserva = {
      ...novaReserva,
      idReserva,
      estatReserva: 'Pendent de Validació',
      dataCreacio: new Date().toISOString(),
      dataRetornPrevista,
    };

    setReserves(prev => [reservaCreada, ...prev]);

    // Send automated email to CRP mailbox (Apps Script 6.1)
    const material = materials.find(m => m.id === novaReserva.idMaterial);
    const nomMat = material ? `${material.nom} (${material.id})` : novaReserva.idMaterial;
    const periodeDesc = novaReserva.tornAssignat
      ? `Torn ${novaReserva.tornAssignat} (${torns.find(t => t.id === novaReserva.tornAssignat)?.nom || ''})`
      : `${novaReserva.dataIniciSetmana} fins ${novaReserva.dataFiSetmana}`;

    const notifCRP: NotificacioEmail = {
      id: `NOTIF-${Date.now()}-CRP`,
      dataHora: new Date().toLocaleString('ca-ES'),
      tipus: 'avis_crp',
      destinatari: 'crp@centre-recursos.cat',
      assumpte: `📥 Nova Sol·licitud de Préstec: ${novaReserva.idMaterial} - ${novaReserva.centreEducatiu}`,
      cos: `S'ha rebut una nova petició de préstec:\n\n` +
           `• Codi Reserva: ${idReserva}\n` +
           `• Material: ${nomMat}\n` +
           `• Sol·licitant: ${novaReserva.nomSollicitant}\n` +
           `• Centre Educatiu: ${novaReserva.centreEducatiu} (${novaReserva.municipi})\n` +
           `• Període/Torn sol·licitat: ${periodeDesc}\n` +
           `• Correu: ${novaReserva.correu} | Tel: ${novaReserva.telefon}\n` +
           `• Observacions: ${novaReserva.observacions || 'Cap'}\n\n` +
           `Accedeix al Panell de Gestió del CRP per revisar i validar aquesta reserva.`,
      idReserva,
    };

    setNotificacions(prev => [notifCRP, ...prev]);
    return reservaCreada;
  };

  // 6.2 Apps Script simulation: alEditarValidacio
  const validarReserva = (idReserva: string, estat: EstatReserva, dataHoraRecollida?: string) => {
    const r = reserves.find(item => item.idReserva === idReserva);
    if (!r) return;

    setReserves(prev =>
      prev.map(item => {
        if (item.idReserva === idReserva) {
          return {
            ...item,
            estatReserva: estat,
            dataHoraRecollida: dataHoraRecollida || item.dataHoraRecollida,
          };
        }
        return item;
      })
    );

    const mat = materials.find(m => m.id === r.idMaterial);
    const nomMat = mat ? `${mat.nom} (${mat.id})` : r.idMaterial;

    if (estat === 'Concedida') {
      const recollidaTxt = dataHoraRecollida || r.dataHoraRecollida || 'A concretar amb el personal del CRP';
      const notifDocent: NotificacioEmail = {
        id: `NOTIF-${Date.now()}-CONF`,
        dataHora: new Date().toLocaleString('ca-ES'),
        tipus: 'aprovacio_usuari',
        destinatari: r.correu,
        assumpte: `✅ Confirmació de Reserva i Acord de Recollida - CRP`,
        cos: `Hola ${r.nomSollicitant},\n\n` +
             `La teva sol·licitud de préstec per al material (${nomMat}) per al centre ${r.centreEducatiu} ha estat APROVADA.\n\n` +
             `• Codi de reserva: ${r.idReserva}\n` +
             `• Data i hora prevista de recollida: ${recollidaTxt}\n` +
             `• Punt de recollida: Seu del Centre de Recursos Pedagògics (CRP)\n\n` +
             `Si necessites proposar un altre horari de recollida o tens qualsevol dubte, respon directament a aquest correu.\n\n` +
             `Atentament,\nEquip del Centre de Recursos Pedagògics`,
        idReserva: r.idReserva,
      };
      setNotificacions(prev => [notifDocent, ...prev]);
    } else if (estat === 'Denegada') {
      const notifDeneg: NotificacioEmail = {
        id: `NOTIF-${Date.now()}-DEN`,
        dataHora: new Date().toLocaleString('ca-ES'),
        tipus: 'denegacio_usuari',
        destinatari: r.correu,
        assumpte: `❌ Sol·licitud no disponible - CRP`,
        cos: `Hola ${r.nomSollicitant},\n\n` +
             `Et comuniquem que la sol·licitud de préstec ${r.idReserva} per a ${nomMat} no s'ha pogut concedir en el període sol·licitat per coincidència amb altres reserves o manteniment.\n\n` +
             `Pots consultar altres torns o materials similars al catàleg públic del CRP.\n\n` +
             `Atentament,\nEquip del CRP`,
        idReserva: r.idReserva,
      };
      setNotificacions(prev => [notifDeneg, ...prev]);
    }
  };

  // 6.3 Apps Script simulation: enviarRecordatoriDevolucio (Trigger diari)
  const executarTriggerRecordatoriDiari = () => {
    let processades = 0;
    let notificacionsEnviades = 0;
    const avui = new Date();

    reserves.forEach(r => {
      if (r.estatReserva === 'Concedida' && r.dataRetornPrevista) {
        processades++;
        const dataFi = new Date(r.dataRetornPrevista);
        const diffMs = dataFi.getTime() - avui.getTime();
        const diesRestants = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // In practice or test simulation, if diesRestants <= 2 and > -5
        if (diesRestants <= 2 && diesRestants >= 0) {
          notificacionsEnviades++;
          const mat = materials.find(m => m.id === r.idMaterial);
          const notifRec: NotificacioEmail = {
            id: `NOTIF-${Date.now()}-REM-${r.idReserva}`,
            dataHora: new Date().toLocaleString('ca-ES'),
            tipus: 'recordatori_retorn',
            destinatari: r.correu,
            assumpte: `⏰ Recordatori: Finalització del préstec de ${r.idMaterial} (${mat?.nom || ''})`,
            cos: `Hola ${r.nomSollicitant},\n\n` +
                 `Et recordem que el préstec del material ${r.idMaterial} (${mat?.nom || ''}) finalitza aviat (Data límit de devolució: ${dataFi.toLocaleDateString('ca-ES')}).\n\n` +
                 `Si us plau, assegura't de revisar que tot el contingut de la maleta/equip estigui complet i a punt per al retorn al CRP.\n\n` +
                 `Contingut de comprovació:\n${mat?.contingutMaleta || 'Tots els elements i guies'}\n\n` +
                 `Moltes gràcies per la teva col·laboració.\n\n` +
                 `Atentament,\nEquip del Centre de Recursos Pedagògics`,
            idReserva: r.idReserva,
          };
          setNotificacions(prev => [notifRec, ...prev]);
        }
      }
    });

    return { processades, notificacionsEnviades };
  };

  const afegirMaterial = (m: Material) => {
    setMaterials(prev => [m, ...prev]);
  };

  const actualitzarMaterial = (m: Material) => {
    setMaterials(prev => prev.map(item => item.id === m.id ? m : item));
  };

  const eliminarMaterial = (id: string) => {
    setMaterials(prev => prev.filter(item => item.id !== id));
  };

  const esborrarNotificacions = () => {
    setNotificacions([]);
  };

  const restablirDadesPerDefecte = () => {
    setMaterials(MATERIALS_DEFAULT);
    setReserves(RESERVES_DEFAULT);
    setNotificacions([]);
    localStorage.clear();
  };

  const exportarCSVSheets = () => {
    // Generates a structured multi-section CSV compatible with Google Sheets
    const headerMaterials = ['ID_Material', 'Nom', 'Tipus', 'Ambit', 'URL_Imatge', 'Descripcio', 'Contingut_Maleta', 'URL_Guia_Drive', 'Model_Prestec', 'Estat_General'];
    const rowsMaterials = materials.map(m => [
      `"${m.id}"`,
      `"${m.nom.replace(/"/g, '""')}"`,
      `"${m.tipus}"`,
      `"${m.ambit.replace(/"/g, '""')}"`,
      `"${m.urlImatge}"`,
      `"${m.descripcio.replace(/"/g, '""')}"`,
      `"${m.contingutMaleta.replace(/"/g, '""')}"`,
      `"${m.urlGuiaDrive}"`,
      `"${m.modelPrestec}"`,
      `"${m.estatGeneral}"`
    ].join(','));

    const headerReserves = ['ID_Reserva', 'ID_Material', 'Tipus', 'Torn_Assignat', 'Data_Inici_Setmana', 'Data_Fi_Setmana', 'Nom_Sollicitant', 'Centre_Educatiu', 'Municipi', 'Correu', 'Telefon', 'Observacions', 'Estat_Reserva', 'Data_Hora_Recollida'];
    const rowsReserves = reserves.map(r => [
      `"${r.idReserva}"`,
      `"${r.idMaterial}"`,
      `"${r.tipus}"`,
      `"${r.tornAssignat || 'N/A'}"`,
      `"${r.dataIniciSetmana || ''}"`,
      `"${r.dataFiSetmana || ''}"`,
      `"${r.nomSollicitant.replace(/"/g, '""')}"`,
      `"${r.centreEducatiu.replace(/"/g, '""')}"`,
      `"${r.municipi.replace(/"/g, '""')}"`,
      `"${r.correu}"`,
      `"${r.telefon}"`,
      `"${r.observacions.replace(/"/g, '""')}"`,
      `"${r.estatReserva}"`,
      `"${r.dataHoraRecollida || ''}"`
    ].join(','));

    const fullContent = [
      '### PESTANYA 1: MATERIALS ###',
      headerMaterials.join(','),
      ...rowsMaterials,
      '',
      '### PESTANYA 3: DISPONIBILITAT_I_RESERVES ###',
      headerReserves.join(','),
      ...rowsReserves,
    ].join('\n');

    const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CRP_Inventari_Reserves_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <CrpContext.Provider
      value={{
        materials,
        torns,
        reserves,
        notificacions,
        activeView,
        setActiveView,
        crearReserva,
        validarReserva,
        afegirMaterial,
        actualitzarMaterial,
        eliminarMaterial,
        executarTriggerRecordatoriDiari,
        esborrarNotificacions,
        restablirDadesPerDefecte,
        getDisponibilitatMaterialTorn,
        exportarCSVSheets,
      }}
    >
      {children}
    </CrpContext.Provider>
  );
};

export const useCrp = () => {
  const context = useContext(CrpContext);
  if (!context) {
    throw new Error('useCrp must be used within a CrpProvider');
  }
  return context;
};
