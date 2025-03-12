const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Match = require('./Match');
const Team = require('./Team');

const MatchStats = sequelize.define('MatchStats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Team stats in match
  possession: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Possession percentage'
  },
  shots: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  shotsOnTarget: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  corners: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  fouls: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  offsides: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  yellowCards: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  redCards: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  saves: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  passes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  passAccuracy: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  
  // Additional tracking data
  isHome: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    comment: 'Whether these stats are for the home or away team'
  },
  fbrefTeamId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

// Define associations
MatchStats.belongsTo(Match);
Match.hasMany(MatchStats);

MatchStats.belongsTo(Team);
Team.hasMany(MatchStats);

module.exports = MatchStats;