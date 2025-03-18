const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Player = require('./Player');
const Team = require('./Team');
const League = require('./League');

const PlayerStats = sequelize.define('PlayerStats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  season: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Standard stats
  appearances: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  starts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  minutesPlayed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  goals: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  assists: {
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
  
  // Shooting stats
  shots: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  shotsOnTarget: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Passing stats
  passesAttempted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  passesCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  passAccuracy: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  keyPasses: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Defensive stats
  tackles: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  interceptions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  blocks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  clearances: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Goalkeeper stats (if player is goalkeeper)
  saves: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  cleanSheets: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  goalsConceded: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Tracking data
  fbrefId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  playerId:{
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true
});

// Define associations
PlayerStats.belongsTo(Player);
Player.hasMany(PlayerStats);

PlayerStats.belongsTo(Team);
Team.hasMany(PlayerStats);

PlayerStats.belongsTo(League);
League.hasMany(PlayerStats);

module.exports = PlayerStats;