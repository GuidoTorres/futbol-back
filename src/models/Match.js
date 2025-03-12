const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Team = require('./Team');
const League = require('./League');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'),
    defaultValue: 'SCHEDULED',
    allowNull: false
  },
  matchday: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  round: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Round or matchday description (e.g., "Matchday 5", "Quarter-final")'
  },
  stage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  homeScore: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  awayScore: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  halfTimeHomeScore: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  halfTimeAwayScore: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  stadium: {
    type: DataTypes.STRING,
    allowNull: true
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Alternative name for stadium'
  },
  referee: {
    type: DataTypes.STRING,
    allowNull: true
  },
  attendance: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of spectators at the match'
  },
  season: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Season of the match (e.g., "2023-2024")'
  },
  fbrefId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Match ID from fbref.com'
  },
  fbrefUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to match page on fbref.com'
  }
}, {
  timestamps: true
});

// Define associations
Match.belongsTo(League);
League.hasMany(Match);

Match.belongsTo(Team, { as: 'homeTeam', foreignKey: 'homeTeamId' });
Match.belongsTo(Team, { as: 'awayTeam', foreignKey: 'awayTeamId' });
Team.hasMany(Match, { as: 'homeMatches', foreignKey: 'homeTeamId' });
Team.hasMany(Match, { as: 'awayMatches', foreignKey: 'awayTeamId' });

module.exports = Match;