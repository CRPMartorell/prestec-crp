-- Esquema per a MySQL (Hetzner Webhosting). utf8mb4, InnoDB.
-- Els identificadors són text: no hi ha AUTO_INCREMENT i el mateix esquema
-- funciona a SQLite (vegeu schema.sqlite.sql).

CREATE TABLE IF NOT EXISTS materials (
  id            VARCHAR(20)  NOT NULL PRIMARY KEY,
  nom           VARCHAR(200) NOT NULL,
  tipus         VARCHAR(40)  NOT NULL,
  ambit         VARCHAR(80)  NOT NULL,
  url_imatge    VARCHAR(600) NOT NULL,
  descripcio    TEXT         NOT NULL,
  contingut     TEXT         NOT NULL,
  url_guia      VARCHAR(600) NOT NULL,
  model_prestec VARCHAR(20)  NOT NULL,
  estat_general VARCHAR(30)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS torns (
  id             VARCHAR(10) NOT NULL PRIMARY KEY,
  nom            VARCHAR(40) NOT NULL,
  data_inici     VARCHAR(10) NOT NULL,
  data_final     VARCHAR(10) NOT NULL,
  data_inici_iso VARCHAR(10) NOT NULL,
  data_final_iso VARCHAR(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reserves (
  id_reserva          VARCHAR(20)  NOT NULL PRIMARY KEY,
  id_material         VARCHAR(20)  NOT NULL,
  tipus               VARCHAR(40)  NOT NULL,
  torn_assignat       VARCHAR(10)  NULL,
  data_inici_setmana  VARCHAR(10)  NULL,
  data_fi_setmana     VARCHAR(10)  NULL,
  nom_sollicitant     VARCHAR(200) NOT NULL,
  centre              VARCHAR(200) NOT NULL,
  municipi            VARCHAR(120) NOT NULL,
  correu              VARCHAR(200) NOT NULL,
  telefon             VARCHAR(40)  NOT NULL,
  observacions        TEXT         NULL,
  estat               VARCHAR(30)  NOT NULL,
  data_hora_recollida VARCHAR(120) NULL,
  data_creacio        VARCHAR(40)  NOT NULL,
  data_retorn         VARCHAR(10)  NULL,
  INDEX idx_material_torn (id_material, torn_assignat),
  INDEX idx_estat (estat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notificacions (
  id          VARCHAR(60)  NOT NULL PRIMARY KEY,
  data_hora   VARCHAR(40)  NOT NULL,
  tipus       VARCHAR(40)  NOT NULL,
  destinatari VARCHAR(200) NOT NULL,
  assumpte    VARCHAR(300) NOT NULL,
  cos         TEXT         NOT NULL,
  id_reserva  VARCHAR(20)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuaris (
  correu VARCHAR(200) NOT NULL PRIMARY KEY,
  nom    VARCHAR(200) NOT NULL,
  hash   VARCHAR(255) NOT NULL,
  actiu  TINYINT(1)   NOT NULL DEFAULT 1,
  creat  VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registre (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY,
  data_hora  VARCHAR(40)  NOT NULL,
  correu     VARCHAR(200) NOT NULL,
  accio      VARCHAR(60)  NOT NULL,
  id_reserva VARCHAR(20)  NULL,
  detall     TEXT         NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS config (
  clau  VARCHAR(60) NOT NULL PRIMARY KEY,
  valor TEXT        NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
