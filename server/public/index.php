<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

[$config, $db, $crp] = crp_bootstrap();

set_exception_handler(function (Throwable $e) use ($config): void {
    error_log('[crp] ' . $e->getMessage());
    $detall = ($config['entorn'] ?? 'dev') === 'dev' ? $e->getMessage() : 'Error intern del servidor';
    Http::json(['ok' => false, 'error' => $detall], 500);
});

$metode = Http::metode();
$ruta = Http::ruta();

// Servir fitxers estàtics amb el servidor incrustat de PHP (desenvolupament).
if (!str_starts_with($ruta, '/api')) {
    $fitxer = __DIR__ . $ruta;
    if ($ruta !== '/' && is_file($fitxer)) {
        return false;
    }
    if ($ruta === '/') {
        readfile(__DIR__ . '/index.html');
        exit;
    }
}

if (!str_starts_with($ruta, '/api')) {
    Http::error('No trobat', 404);
}

$api = substr($ruta, 4) ?: '/';
$part = array_values(array_filter(explode('/', $api)));

try {
    // --- Públic ---
    if ($metode === 'GET' && $api === '/cataleg') {
        Http::json(['ok' => true, 'data' => $crp->cataleg()]);
    }

    if ($metode === 'GET' && $api === '/sessio') {
        $u = Auth::usuari();
        Http::json([
            'ok' => true,
            'data' => [
                'autenticat' => $u !== null,
                'correu' => $u['correu'] ?? null,
                'nom' => $u['nom'] ?? null,
                'csrf' => Auth::csrf(),
            ],
        ]);
    }

    if ($metode === 'POST' && $api === '/login') {
        $d = Http::cos();
        $correu = Http::text($d['correu'] ?? null, 'correu', 200);
        $contrasenya = is_string($d['contrasenya'] ?? null) ? $d['contrasenya'] : '';

        if (!Auth::login($db, $correu, $contrasenya)) {
            usleep(300000);
            Http::error('Credencials incorrectes', 401);
        }

        Http::json(['ok' => true, 'data' => ['correu' => $correu, 'csrf' => Auth::csrf()]]);
    }

    if ($metode === 'POST' && $api === '/logout') {
        Auth::logout();
        Http::json(['ok' => true, 'data' => true]);
    }

    if ($metode === 'POST' && $api === '/reserves') {
        Http::json(['ok' => true, 'data' => $crp->crearReserva(Http::cos(), $_SERVER['REMOTE_ADDR'] ?? '')], 201);
    }

    // Només per a entorns de prova (Playwright): reinicia les dades.
    if ($metode === 'POST' && $api === '/test/reset' && getenv('CRP_TEST_RESET') === '1') {
        Seed::buidar($db);
        Seed::sembrar($db);
        Http::json(['ok' => true, 'data' => true]);
    }

    // --- Privat ---
    $usuari = Auth::exigeix();

    if (in_array($metode, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        Auth::comprovaCsrf();
    }

    if ($metode === 'GET' && $api === '/panell') {
        Http::json(['ok' => true, 'data' => $crp->panell()]);
    }

    if ($metode === 'POST' && count($part) === 3 && $part[0] === 'reserves' && $part[2] === 'validar') {
        $d = Http::cos();
        $estat = Http::text($d['estat'] ?? null, 'estat', 30);
        $recollida = isset($d['dataHoraRecollida']) && is_string($d['dataHoraRecollida'])
            ? mb_substr($d['dataHoraRecollida'], 0, 120)
            : null;

        $crp->validarReserva($part[1], $estat, $recollida, $usuari['correu']);
        Http::json(['ok' => true, 'data' => true]);
    }

    if ($metode === 'POST' && $api === '/materials') {
        Http::json(['ok' => true, 'data' => $crp->desarMaterial(Http::cos(), $usuari['correu'])]);
    }

    if ($metode === 'DELETE' && count($part) === 2 && $part[0] === 'materials') {
        $crp->eliminarMaterial($part[1], $usuari['correu']);
        Http::json(['ok' => true, 'data' => true]);
    }

    if ($metode === 'POST' && $api === '/recordatoris') {
        Http::json(['ok' => true, 'data' => $crp->recordatoris($usuari['correu'])]);
    }

    if ($metode === 'GET' && $api === '/export.csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="CRP_Inventari_Reserves_' . date('Y-m-d') . '.csv"');
        echo $crp->exportCsv();
        exit;
    }

    Http::error('Ruta no trobada', 404);
} catch (Throwable $e) {
    error_log('[crp] ' . $e->getMessage());
    $detall = ($config['entorn'] ?? 'dev') === 'dev' ? $e->getMessage() : 'Error intern del servidor';
    Http::json(['ok' => false, 'error' => $detall], 500);
}
