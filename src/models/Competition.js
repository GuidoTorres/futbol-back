const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Competition = sequelize.define('Competition', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Unknown'
  },
  numTeams: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  season: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: new Date().getFullYear().toString()
  },
  currentSeason: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
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
    comment: 'Competition ID from fbref.com'
  },
  fbrefUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to competition page on fbref.com'
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Competition;