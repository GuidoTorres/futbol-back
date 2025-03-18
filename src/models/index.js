const Team = require('./Team');
const Player = require('./Player');
const League = require('./League');
const Match = require('./Match');
const Event = require('./Event');
const TeamStats = require('./TeamStats');
const PlayerStats = require('./PlayerStats');
const MatchStats = require('./MatchStats');
const Country = require('./Country');
const Transfer = require('./Transfer');
const TeamLeague = require('./TeamLeague');
const Standing = require('./Standing');
const TopScorer = require('./TopScorer');
const Season = require('./Season');
const TeamSeason = require('./TeamSeason');

// Establecer relaciones
// País con Equipos y Ligas
Country.hasMany(Team, { foreignKey: 'countryId' });
Team.belongsTo(Country, { foreignKey: 'countryId' });

Country.hasMany(League, { foreignKey: 'countryId' });
League.belongsTo(Country, { foreignKey: 'countryId' });

Country.hasMany(Player, { foreignKey: 'nationalityId', as: 'nationalityPlayers' });
Player.belongsTo(Country, { foreignKey: 'nationalityId', as: 'nationalityCountry' });

// Transferencias
Player.hasMany(Transfer, { foreignKey: 'playerId' });
Transfer.belongsTo(Player, { foreignKey: 'playerId' });

Transfer.belongsTo(Team, { as: 'fromTeam', foreignKey: 'fromTeamId' });
Transfer.belongsTo(Team, { as: 'toTeam', foreignKey: 'toTeamId' });

Team.belongsToMany(League, { through: TeamLeague, foreignKey: 'teamId' });
League.belongsToMany(Team, { through: TeamLeague, foreignKey: 'leagueId' });

TeamStats.belongsTo(Team, { foreignKey: 'teamId' });
Team.hasMany(TeamStats, { foreignKey: 'teamId' });

TeamStats.belongsTo(League, { foreignKey: 'leagueId' });
League.hasMany(TeamStats, { foreignKey: 'leagueId' });

TeamStats.belongsTo(Season, { foreignKey: 'seasonId' });
Season.hasMany(TeamStats, { foreignKey: 'seasonId' });

// Export all models
module.exports = {
  Team,
  Player,
  League,
  Match,
  Event,
  TeamStats,
  PlayerStats,
  MatchStats,
  Country,
  Transfer,
  TeamLeague,
  Standing,
  TopScorer,
  Season,
  TeamSeason
};