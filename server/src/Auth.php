<?php
declare(strict_types=1);

/**
 * Autenticació per sessió de PHP. Els usuaris viuen a la taula `usuaris`
 * amb contrasenya xifrada amb password_hash().
 */
final class Auth
{
    public static function inici(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => (($_SERVER['HTTPS'] ?? '') === 'on'),
        ]);
        session_name('crp_sessio');
        session_start();
    }

    /** @return array<string,mixed>|null */
    public static function usuari(): ?array
    {
        self::inici();
        $correu = $_SESSION['correu'] ?? null;
        return is_string($correu) ? ['correu' => $correu, 'nom' => $_SESSION['nom'] ?? ''] : null;
    }

    public static function login(Db $db, string $correu, string $contrasenya): bool
    {
        $fila = $db->one(
            'SELECT correu, nom, hash, actiu FROM usuaris WHERE correu = :c',
            ['c' => $correu]
        );

        if ($fila === null || (int) $fila['actiu'] !== 1) {
            return false;
        }
        if (!password_verify($contrasenya, (string) $fila['hash'])) {
            return false;
        }

        self::inici();
        session_regenerate_id(true);
        $_SESSION['correu'] = $fila['correu'];
        $_SESSION['nom'] = $fila['nom'];
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
        return true;
    }

    public static function logout(): void
    {
        self::inici();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'] ?? '', (bool) ($p['secure'] ?? false), (bool) ($p['httponly'] ?? true));
        }
        session_destroy();
    }

    /** @return array{correu:string,nom:string} */
    public static function exigeix(): array
    {
        $u = self::usuari();
        if ($u === null) {
            Http::error('Cal iniciar sessió', 401);
        }
        return ['correu' => (string) $u['correu'], 'nom' => (string) $u['nom']];
    }

    public static function csrf(): string
    {
        self::inici();
        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(24));
        }
        return (string) $_SESSION['csrf'];
    }

    public static function comprovaCsrf(): void
    {
        self::inici();
        $enviats = $_SERVER['HTTP_X_CSRF'] ?? '';
        $esperat = (string) ($_SESSION['csrf'] ?? '');
        if ($esperat === '' || !hash_equals($esperat, (string) $enviats)) {
            Http::error('Token CSRF invàlid', 403);
        }
    }
}
