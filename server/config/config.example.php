<?php
// Copia aquest fitxer com a config.php i ajusta els valors.
// A Hetzner, les dades de MySQL les dona el panell konsoleH.

return [
    // 'mysql' a producció, 'sqlite' per desenvolupament local.
    'driver' => getenv('CRP_DB_DRIVER') ?: 'sqlite',

    // MySQL (Hetzner)
    'mysql' => [
        'host' => getenv('CRP_DB_HOST') ?: 'localhost',
        'port' => getenv('CRP_DB_PORT') ?: '3306',
        'name' => getenv('CRP_DB_NAME') ?: 'crp',
        'user' => getenv('CRP_DB_USER') ?: 'crp',
        'pass' => getenv('CRP_DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],

    // SQLite (local): ruta del fitxer de base de dades.
    'sqlite' => [
        'path' => getenv('CRP_DB_PATH') ?: __DIR__ . '/../var/crp.sqlite',
    ],

    // Correu del CRP i remitent.
    'correu_crp' => getenv('CRP_CORREU') ?: 'crp-martorell@xtec.cat',
    'remitent' => getenv('CRP_REMITENT') ?: 'no-reply@example.cat',

    // 'log' desa els correus a var/correus.log; 'mail' fa servir mail().
    'mail_transport' => getenv('CRP_MAIL') ?: 'log',

    // Mode: 'dev' mostra errors, 'prod' els amaga.
    'entorn' => getenv('CRP_ENTORN') ?: 'dev',

    // Només per a proves: permet crear la base des del navegador.
    'permet_install' => getenv('CRP_PERMET_INSTALL') === '1',
];
