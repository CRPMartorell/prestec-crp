<?php
declare(strict_types=1);

/**
 * Capa fina sobre PDO. El mateix codi funciona amb MySQL (producció a Hetzner)
 * i SQLite (desenvolupament local): les consultes són ANSI i els identificadors
 * són text, sense AUTO_INCREMENT.
 */
final class Db
{
    private PDO $pdo;
    private string $driver;

    public function __construct(array $config)
    {
        $this->driver = (string) $config['driver'];

        if ($this->driver === 'mysql') {
            $c = $config['mysql'];
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $c['host'],
                $c['port'],
                $c['name'],
                $c['charset']
            );
            $this->pdo = new PDO($dsn, $c['user'], $c['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } else {
            $path = (string) $config['sqlite']['path'];
            $dir = dirname($path);
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }
            $this->pdo = new PDO('sqlite:' . $path, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $this->pdo->exec('PRAGMA journal_mode = WAL');
            $this->pdo->exec('PRAGMA foreign_keys = ON');
        }
    }

    public function driver(): string
    {
        return $this->driver;
    }

    /** @return list<array<string,mixed>> */
    public function all(string $sql, array $params = []): array
    {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        return $st->fetchAll() ?: [];
    }

    /** @return array<string,mixed>|null */
    public function one(string $sql, array $params = []): ?array
    {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        $row = $st->fetch();
        return $row === false ? null : $row;
    }

    public function val(string $sql, array $params = []): mixed
    {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        $v = $st->fetchColumn();
        return $v === false ? null : $v;
    }

    public function run(string $sql, array $params = []): int
    {
        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        return $st->rowCount();
    }

    /** @param array<string,mixed> $row */
    public function insert(string $table, array $row): void
    {
        $cols = array_keys($row);
        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            $table,
            implode(', ', $cols),
            implode(', ', array_map(fn ($c) => ':' . $c, $cols))
        );
        $this->run($sql, $row);
    }

    /** @param array<string,mixed> $row */
    public function update(string $table, array $row, string $whereSql, array $whereParams = []): void
    {
        $sets = implode(', ', array_map(fn ($c) => $c . ' = :' . $c, array_keys($row)));
        $sql = sprintf('UPDATE %s SET %s WHERE %s', $table, $sets, $whereSql);
        $this->run($sql, array_merge($row, $whereParams));
    }

    /**
     * Executa $fn dins d'una transacció. En SQLite fa servir BEGIN IMMEDIATE
     * per bloquejar escriptures concurrents; en MySQL, transacció normal.
     */
    public function transaccio(callable $fn): mixed
    {
        if ($this->driver === 'sqlite') {
            $this->pdo->exec('BEGIN IMMEDIATE');
        } else {
            $this->pdo->beginTransaction();
        }

        try {
            $resultat = $fn($this);
            if ($this->driver === 'sqlite') {
                $this->pdo->exec('COMMIT');
            } else {
                $this->pdo->commit();
            }
            return $resultat;
        } catch (Throwable $e) {
            if ($this->driver === 'sqlite') {
                $this->pdo->exec('ROLLBACK');
            } elseif ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /** Bloqueja una fila per a escriptura (només MySQL). */
    public function bloquejaMysql(string $table, string $id): void
    {
        if ($this->driver === 'mysql') {
            $this->one('SELECT id FROM ' . $table . ' WHERE id = :id FOR UPDATE', ['id' => $id]);
        }
    }
}
