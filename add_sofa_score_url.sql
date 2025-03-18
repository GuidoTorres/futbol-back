-- Añadir la columna sofaScoreUrl a la tabla Players si no existe
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'sofaScoreUrl';

SET @query = IF(@exists = 0, 'ALTER TABLE `Players` ADD COLUMN `sofaScoreUrl` VARCHAR(255) NULL', 'SELECT "Columna sofaScoreUrl ya existe"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar que la columna teamId cambie a TeamId si es necesario
SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Players' AND COLUMN_NAME = 'teamId';

SET @query = IF(@exists > 0, 'ALTER TABLE `Players` CHANGE COLUMN `teamId` `TeamId` INT NULL', 'SELECT "Columna TeamId ya es correcta"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;