-- Optimizations for getMatchesByDate query performance

-- Verify Matches table exists
SELECT COUNT(*) INTO @tableExists 
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'Matches';

-- Add index to match date field for better performance
SELECT IF(@tableExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Matches'
     AND INDEX_NAME = 'idx_match_date'),
    1) INTO @indexExists;

SET @sqlAddIndex = IF(@tableExists > 0 AND @indexExists = 0, 
    'CREATE INDEX `idx_match_date` ON `Matches` (`date`)',
    'SELECT "Index idx_match_date already exists or Matches table not found"');
PREPARE stmt FROM @sqlAddIndex;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add composite index for league and date queries
SELECT IF(@tableExists > 0, 
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'Matches'
     AND INDEX_NAME = 'idx_match_league_date'),
    1) INTO @indexExists;

SET @sqlAddIndex = IF(@tableExists > 0 AND @indexExists = 0, 
    'CREATE INDEX `idx_match_league_date` ON `Matches` (`LeagueId`, `date`)',
    'SELECT "Index idx_match_league_date already exists or Matches table not found"');
PREPARE stmt FROM @sqlAddIndex;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;