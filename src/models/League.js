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
  shortName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  countryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Countries',
      key: 'id'
    }
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  season: {
    type: DataTypes.STRING,
    allowNull: true
  },
  primaryColor: {
    type: DataTypes.STRING,
    allowNull: true
  },
  secondaryColor: {
    type: DataTypes.STRING,
    allowNull: true
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
  },
  sofaScoreId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'League ID from SofaScore'
  },
  sofaScoreSeasonId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Season ID from SofaScore'
  }
}, {
  timestamps: true
});

module.exports = League;