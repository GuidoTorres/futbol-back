const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Team = require('./Team');
const League = require('./League');

const TeamLeague = sequelize.define('TeamLeague', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Teams',
      key: 'id'
    }
  },
  leagueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Leagues',
      key: 'id'
    }
  },
  season: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'relegated', 'promoted', 'inactive'),
    defaultValue: 'active'
  }
}, {
  timestamps: true
});

// Establecer la relación muchos a muchos
Team.belongsToMany(League, { through: TeamLeague });
League.belongsToMany(Team, { through: TeamLeague });

module.exports = TeamLeague;