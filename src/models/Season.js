const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const League = require('./League');

const Season = sequelize.define('Season', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false, // Este id vendrá directamente desde SofaScore
  },
  year: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,
});

// Relaciones
Season.belongsTo(League, { foreignKey: 'leagueId' });
League.hasMany(Season, { foreignKey: 'leagueId' });

module.exports = Season;
