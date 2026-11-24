-- Mateix esquema lògic per a SQLite (desenvolupament i proves locals).

CREATE TABLE IF NOT EXISTS materials (
  id            TEXT NOT NULL PRIMARY KEY,
  nom           TEXT NOT NULL,
  tipus         TEXT NOT NULL,
  ambit         TEXT NOT NULL,
  url_imatge    TEXT NOT NULL,
  descripcio    TEXT NOT NULL,
  contingut     TEXT NOT NULL,
  url_guia      TEXT NOT NULL,
  model_prestec TEXT NOT NULL,
  estat_general TEXT NOT NULL,
  mostra_contingut INTEGER NULL DEFAULT 1,
  mostra_guia     INTEGER NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS torns (
  id             TEXT NOT NULL PRIMARY KEY,
  nom            TEXT NOT NULL,
  data_inici     TEXT NOT NULL,
  data_final     TEXT NOT NULL,
  data_inici_iso TEXT NOT NULL,
  data_final_iso TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reserves (
  id_reserva          TEXT NOT NULL PRIMARY KEY,
  id_material         TEXT NOT NULL,
  tipus               TEXT NOT NULL,
  torn_assignat       TEXT NULL,
  data_inici_setmana  TEXT NULL,
  data_fi_setmana     TEXT NULL,
  nom_sollicitant     TEXT NOT NULL,
  centre              TEXT NOT NULL,
  municipi            TEXT NOT NULL,
  correu              TEXT NOT NULL,
  observacions        TEXT NULL,
  estat               TEXT NOT NULL,
  data_hora_recollida TEXT NULL,
  data_creacio        TEXT NOT NULL,
  data_retorn         TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_material_torn ON reserves (id_material, torn_assignat);
CREATE INDEX IF NOT EXISTS idx_estat ON reserves (estat);

CREATE TABLE IF NOT EXISTS notificacions (
  id          TEXT NOT NULL PRIMARY KEY,
  data_hora   TEXT NOT NULL,
  tipus       TEXT NOT NULL,
  destinatari TEXT NOT NULL,
  assumpte    TEXT NOT NULL,
  cos         TEXT NOT NULL,
  id_reserva  TEXT NULL
);

CREATE TABLE IF NOT EXISTS usuaris (
  correu TEXT NOT NULL PRIMARY KEY,
  nom    TEXT NOT NULL,
  hash   TEXT NOT NULL,
  actiu  INTEGER NOT NULL DEFAULT 1,
  creat  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registre (
  id         TEXT NOT NULL PRIMARY KEY,
  data_hora  TEXT NOT NULL,
  correu     TEXT NOT NULL,
  accio      TEXT NOT NULL,
  id_reserva TEXT NULL,
  detall     TEXT NULL
);

CREATE TABLE IF NOT EXISTS config (
  clau  TEXT NOT NULL PRIMARY KEY,
  valor TEXT NOT NULL
);
