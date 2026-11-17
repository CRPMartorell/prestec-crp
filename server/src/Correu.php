<?php
declare(strict_types=1);

/**
 * Enviament de correu. En producció fa servir mail() del hosting; en
 * desenvolupament escriu a var/correus.log per no enviar res de debò.
 */
final class Correu
{
    public function __construct(private array $config)
    {
    }

    public function enviar(string $destinatari, string $assumpte, string $cos): bool
    {
        $transport = (string) ($this->config['mail_transport'] ?? 'log');

        if ($transport === 'mail') {
            $capçaleres = [
                'From: ' . $this->config['remitent'],
                'Reply-To: ' . $this->config['correu_crp'],
                'Content-Type: text/plain; charset=UTF-8',
                'MIME-Version: 1.0',
            ];
            return @mail($destinatari, $assumpte, $cos, implode("\r\n", $capçaleres));
        }

        $dir = __DIR__ . '/../var';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $linia = sprintf(
            "[%s] A: %s\nAssumpte: %s\n%s\n%s\n",
            gmdate('c'),
            $destinatari,
            $assumpte,
            str_repeat('-', 60),
            $cos
        );
        return file_put_contents($dir . '/correus.log', $linia, FILE_APPEND) !== false;
    }
}
