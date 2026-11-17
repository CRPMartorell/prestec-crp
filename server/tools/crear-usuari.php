<?php
declare(strict_types=1);

/**
 * Crea o actualitza un usuari del panell.
 *
 *   php server/tools/crear-usuari.php <correu> <contrasenya> [nom]
 *   npm run crear-usuari -- crp@example.cat la-meva-contrasenya "Personal del CRP"
 */

require_once __DIR__ . '/../src/bootstrap.php';

[$config, $db] = crp_bootstrap();

$correu = $argv[1] ?? '';
$contrasenya = $argv[2] ?? '';
$nom = $argv[3] ?? 'Personal del CRP';

if ($correu === '' || $contrasenya === '') {
    fwrite(STDERR, "Ús: php server/tools/crear-usuari.php <correu> <contrasenya> [nom]\n");
    exit(1);
}

if (!filter_var($correu, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "El correu no és vàlid.\n");
    exit(1);
}

if (strlen($contrasenya) < 10) {
    fwrite(STDERR, "La contrasenya ha de tenir com a mínim 10 caràcters.\n");
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

echo "Usuari desat: {$correu}\n";
