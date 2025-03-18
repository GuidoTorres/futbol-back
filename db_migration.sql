-- Script de migración para la base de datos
-- Ejecutar este script para actualizar el esquema de la base de datos

-- 1. Crear tabla de países
CREATE TABLE IF NOT EXISTS `Countries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(2) NULL,
  `code3` VARCHAR(3) NULL,
  `region` VARCHAR(255) NULL,
  `flag` VARCHAR(255) NULL,
  `sofaScoreId` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Crear tabla de transferencias
CREATE TABLE IF NOT EXISTS `Transfers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `transferDate` DATE NULL,
  `type` VARCHAR(255) NULL,
  `fee` VARCHAR(255) NULL,
  `currency` VARCHAR(50) NULL,
  `season` VARCHAR(50) NULL,
  `playerId` INT NOT NULL,
  `fromTeamId` INT NULL,
  `toTeamId` INT NOT NULL,
  `sofaScoreId` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `player_idx` (`playerId`),
  INDEX `from_team_idx` (`fromTeamId`),
  INDEX `to_team_idx` (`toTeamId`),
  CONSTRAINT `fk_transfers_player`
    FOREIGN KEY (`playerId`)
    REFERENCES `Players` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_transfers_from_team`
    FOREIGN KEY (`fromTeamId`)
    REFERENCES `Teams` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_transfers_to_team`
    FOREIGN KEY (`toTeamId`)
    REFERENCES `Teams` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Crear tabla de relación entre equipos y ligas
CREATE TABLE IF NOT EXISTS `TeamLeagues` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `teamId` INT NOT NULL,
  `leagueId` INT NOT NULL,
  `season` VARCHAR(50) NULL,
  `status` ENUM('active', 'relegated', 'promoted', 'inactive') DEFAULT 'active',
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `team_league_season_unique` (`teamId`, `leagueId`, `season`),
  INDEX `team_idx` (`teamId`),
  INDEX `league_idx` (`leagueId`),
  CONSTRAINT `fk_teamleagues_team`
    FOREIGN KEY (`teamId`)
    REFERENCES `Teams` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_teamleagues_league`
    FOREIGN KEY (`leagueId`)
    REFERENCES `Leagues` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Agregar nuevas columnas a la tabla Teams (solo las que no existan)
-- Debemos hacer esto sin procedimientos almacenados para compatibilidad
-- Verificar y agregar columna countryId a Teams
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Teams' AND COLUMN_NAME = 'countryId';
SET @query = IF(@exists = 0, 'ALTER TABLE `Teams` ADD COLUMN `countryId` INT NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna slug a Teams
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Teams' AND COLUMN_NAME = 'slug';
SET @query = IF(@exists = 0, 'ALTER TABLE `Teams` ADD COLUMN `slug` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna city a Teams
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Teams' AND COLUMN_NAME = 'city';
SET @query = IF(@exists = 0, 'ALTER TABLE `Teams` ADD COLUMN `city` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna stadiumCapacity a Teams
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Teams' AND COLUMN_NAME = 'stadiumCapacity';
SET @query = IF(@exists = 0, 'ALTER TABLE `Teams` ADD COLUMN `stadiumCapacity` INT NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna manager a Teams
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Teams' AND COLUMN_NAME = 'manager';
SET @query = IF(@exists = 0, 'ALTER TABLE `Teams` ADD COLUMN `manager` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna primaryColor a Teams
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Teams' AND COLUMN_NAME = 'primaryColor';
SET @query = IF(@exists = 0, 'ALTER TABLE `Teams` ADD COLUMN `primaryColor` VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna secondaryColor a Teams
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Teams' AND COLUMN_NAME = 'secondaryColor';
SET @query = IF(@exists = 0, 'ALTER TABLE `Teams` ADD COLUMN `secondaryColor` VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna sofaScoreId a Teams
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Teams' AND COLUMN_NAME = 'sofaScoreId';
SET @query = IF(@exists = 0, 'ALTER TABLE `Teams` ADD COLUMN `sofaScoreId` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Agregar nuevas columnas a la tabla Players
-- Verificar y agregar columna fullName a Players
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'fullName';
SET @query = IF(@exists = 0, 'ALTER TABLE `Players` ADD COLUMN `fullName` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna shortName a Players
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'shortName';
SET @query = IF(@exists = 0, 'ALTER TABLE `Players` ADD COLUMN `shortName` VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna positionCategory a Players
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'positionCategory';
SET @query = IF(@exists = 0, 'ALTER TABLE `Players` ADD COLUMN `positionCategory` VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna nationalityId a Players
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'nationalityId';
SET @query = IF(@exists = 0, 'ALTER TABLE `Players` ADD COLUMN `nationalityId` INT NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna slug a Players
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'slug';
SET @query = IF(@exists = 0, 'ALTER TABLE `Players` ADD COLUMN `slug` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna marketValue a Players
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'marketValue';
SET @query = IF(@exists = 0, 'ALTER TABLE `Players` ADD COLUMN `marketValue` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna contractUntil a Players
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'contractUntil';
SET @query = IF(@exists = 0, 'ALTER TABLE `Players` ADD COLUMN `contractUntil` DATE NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna sofaScoreId a Players
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'sofaScoreId';
SET @query = IF(@exists = 0, 'ALTER TABLE `Players` ADD COLUMN `sofaScoreId` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Agregar nuevas columnas a la tabla Leagues
-- Verificar y agregar columna shortName a Leagues
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Leagues' AND COLUMN_NAME = 'shortName';
SET @query = IF(@exists = 0, 'ALTER TABLE `Leagues` ADD COLUMN `shortName` VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna slug a Leagues
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Leagues' AND COLUMN_NAME = 'slug';
SET @query = IF(@exists = 0, 'ALTER TABLE `Leagues` ADD COLUMN `slug` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna countryId a Leagues
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Leagues' AND COLUMN_NAME = 'countryId';
SET @query = IF(@exists = 0, 'ALTER TABLE `Leagues` ADD COLUMN `countryId` INT NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna primaryColor a Leagues
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Leagues' AND COLUMN_NAME = 'primaryColor';
SET @query = IF(@exists = 0, 'ALTER TABLE `Leagues` ADD COLUMN `primaryColor` VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna secondaryColor a Leagues
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Leagues' AND COLUMN_NAME = 'secondaryColor';
SET @query = IF(@exists = 0, 'ALTER TABLE `Leagues` ADD COLUMN `secondaryColor` VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna sofaScoreId a Leagues
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Leagues' AND COLUMN_NAME = 'sofaScoreId';
SET @query = IF(@exists = 0, 'ALTER TABLE `Leagues` ADD COLUMN `sofaScoreId` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar y agregar columna sofaScoreSeasonId a Leagues
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Leagues' AND COLUMN_NAME = 'sofaScoreSeasonId';
SET @query = IF(@exists = 0, 'ALTER TABLE `Leagues` ADD COLUMN `sofaScoreSeasonId` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar índices y restricciones a Teams (si no existen)
-- Verificar que la columna countryId exista antes de crear el índice
SELECT COUNT(*) INTO @columnExists 
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'Teams'
AND COLUMN_NAME = 'countryId';

-- Solo si la columna countryId existe, verificar y crear el índice
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Teams'
     AND INDEX_NAME = 'team_country_idx'),
    1) INTO @indexExists;

SET @sqlAddIndex = IF(@columnExists > 0 AND @indexExists = 0, 
    'ALTER TABLE `Teams` ADD INDEX `team_country_idx` (`countryId`)',
    'SELECT "No se puede crear índice team_country_idx"');
PREPARE stmt FROM @sqlAddIndex;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Solo si la columna countryId existe y el índice fue creado, verificar y crear la foreign key
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Teams'
     AND CONSTRAINT_NAME = 'fk_teams_country'),
    1) INTO @constraintExists;

SET @sqlAddFK = IF(@columnExists > 0 AND @constraintExists = 0, 
    'ALTER TABLE `Teams` ADD CONSTRAINT `fk_teams_country` FOREIGN KEY (`countryId`) REFERENCES `Countries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "No se puede crear constraint fk_teams_country"');
PREPARE stmt FROM @sqlAddFK;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar índices y restricciones a Players (si no existen)
-- Verificar que la columna nationalityId exista antes de crear el índice
SELECT COUNT(*) INTO @columnExists 
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'Players'
AND COLUMN_NAME = 'nationalityId';

-- Solo si la columna nationalityId existe, verificar y crear el índice
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Players'
     AND INDEX_NAME = 'player_nationality_idx'),
    1) INTO @indexExists;

SET @sqlAddIndex = IF(@columnExists > 0 AND @indexExists = 0, 
    'ALTER TABLE `Players` ADD INDEX `player_nationality_idx` (`nationalityId`)',
    'SELECT "No se puede crear índice player_nationality_idx"');
PREPARE stmt FROM @sqlAddIndex;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Solo si la columna nationalityId existe y el índice fue creado, verificar y crear la foreign key
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Players'
     AND CONSTRAINT_NAME = 'fk_players_nationality'),
    1) INTO @constraintExists;

SET @sqlAddFK = IF(@columnExists > 0 AND @constraintExists = 0, 
    'ALTER TABLE `Players` ADD CONSTRAINT `fk_players_nationality` FOREIGN KEY (`nationalityId`) REFERENCES `Countries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "No se puede crear constraint fk_players_nationality"');
PREPARE stmt FROM @sqlAddFK;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar índices y restricciones a Leagues (si no existen)
-- Verificar que la columna countryId exista antes de crear el índice
SELECT COUNT(*) INTO @columnExists 
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'Leagues'
AND COLUMN_NAME = 'countryId';

-- Solo si la columna countryId existe, verificar y crear el índice
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Leagues'
     AND INDEX_NAME = 'league_country_idx'),
    1) INTO @indexExists;

SET @sqlAddIndex = IF(@columnExists > 0 AND @indexExists = 0, 
    'ALTER TABLE `Leagues` ADD INDEX `league_country_idx` (`countryId`)',
    'SELECT "No se puede crear índice league_country_idx"');
PREPARE stmt FROM @sqlAddIndex;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Solo si la columna countryId existe y el índice fue creado, verificar y crear la foreign key
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Leagues'
     AND CONSTRAINT_NAME = 'fk_leagues_country'),
    1) INTO @constraintExists;

SET @sqlAddFK = IF(@columnExists > 0 AND @constraintExists = 0, 
    'ALTER TABLE `Leagues` ADD CONSTRAINT `fk_leagues_country` FOREIGN KEY (`countryId`) REFERENCES `Countries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "No se puede crear constraint fk_leagues_country"');
PREPARE stmt FROM @sqlAddFK;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. Crear índices para mejora de rendimiento
-- Verificar que la tabla Transfers exista
SELECT COUNT(*) INTO @tableExists 
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'Transfers';

-- Verificar que la columna transferDate exista en Transfers
SELECT IF(@tableExists > 0,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Transfers'
     AND COLUMN_NAME = 'transferDate'),
    0) INTO @columnExists;

-- Solo si la tabla y columna existen, verificar y crear el índice
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Transfers'
     AND INDEX_NAME = 'idx_transfers_date'),
    1) INTO @indexExists;

SET @sqlAddIndex = IF(@columnExists > 0 AND @indexExists = 0, 
    'CREATE INDEX `idx_transfers_date` ON `Transfers` (`transferDate`)',
    'SELECT "No se puede crear índice idx_transfers_date"');
PREPARE stmt FROM @sqlAddIndex;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar que la columna sofaScoreId exista en Players antes de crear el índice
SELECT COUNT(*) INTO @columnExists 
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'Players'
AND COLUMN_NAME = 'sofaScoreId';

-- Solo si la columna existe, verificar y crear el índice
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Players'
     AND INDEX_NAME = 'idx_players_sofascore'),
    1) INTO @indexExists;

SET @sqlAddIndex = IF(@columnExists > 0 AND @indexExists = 0, 
    'CREATE INDEX `idx_players_sofascore` ON `Players` (`sofaScoreId`)',
    'SELECT "No se puede crear índice idx_players_sofascore"');
PREPARE stmt FROM @sqlAddIndex;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar que la columna sofaScoreId exista en Teams antes de crear el índice
SELECT COUNT(*) INTO @columnExists 
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'Teams'
AND COLUMN_NAME = 'sofaScoreId';

-- Solo si la columna existe, verificar y crear el índice
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Teams'
     AND INDEX_NAME = 'idx_teams_sofascore'),
    1) INTO @indexExists;

SET @sqlAddIndex = IF(@columnExists > 0 AND @indexExists = 0, 
    'CREATE INDEX `idx_teams_sofascore` ON `Teams` (`sofaScoreId`)',
    'SELECT "No se puede crear índice idx_teams_sofascore"');
PREPARE stmt FROM @sqlAddIndex;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar que la columna sofaScoreId exista en Leagues antes de crear el índice
SELECT COUNT(*) INTO @columnExists 
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'Leagues'
AND COLUMN_NAME = 'sofaScoreId';

-- Solo si la columna existe, verificar y crear el índice
SELECT IF(@columnExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Leagues'
     AND INDEX_NAME = 'idx_leagues_sofascore'),
    1) INTO @indexExists;

SET @sqlAddIndex = IF(@columnExists > 0 AND @indexExists = 0, 
    'CREATE INDEX `idx_leagues_sofascore` ON `Leagues` (`sofaScoreId`)',
    'SELECT "No se puede crear índice idx_leagues_sofascore"');
PREPARE stmt FROM @sqlAddIndex;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;