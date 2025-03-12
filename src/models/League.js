const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const League = sequelize.define('League', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  season: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  tier: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'League tier (top, second, cup, etc.)'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'League category (Big 5 European Leagues, etc.)'
  },
  fbrefId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'League ID from fbref.com'
  },
  fbrefUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to league page on fbref.com'
  }
}, {
  timestamps: true
});

module.exports = League;