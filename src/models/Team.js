const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Team = sequelize.define('Team', {
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
  slug: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stadium: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stadiumCapacity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  founded: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  manager: {
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
  fbrefId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Team ID from fbref.com'
  },
  fbrefUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to team page on fbref.com'
  },
  sofaScoreId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Team ID from SofaScore'
  }
}, {
  timestamps: true
});

module.exports = Team;