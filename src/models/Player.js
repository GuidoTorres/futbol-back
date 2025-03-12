const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Team = require('./Team');

const Player = sequelize.define('Player', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  birthPlace: {
    type: DataTypes.STRING,
    allowNull: true
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Height in cm'
  },
  weight: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Weight in kg'
  },
  foot: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Preferred foot (left, right, both)'
  },
  shirtNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fbrefId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Player ID from fbref.com'
  },
  fbrefUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to player page on fbref.com'
  }
}, {
  timestamps: true
});

Player.belongsTo(Team);
Team.hasMany(Player);

module.exports = Player;