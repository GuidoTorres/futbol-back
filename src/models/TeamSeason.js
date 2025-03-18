const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Team = require('./Team');
const Season = require('./Season');
// Tabla intermedia opcional (TeamSeason)
const TeamSeason = sequelize.define('TeamSeason', {
    teamId: {
      type: DataTypes.INTEGER,
      references: { model: 'Teams', key: 'id' }
    },
    seasonId: {
      type: DataTypes.INTEGER,
      references: { model: 'Seasons', key: 'id' }
    },
    leagueId: {
      type: DataTypes.INTEGER,
      references: { model: 'Leagues', key: 'id' }
    }
  });
  
  Team.belongsToMany(Season, { through: TeamSeason, foreignKey: 'teamId' });
  Season.belongsToMany(Team, { through: TeamSeason, foreignKey: 'seasonId' });
  
  module.exports = TeamSeason;