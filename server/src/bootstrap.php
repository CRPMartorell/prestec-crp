<?php
declare(strict_types=1);

/**
 * Carrega la configuració i construeix les peces del backend.
 * Retorna [config, Db, Crp].
 */
function crp_bootstrap(): array
{
    require_once __DIR__ . '/Db.php';
    require_once __DIR__ . '/Http.php';
    require_once __DIR__ . '/Auth.php';
    require_once __DIR__ . '/Correu.php';
    require_once __DIR__ . '/Seed.php';
    require_once __DIR__ . '/Crp.php';

    $fitxer = __DIR__ . '/../config/config.php';
    $config = is_file($fitxer)
        ? require $fitxer
        : require __DIR__ . '/../config/config.example.php';

    if (($config['entorn'] ?? 'dev') === 'prod') {
        ini_set('display_errors', '0');
        error_reporting(E_ALL);
    } else {
        ini_set('display_errors', '1');
        error_reporting(E_ALL);
    }

    $db = new Db($config);
    $correu = new Correu($config);
    $crp = new Crp($db, $config, $correu);

    return [$config, $db, $crp];
}
