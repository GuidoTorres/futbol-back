const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Team = require('./Team');
const League = require('./League');

const TeamStats = sequelize.define('TeamStats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  season: {
    type: DataTypes.STRING,
    allowNull: true
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  played: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  won: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  drawn: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lost: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  goalsFor: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  goalsAgainst: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  goalDifference: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  homeWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  homeDrawn: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  homeLost: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  awayWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  awayDrawn: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  awayLost: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  fbrefId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seasonId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Seasons', key: 'id' }
  },
  leagueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Leagues', key: 'id' }
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Teams', key: 'id' }
  },
}, {
  timestamps: true
});

// Define associations
TeamStats.belongsTo(Team);
Team.hasMany(TeamStats);

TeamStats.belongsTo(League);
League.hasMany(TeamStats);

module.exports = TeamStats;