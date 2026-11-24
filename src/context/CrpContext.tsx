import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Material, NotificacioEmail, Reserva, TornPedagogic, EstatReserva } from '../types/crp';
import { CrpRepository, ErrorApi, NovaReserva } from '../data/CrpRepository';
import { LocalRepository } from '../data/localRepository';
import { TORNS_PEDAGOGICS_DEFAULT } from '../data/defaultData';

interface CrpContextType {
  materials: Material[];
  torns: TornPedagogic[];
  reserves: Reserva[];
  notificacions: NotificacioEmail[];
  carregant: boolean;
  error: string | null;
  autenticat: boolean;
  correu: string | null;
  recarregar: () => Promise<void>;
  login: (correu: string, contrasenya: string) => Promise<void>;
  logout: () => Promise<void>;
  crearReserva: (dades: NovaReserva) => Promise<Reserva>;
  validarReserva: (idReserva: string, estat: EstatReserva, recollida?: string) => Promise<void>;
  desarMaterial: (material: Material) => Promise<void>;
  eliminarMaterial: (id: string) => Promise<void>;
  pujarImatge: (fitxer: File) => Promise<string>;
  executarRecordatoris: () => Promise<{ processades: number; enviades: number }>;
  exportarCsv: () => Promise<void>;
  getDisponibilitatMaterialTorn: (
    idMaterial: string,
    idTorn: string
  ) => { disponible: boolean; reserva?: Reserva };
}

const CrpContext = createContext<CrpContextType | undefined>(undefined);

interface CrpProviderProps {
  children: React.ReactNode;
  repository?: CrpRepository;
  mode?: 'public' | 'private';
}

export const CrpProvider: React.FC<CrpProviderProps> = ({
  children,
  repository,
  mode = 'private',
}) => {
  const repo = useMemo<CrpRepository>(() => repository ?? new LocalRepository(), [repository]);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [torns, setTorns] = useState<TornPedagogic[]>(TORNS_PEDAGOGICS_DEFAULT);
  const [reserves, setReserves] = useState<Reserva[]>([]);
  const [notificacions, setNotificacions] = useState<NotificacioEmail[]>([]);
  const [ocupacio, setOcupacio] = useState<Record<string, string[]>>({});
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autenticat, setAutenticat] = useState(mode === 'public');
  const [correu, setCorreu] = useState<string | null>(null);

  /**
   * Carrega les dades. Amb `silenciosa` no es mostra l'estat de càrrega:
   * així una actualització després d'una acció no desmunta el formulari obert.
   */
  const carregar = useCallback(async (silenciosa = false) => {
    if (!silenciosa) {
      setCarregant(true);
    }
    setError(null);
    try {
      if (mode === 'public') {
        const cataleg = await repo.carregarCataleg();
        setMaterials(cataleg.materials);
        setTorns(cataleg.torns);
        setOcupacio(cataleg.ocupacio);
        setReserves([]);
        setAutenticat(true);
      } else {
        const panell = await repo.carregarPanell();
        setMaterials(panell.materials);
        setTorns(panell.torns);
        setReserves(panell.reserves);
        setNotificacions(panell.notificacions);
        setAutenticat(true);
        setCorreu((await repo.sessioActual?.())?.correu ?? null);
      }
    } catch (e) {
      const err = e as ErrorApi;
      if (err instanceof ErrorApi && err.codi === 401) {
        setAutenticat(false);
      } else {
        setError(err.message ?? 'Error desconegut');
      }
    } finally {
      if (!silenciosa) {
        setCarregant(false);
      }
    }
  }, [repo, mode]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const login = useCallback(
    async (correuUsuari: string, contrasenya: string) => {
      if (!repo.login) throw new Error('Aquest entorn no admet inici de sessió');
      await repo.login(correuUsuari, contrasenya);
      setCorreu(correuUsuari);
      setAutenticat(true);
      await carregar();
    },
    [repo, carregar]
  );

  const logout = useCallback(async () => {
    await repo.logout?.();
    setAutenticat(false);
    setCorreu(null);
  }, [repo]);

  const crearReserva = useCallback(
    async (dades: NovaReserva) => {
      const reserva = await repo.crearReserva(dades);
      await carregar(true);
      return reserva;
    },
    [repo, carregar]
  );

  const validarReserva = useCallback(
    async (idReserva: string, estat: EstatReserva, recollida?: string) => {
      await repo.validarReserva(idReserva, estat, recollida);
      await carregar(true);
    },
    [repo, carregar]
  );

  const desarMaterial = useCallback(
    async (material: Material) => {
      await repo.desarMaterial(material);
      await carregar(true);
    },
    [repo, carregar]
  );

  const eliminarMaterial = useCallback(
    async (id: string) => {
      await repo.eliminarMaterial(id);
      await carregar(true);
    },
    [repo, carregar]
  );

  const pujarImatge = useCallback((fitxer: File) => repo.pujarImatge(fitxer), [repo]);

  const executarRecordatoris = useCallback(async () => {
    const resultat = await repo.executarRecordatoris();
    await carregar(true);
    return resultat;
  }, [repo, carregar]);

  const exportarCsv = useCallback(async () => {
    const csv = await repo.exportarCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CRP_Inventari_Reserves_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [repo]);

  const getDisponibilitatMaterialTorn = useCallback(
    (idMaterial: string, idTorn: string) => {
      if (reserves.length > 0) {
        const reserva = reserves.find(
          r =>
            r.idMaterial === idMaterial &&
            r.tornAssignat === idTorn &&
            (r.estatReserva === 'Concedida' || r.estatReserva === 'Pendent de Validació')
        );
        return { disponible: !reserva, reserva };
      }
      const ocupats = ocupacio[idMaterial] ?? [];
      return { disponible: !ocupats.includes(idTorn), reserva: undefined };
    },
    [reserves, ocupacio]
  );

  const value: CrpContextType = {
    materials,
    torns,
    reserves,
    notificacions,
    carregant,
    error,
    autenticat,
    correu,
    recarregar: carregar,
    login,
    logout,
    crearReserva,
    validarReserva,
    desarMaterial,
    eliminarMaterial,
    pujarImatge,
    executarRecordatoris,
    exportarCsv,
    getDisponibilitatMaterialTorn,
  };

  return <CrpContext.Provider value={value}>{children}</CrpContext.Provider>;
};

export const useCrp = (): CrpContextType => {
  const context = useContext(CrpContext);
  if (!context) {
    throw new Error('useCrp must be used within a CrpProvider');
  }
  return context;
};
