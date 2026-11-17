<?php
declare(strict_types=1);

/**
 * Càrrega de dades d'exemple. S'usa des de tools/install.php i, només en
 * entorns de prova (CRP_TEST_RESET=1), des de l'endpoint de reinici.
 */
final class Seed
{
    public static function buidar(Db $db): void
    {
        foreach (['reserves', 'notificacions', 'registre', 'materials', 'torns', 'config'] as $taula) {
            $db->run('DELETE FROM ' . $taula);
        }
    }

    public static function sembrar(Db $db): void
    {
        $seed = json_decode((string) file_get_contents(__DIR__ . '/../data/seed.json'), true);

        foreach ($seed['materials'] as $m) {
            $db->insert('materials', [
                'id' => $m['id'],
                'nom' => $m['nom'],
                'tipus' => $m['tipus'],
                'ambit' => $m['ambit'],
                'url_imatge' => $m['urlImatge'],
                'descripcio' => $m['descripcio'],
                'contingut' => $m['contingutMaleta'],
                'url_guia' => $m['urlGuiaDrive'],
                'model_prestec' => $m['modelPrestec'],
                'estat_general' => $m['estatGeneral'],
            ]);
        }

        foreach ($seed['torns'] as $t) {
            $db->insert('torns', [
                'id' => $t['id'],
                'nom' => $t['nom'],
                'data_inici' => $t['dataInici'],
                'data_final' => $t['dataFinal'],
                'data_inici_iso' => $t['dataIniciISO'],
                'data_final_iso' => $t['dataFinalISO'],
            ]);
        }

        foreach ($seed['reserves'] as $r) {
            $db->insert('reserves', [
                'id_reserva' => $r['idReserva'],
                'id_material' => $r['idMaterial'],
                'tipus' => $r['tipus'],
                'torn_assignat' => $r['tornAssignat'] ?? null,
                'data_inici_setmana' => $r['dataIniciSetmana'] ?? null,
                'data_fi_setmana' => $r['dataFiSetmana'] ?? null,
                'nom_sollicitant' => $r['nomSollicitant'],
                'centre' => $r['centreEducatiu'],
                'municipi' => $r['municipi'],
                'correu' => $r['correu'],
                'telefon' => $r['telefon'],
                'observacions' => $r['observacions'] ?? '',
                'estat' => $r['estatReserva'],
                'data_hora_recollida' => $r['dataHoraRecollida'] ?? null,
                'data_creacio' => $r['dataCreacio'],
                'data_retorn' => $r['dataRetornPrevista'] ?? null,
            ]);
        }

        $db->insert('config', ['clau' => 'reserva_counter', 'valor' => '5']);
    }
}
