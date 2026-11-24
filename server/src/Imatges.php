<?php
declare(strict_types=1);

/**
 * Pujada d'imatges dels materials. Desa el fitxer a la carpeta configurada i
 * retorna la URL relativa que s'ha de guardar a `url_imatge`.
 *
 * Límit i formats pensats per a una fitxa de catàleg: 3 MB, JPG/PNG/WebP.
 */
final class Imatges
{
    private const TIPUS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    private const MAX_BYTES = 3 * 1024 * 1024;

    public function __construct(private array $config)
    {
    }

    /** @param array<string,mixed> $fitxer Entrada de $_FILES */
    public function desar(array $fitxer): string
    {
        $error = (int) ($fitxer['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error !== UPLOAD_ERR_OK) {
            Http::error('No s\'ha rebut cap imatge o la pujada ha fallat', 422);
        }

        if ((int) ($fitxer['size'] ?? 0) > self::MAX_BYTES) {
            Http::error('La imatge pesa massa: el màxim és 3 MB', 413);
        }

        $temporal = (string) ($fitxer['tmp_name'] ?? '');
        $info = @getimagesize($temporal);
        if ($info === false) {
            Http::error('El fitxer no sembla una imatge vàlida', 422);
        }

        $mime = (string) ($info['mime'] ?? '');
        if (!isset(self::TIPUS[$mime])) {
            Http::error('Format no permès. Fes servir JPG, PNG o WebP', 422);
        }

        $dir = (string) ($this->config['uploads_dir'] ?? __DIR__ . '/../public/uploads');
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            Http::error('No s\'ha pogut preparar la carpeta d\'imatges', 500);
        }

        $nom = 'mat-' . bin2hex(random_bytes(8)) . '.' . self::TIPUS[$mime];
        if (!move_uploaded_file($temporal, $dir . '/' . $nom)) {
            Http::error('No s\'ha pogut desar la imatge', 500);
        }

        $base = (string) ($this->config['uploads_url'] ?? '/uploads');

        return rtrim($base, '/') . '/' . $nom;
    }
}
