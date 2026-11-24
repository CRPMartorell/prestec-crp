<?php
declare(strict_types=1);

/**
 * Regles de negoci del CRP sobre MySQL/SQLite. Les respostes mantenen els noms
 * de camp que ja fa servir la interfície React (camelCase), per no tocar els
 * components.
 */
final class Crp
{
    /** Dies de préstec per als equips que es reserven per dates. */
    public const DIES_MAQUINARIA = 7;

    public function __construct(
        private Db $db,
        private array $config,
        private Correu $correu,
    ) {
    }

    private static function esCapDeSetmana(string $iso): bool
    {
        $data = DateTimeImmutable::createFromFormat('!Y-m-d', $iso);
        if ($data === false) {
            return false;
        }
        return (int) $data->format('N') >= 6;
    }

    // ---------- Mapatge ----------

    private static function material(array $r): array
    {
        return [
            'id' => $r['id'],
            'nom' => $r['nom'],
            'tipus' => $r['tipus'],
            'ambit' => $r['ambit'],
            'urlImatge' => $r['url_imatge'],
            'descripcio' => $r['descripcio'],
            'contingutMaleta' => $r['contingut'],
            'urlGuiaDrive' => $r['url_guia'],
            'modelPrestec' => $r['model_prestec'],
            'estatGeneral' => $r['estat_general'],
            'mostraContingut' => !isset($r['mostra_contingut']) || (int) $r['mostra_contingut'] === 1,
            'mostraGuia' => !isset($r['mostra_guia']) || (int) $r['mostra_guia'] === 1,
        ];
    }

    private static function torn(array $r): array
    {
        return [
            'id' => $r['id'],
            'nom' => $r['nom'],
            'dataInici' => $r['data_inici'],
            'dataFinal' => $r['data_final'],
            'dataIniciISO' => $r['data_inici_iso'],
            'dataFinalISO' => $r['data_final_iso'],
        ];
    }

    private static function reserva(array $r): array
    {
        return [
            'idReserva' => $r['id_reserva'],
            'idMaterial' => $r['id_material'],
            'tipus' => $r['tipus'],
            'tornAssignat' => $r['torn_assignat'] ?? null,
            'dataIniciSetmana' => $r['data_inici_setmana'] ?? null,
            'dataFiSetmana' => $r['data_fi_setmana'] ?? null,
            'nomSollicitant' => $r['nom_sollicitant'],
            'centreEducatiu' => $r['centre'],
            'municipi' => $r['municipi'],
            'correu' => $r['correu'],
            'observacions' => $r['observacions'] ?? '',
            'estatReserva' => $r['estat'],
            'dataHoraRecollida' => $r['data_hora_recollida'] ?? null,
            'dataCreacio' => $r['data_creacio'],
            'dataRetornPrevista' => $r['data_retorn'] ?? null,
        ];
    }

    private static function notificacio(array $r): array
    {
        return [
            'id' => $r['id'],
            'dataHora' => $r['data_hora'],
            'tipus' => $r['tipus'],
            'destinatari' => $r['destinatari'],
            'assumpte' => $r['assumpte'],
            'cos' => $r['cos'],
            'idReserva' => $r['id_reserva'] ?? '',
        ];
    }

    // ---------- Catàleg públic ----------

    public function cataleg(): array
    {
        $materials = array_map([self::class, 'material'], $this->db->all('SELECT * FROM materials ORDER BY id'));
        $torns = array_map([self::class, 'torn'], $this->db->all('SELECT * FROM torns ORDER BY id'));

        $actives = $this->db->all(
            "SELECT id_material, torn_assignat, data_inici_setmana, data_fi_setmana
               FROM reserves
              WHERE estat IN ('Concedida', 'Pendent de Validació')"
        );

        $ocupacio = [];
        $setmanes = [];
        foreach ($actives as $r) {
            if (!empty($r['torn_assignat'])) {
                $ocupacio[$r['id_material']][] = $r['torn_assignat'];
            }
            if (!empty($r['data_inici_setmana']) && !empty($r['data_fi_setmana'])) {
                $setmanes[$r['id_material']][] = $r['data_inici_setmana'] . '/' . $r['data_fi_setmana'];
            }
        }

        return [
            'materials' => $materials,
            'torns' => $torns,
            'ocupacio' => (object) $ocupacio,
            'setmanesOcupades' => (object) $setmanes,
        ];
    }

    // ---------- Reserves ----------

    public function crearReserva(array $d, string $ip = ''): array
    {
        $idMaterial = Http::text($d['idMaterial'] ?? null, 'idMaterial', 20);
        $material = $this->db->one('SELECT * FROM materials WHERE id = :id', ['id' => $idMaterial]);
        if ($material === null) {
            Http::error('El material no existeix', 404);
        }
        if ($material['estat_general'] !== 'Actiu') {
            Http::error('Aquest material no es pot reservar ara mateix', 409);
        }

        $esTorns = $material['model_prestec'] === 'Torns';
        $torn = $esTorns ? Http::text($d['tornAssignat'] ?? null, 'tornAssignat', 10) : null;

        if ($esTorns) {
            $existeix = $this->db->val('SELECT id FROM torns WHERE id = :id', ['id' => $torn]);
            if ($existeix === null) {
                Http::error('El torn indicat no existeix', 422);
            }
        }

        $inici = $esTorns ? null : Http::text($d['dataIniciSetmana'] ?? null, 'dataIniciSetmana', 10);
        $fi = $esTorns ? null : Http::text($d['dataFiSetmana'] ?? null, 'dataFiSetmana', 10);

        if (!$esTorns) {
            foreach (['dataIniciSetmana' => $inici, 'dataFiSetmana' => $fi] as $camp => $valor) {
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $valor)) {
                    Http::error('El camp ' . $camp . ' ha de tenir format YYYY-MM-DD', 422);
                }
            }

            if (self::esCapDeSetmana((string) $inici) || self::esCapDeSetmana((string) $fi)) {
                Http::error('El període de préstec no pot començar ni acabar en dissabte o diumenge', 422);
            }

            $esperat = (new DateTimeImmutable((string) $inici))->modify('+' . self::DIES_MAQUINARIA . ' days')->format('Y-m-d');
            if ((string) $fi !== $esperat) {
                Http::error(
                    'El préstec de maquinària és de ' . self::DIES_MAQUINARIA . ' dies: la data de finalització ha de ser ' . $esperat,
                    422
                );
            }
        }

        $nom = Http::text($d['nomSollicitant'] ?? null, 'nomSollicitant', 200);
        $centre = Http::text($d['centreEducatiu'] ?? null, 'centreEducatiu', 200);
        $municipi = Http::text($d['municipi'] ?? null, 'municipi', 120);
        $correu = Http::text($d['correu'] ?? null, 'correu', 200);
        $observacions = isset($d['observacions']) && is_string($d['observacions'])
            ? mb_substr(trim($d['observacions']), 0, 1000)
            : '';

        if (!filter_var($correu, FILTER_VALIDATE_EMAIL)) {
            Http::error('El correu no és vàlid', 422);
        }

        return $this->db->transaccio(function (Db $db) use ($material, $esTorns, $torn, $inici, $fi, $nom, $centre, $municipi, $correu, $observacions, $ip) {
            $db->bloquejaMysql('materials', (string) $material['id']);

            if ($esTorns) {
                $ocupat = $db->val(
                    "SELECT id_reserva FROM reserves
                      WHERE id_material = :m AND torn_assignat = :t
                        AND estat IN ('Concedida', 'Pendent de Validació')",
                    ['m' => $material['id'], 't' => $torn]
                );
                if ($ocupat !== null) {
                    Http::error('Aquest torn acaba d\'ocupar-se. Tria\'n un altre.', 409);
                }
                $tornFila = $db->one('SELECT data_final_iso FROM torns WHERE id = :id', ['id' => $torn]);
                $retorn = $tornFila['data_final_iso'] ?? null;
            } else {
                $solapa = $db->val(
                    "SELECT id_reserva FROM reserves
                      WHERE id_material = :m
                        AND estat IN ('Concedida', 'Pendent de Validació')
                        AND data_inici_setmana <= :fi AND data_fi_setmana >= :ini",
                    ['m' => $material['id'], 'fi' => $fi, 'ini' => $inici]
                );
                if ($solapa !== null) {
                    Http::error('Aquestes dates ja estan reservades per a aquest equip.', 409);
                }
                $retorn = $fi;
            }

            $id = $this->segueixIdReserva($db);
            $ara = gmdate('c');

            $db->insert('reserves', [
                'id_reserva' => $id,
                'id_material' => $material['id'],
                'tipus' => $material['tipus'],
                'torn_assignat' => $torn,
                'data_inici_setmana' => $inici,
                'data_fi_setmana' => $fi,
                'nom_sollicitant' => $nom,
                'centre' => $centre,
                'municipi' => $municipi,
                'correu' => $correu,
                'observacions' => $observacions,
                'estat' => 'Pendent de Validació',
                'data_hora_recollida' => null,
                'data_creacio' => $ara,
                'data_retorn' => $retorn,
            ]);

            $reserva = [
                'idReserva' => $id,
                'idMaterial' => $material['id'],
                'tipus' => $material['tipus'],
                'tornAssignat' => $torn,
                'dataIniciSetmana' => $inici,
                'dataFiSetmana' => $fi,
                'nomSollicitant' => $nom,
                'centreEducatiu' => $centre,
                'municipi' => $municipi,
                'correu' => $correu,
                'observacions' => $observacions,
                'estatReserva' => 'Pendent de Validació',
                'dataHoraRecollida' => null,
                'dataCreacio' => $ara,
                'dataRetornPrevista' => $retorn,
            ];

            $this->notificaAvisCrp($db, $reserva, $material);
            $this->audita($db, 'public', 'crearReserva', $id, $ip);

            return $reserva;
        });
    }

    private function segueixIdReserva(Db $db): string
    {
        $any = (int) date('Y');
        $actual = (int) ($db->val("SELECT valor FROM config WHERE clau = 'reserva_counter'") ?? 0);
        $nou = $actual + 1;
        if ($actual === 0) {
            $db->insert('config', ['clau' => 'reserva_counter', 'valor' => (string) $nou]);
        } else {
            $db->run("UPDATE config SET valor = :v WHERE clau = 'reserva_counter'", ['v' => (string) $nou]);
        }
        return sprintf('RES-%d-%03d', $any, $nou);
    }

    // ---------- Panell intern ----------

    public function panell(): array
    {
        return [
            'materials' => array_map([self::class, 'material'], $this->db->all('SELECT * FROM materials ORDER BY id')),
            'torns' => array_map([self::class, 'torn'], $this->db->all('SELECT * FROM torns ORDER BY id')),
            'reserves' => array_map([self::class, 'reserva'], $this->db->all('SELECT * FROM reserves ORDER BY data_creacio DESC')),
            'notificacions' => array_map([self::class, 'notificacio'], $this->db->all('SELECT * FROM notificacions ORDER BY data_hora DESC LIMIT 100')),
        ];
    }

    public function validarReserva(string $id, string $estat, ?string $recollida, string $usuari = 'anonim'): void
    {
        if (!in_array($estat, ['Concedida', 'Denegada', 'Finalitzada'], true)) {
            Http::error('Estat no vàlid', 422);
        }

        $this->db->transaccio(function (Db $db) use ($id, $estat, $recollida, $usuari) {
            $r = $db->one('SELECT * FROM reserves WHERE id_reserva = :id', ['id' => $id]);
            if ($r === null) {
                Http::error('La reserva no existeix', 404);
            }

            $db->run(
                'UPDATE reserves SET estat = :e, data_hora_recollida = :h WHERE id_reserva = :id',
                ['e' => $estat, 'h' => $recollida ?? $r['data_hora_recollida'], 'id' => $id]
            );

            $material = $db->one('SELECT * FROM materials WHERE id = :id', ['id' => $r['id_material']]);
            $nomMat = $material ? $material['nom'] . ' (' . $material['id'] . ')' : $r['id_material'];

            if ($estat === 'Concedida') {
                $this->notifica($db, 'aprovacio_usuari', $r['correu'], 'Confirmació de Reserva i Acord de Recollida - CRP',
                    "Hola " . $r['nom_sollicitant'] . ",\n\nLa teva sol·licitud de préstec per al material (" . $nomMat . ") ha estat APROVADA.\n\n"
                    . "• Codi de reserva: " . $id . "\n"
                    . "• Data i hora prevista de recollida: " . ($recollida ?? 'A concretar amb el CRP') . "\n\n"
                    . "Atentament,\nEquip del Centre de Recursos Pedagògics", $id);
            } elseif ($estat === 'Denegada') {
                $this->notifica($db, 'denegacio_usuari', $r['correu'], 'Sol·licitud no disponible - CRP',
                    "Hola " . $r['nom_sollicitant'] . ",\n\nEt comuniquem que la sol·licitud " . $id . " per a " . $nomMat
                    . " no s'ha pogut concedir.\n\nPots consultar altres torns al catàleg.\n\nEquip del CRP", $id);
            }

            $this->audita($db, $usuari, 'validarReserva:' . $estat, $id, null);
        });
    }

    public function desarMaterial(array $m, string $usuari = 'anonim'): array
    {
        $id = Http::text($m['id'] ?? null, 'id', 20);
        $fila = [
            'id' => $id,
            'nom' => Http::text($m['nom'] ?? null, 'nom', 200),
            'tipus' => Http::text($m['tipus'] ?? null, 'tipus', 40),
            'ambit' => Http::text($m['ambit'] ?? null, 'ambit', 80),
            'url_imatge' => Http::text($m['urlImatge'] ?? null, 'urlImatge', 600),
            'descripcio' => Http::text($m['descripcio'] ?? null, 'descripcio', 2000),
            'contingut' => Http::text($m['contingutMaleta'] ?? null, 'contingutMaleta', 4000),
            'url_guia' => Http::text($m['urlGuiaDrive'] ?? null, 'urlGuiaDrive', 600),
            'model_prestec' => Http::text($m['modelPrestec'] ?? null, 'modelPrestec', 20),
            'estat_general' => Http::text($m['estatGeneral'] ?? null, 'estatGeneral', 30),
            'mostra_contingut' => isset($m['mostraContingut']) ? ((bool) $m['mostraContingut'] ? 1 : 0) : 1,
            'mostra_guia' => isset($m['mostraGuia']) ? ((bool) $m['mostraGuia'] ? 1 : 0) : 1,
        ];

        $this->db->transaccio(function (Db $db) use ($fila, $usuari) {
            if ($db->val('SELECT id FROM materials WHERE id = :id', ['id' => $fila['id']]) === null) {
                $db->insert('materials', $fila);
            } else {
                $db->update('materials', $fila, 'id = :id', ['id' => $fila['id']]);
            }
            $this->audita($db, $usuari, 'desarMaterial', null, $fila['id']);
        });

        return self::material($fila);
    }

    public function eliminarMaterial(string $id, string $usuari = 'anonim'): void
    {
        $this->db->transaccio(function (Db $db) use ($id, $usuari) {
            $db->run('DELETE FROM materials WHERE id = :id', ['id' => $id]);
            $this->audita($db, $usuari, 'eliminarMaterial', null, $id);
        });
    }

    public function recordatoris(string $usuari = 'anonim'): array
    {
        $avui = new DateTimeImmutable('today');
        $processades = 0;
        $enviades = 0;

        $concedides = $this->db->all("SELECT * FROM reserves WHERE estat = 'Concedida'");
        foreach ($concedides as $r) {
            if (empty($r['data_retorn'])) {
                continue;
            }
            $processades++;
            $dies = (int) $avui->diff(new DateTimeImmutable($r['data_retorn']))->format('%r%a');
            if ($dies < 0 || $dies > 2) {
                continue;
            }

            $material = $this->db->one('SELECT * FROM materials WHERE id = :id', ['id' => $r['id_material']]);
            $this->notifica(
                $this->db,
                'recordatori_retorn',
                $r['correu'],
                'Recordatori: finalització del préstec de ' . $r['id_material'],
                "Hola " . $r['nom_sollicitant'] . ",\n\nEt recordem que el préstec de " . $r['id_material']
                . ' finalitza el ' . $r['data_retorn'] . ".\n\nContingut a revisar:\n" . ($material['contingut'] ?? '')
                . "\n\nEquip del Centre de Recursos Pedagògics",
                $r['id_reserva']
            );
            $enviades++;
        }

        $this->db->insert('registre', [
            'id' => bin2hex(random_bytes(8)),
            'data_hora' => gmdate('c'),
            'correu' => $usuari,
            'accio' => 'recordatoris',
            'id_reserva' => null,
            'detall' => $processades . ' processades, ' . $enviades . ' enviades',
        ]);

        return ['processades' => $processades, 'enviades' => $enviades];
    }

    public function exportCsv(): string
    {
        $materials = $this->db->all('SELECT * FROM materials ORDER BY id');
        $reserves = $this->db->all('SELECT * FROM reserves ORDER BY id_reserva');

        $linies = ['### PESTANYA 1: MATERIALS ###'];
        $linies[] = 'ID_Material,Nom,Tipus,Ambit,URL_Imatge,Descripcio,Contingut_Maleta,URL_Guia_Drive,Model_Prestec,Estat_General';
        foreach ($materials as $m) {
            $linies[] = implode(',', array_map([self::class, 'csv'], [
                $m['id'], $m['nom'], $m['tipus'], $m['ambit'], $m['url_imatge'],
                $m['descripcio'], $m['contingut'], $m['url_guia'], $m['model_prestec'], $m['estat_general'],
            ]));
        }

        $linies[] = '';
        $linies[] = '### PESTANYA 3: DISPONIBILITAT_I_RESERVES ###';
        $linies[] = 'ID_Reserva,ID_Material,Tipus,Torn_Assignat,Data_Inici,Data_Fi,Nom_Sollicitant,Centre,Municipi,Correu,Observacions,Estat,Data_Hora_Recollida';
        foreach ($reserves as $r) {
            $linies[] = implode(',', array_map([self::class, 'csv'], [
                $r['id_reserva'], $r['id_material'], $r['tipus'], $r['torn_assignat'],
                $r['data_inici_setmana'], $r['data_fi_setmana'], $r['nom_sollicitant'], $r['centre'],
                $r['municipi'], $r['correu'], $r['observacions'], $r['estat'], $r['data_hora_recollida'],
            ]));
        }

        return implode("\r\n", $linies) . "\r\n";
    }

    private static function csv(mixed $v): string
    {
        $s = (string) ($v ?? '');
        if (preg_match('/^[=+\-@]/', $s)) {
            $s = "'" . $s;
        }
        return '"' . str_replace('"', '""', $s) . '"';
    }

    // ---------- Notificacions i auditoria ----------

    private function notificaAvisCrp(Db $db, array $reserva, array $material): void
    {
        $periode = $reserva['tornAssignat']
            ? 'Torn ' . $reserva['tornAssignat']
            : $reserva['dataIniciSetmana'] . ' fins ' . $reserva['dataFiSetmana'];

        $this->notifica(
            $db,
            'avis_crp',
            (string) $this->config['correu_crp'],
            'Nova sol·licitud de préstec: ' . $material['id'] . ' - ' . $reserva['centreEducatiu'],
            "S'ha rebut una nova petició de préstec:\n\n"
            . '• Codi reserva: ' . $reserva['idReserva'] . "\n"
            . '• Material: ' . $material['nom'] . ' (' . $material['id'] . ")\n"
            . '• Sol·licitant: ' . $reserva['nomSollicitant'] . "\n"
            . '• Centre: ' . $reserva['centreEducatiu'] . ' (' . $reserva['municipi'] . ")\n"
            . '• Període: ' . $periode . "\n"
            . '• Contacte: ' . $reserva['correu'] . "\n\n"
            . 'Accedeix al panell del CRP per validar-la.',
            $reserva['idReserva']
        );
    }

    private function notifica(Db $db, string $tipus, string $destinatari, string $assumpte, string $cos, string $idReserva): void
    {
        $id = 'NOTIF-' . gmdate('YmdHis') . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
        $db->insert('notificacions', [
            'id' => $id,
            'data_hora' => gmdate('c'),
            'tipus' => $tipus,
            'destinatari' => $destinatari,
            'assumpte' => $assumpte,
            'cos' => $cos,
            'id_reserva' => $idReserva,
        ]);
        $this->correu->enviar($destinatari, $assumpte, $cos);
    }

    private function audita(Db $db, string $correu, string $accio, ?string $idReserva, ?string $detall): void
    {
        $db->insert('registre', [
            'id' => bin2hex(random_bytes(8)),
            'data_hora' => gmdate('c'),
            'correu' => $correu,
            'accio' => $accio,
            'id_reserva' => $idReserva,
            'detall' => $detall,
        ]);
    }
}
