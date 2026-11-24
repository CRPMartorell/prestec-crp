<?php
declare(strict_types=1);

final class Http
{
    public static function json(mixed $dades, int $codi = 200): never
    {
        http_response_code($codi);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        echo json_encode($dades, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $missatge, int $codi = 400, array $extra = []): never
    {
        self::json(array_merge(['ok' => false, 'error' => $missatge], $extra), $codi);
    }

    /** @return array<string,mixed> */
    public static function cos(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '') {
            return [];
        }
        $dades = json_decode($raw, true);
        if (!is_array($dades)) {
            self::error('El cos de la petició no és JSON vàlid', 400);
        }
        return $dades;
    }

    public static function metode(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function ruta(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        return rtrim($path, '/') === '' ? '/' : rtrim($path, '/');
    }

    public static function query(string $clau, ?string $defecte = null): ?string
    {
        $v = $_GET[$clau] ?? null;
        return is_string($v) ? $v : $defecte;
    }

    public static function text(mixed $valor, string $camp, int $max = 500): string
    {
        if (!is_string($valor)) {
            Http::error('Falta el camp ' . $camp, 422);
        }
        $valor = trim($valor);
        if ($valor === '') {
            Http::error('El camp ' . $camp . ' és obligatori', 422);
        }
        if (mb_strlen($valor) > $max) {
            Http::error('El camp ' . $camp . ' és massa llarg', 422);
        }
        return $valor;
    }

    /** Camp de text que pot quedar buit (descripcions, observacions…). */
    public static function textOpcional(mixed $valor, string $camp, int $max = 500): string
    {
        if ($valor === null) {
            return '';
        }
        if (!is_string($valor)) {
            Http::error('El camp ' . $camp . ' ha de ser text', 422);
        }
        $valor = trim($valor);
        if (mb_strlen($valor) > $max) {
            Http::error('El camp ' . $camp . ' és massa llarg', 422);
        }
        return $valor;
    }
}
