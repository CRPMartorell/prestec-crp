<?php
declare(strict_types=1);

/**
 * Prepara la base de dades: esquema + dades d'exemple + usuari del CRP.
 *
 *   php server/tools/install.php            # crea l'esquema i les dades si cal
 *   php server/tools/install.php --fresh    # esborra i torna a crear-ho tot
 *
 * Variables opcionals:
 *   CRP_ADMIN_CORREU, CRP_ADMIN_CONTRASENYA, CRP_ADMIN_NOM
 */

require_once __DIR__ . '/../src/bootstrap.php';

[$config, $db, $crp] = crp_bootstrap();

$fresh = in_array('--fresh', $argv ?? [], true);
$driver = $db->driver();

echo "Motor: {$driver}\n";

if ($driver === 'sqlite' && $fresh) {
    $path = $config['sqlite']['path'];
    if (is_file($path)) {
        // Si un servidor de proves encara té el fitxer obert, es buida en lloc
        // d'esborlar-lo; l'esquema torna a crear les taules igualment.
        if (!@unlink($path)) {
            file_put_contents($path, '');
        }
        echo "Esborrada la base SQLite anterior\n";
    }
    $db = new Db($config);
}

$esquema = __DIR__ . '/../sql/schema.' . ($driver === 'mysql' ? 'mysql' : 'sqlite') . '.sql';
$sql = file_get_contents($esquema);
if ($sql === false) {
    fwrite(STDERR, "No trobo l'esquema: {$esquema}\n");
    exit(1);
}

$sentencies = array_filter(array_map('trim', preg_split('/;\s*\n/', $sql)));
$conn = new PDO(
    $driver === 'mysql'
        ? sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['mysql']['host'], $config['mysql']['port'], $config['mysql']['name'])
        : 'sqlite:' . $config['sqlite']['path'],
    $driver === 'mysql' ? $config['mysql']['user'] : null,
    $driver === 'mysql' ? $config['mysql']['pass'] : null,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

foreach ($sentencies as $sentencia) {
    $conn->exec($sentencia);
}
echo 'Esquema aplicat (' . count($sentencies) . " sentències)\n";

// ---------- Dades d'exemple ----------

$teDades = (int) $db->val('SELECT COUNT(*) FROM materials') > 0;
if ($teDades && !$fresh) {
    echo "Ja hi havia materials; no toco les dades\n";
} else {
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
    echo "Dades d'exemple inserides: 10 materials, 6 torns, 5 reserves\n";
}

// ---------- Usuari del CRP ----------

$correu = getenv('CRP_ADMIN_CORREU') ?: '';
if ($correu !== '') {
    $contrasenya = getenv('CRP_ADMIN_CONTRASENYA') ?: '';
    $nom = getenv('CRP_ADMIN_NOM') ?: 'Personal del CRP';

    if (strlen($contrasenya) < 10) {
        fwrite(STDERR, "La contrasenya ha de tenir com a mínim 10 caràcters\n");
        exit(1);
    }

    $db->run('DELETE FROM usuaris WHERE correu = :c', ['c' => $correu]);
    $db->insert('usuaris', [
        'correu' => $correu,
        'nom' => $nom,
        'hash' => password_hash($contrasenya, PASSWORD_DEFAULT),
        'actiu' => 1,
        'creat' => gmdate('c'),
    ]);
    echo "Usuari creat: {$correu}\n";
}

echo "Fet. Comprova-ho amb: php -S 127.0.0.1:8080 -t server/public server/public/index.php\n";
