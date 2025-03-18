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
  fullName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shortName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true
  },
  positionCategory: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Goalkeeper, Defender, Midfielder, Forward'
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nationalityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Countries',
      key: 'id'
    }
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
  slug: {
    type: DataTypes.STRING,
    allowNull: true
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  marketValue: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contractUntil: {
    type: DataTypes.DATEONLY,
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
  },
  sofaScoreId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Player ID from SofaScore'
  },
  sofaScoreUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to player page on SofaScore'
  }
}, {
  timestamps: true
});

Player.belongsTo(Team);
Team.hasMany(Player);

module.exports = Player;