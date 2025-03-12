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
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  founded: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  stadium: {
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
  }
}, {
  timestamps: true
});

module.exports = Team;