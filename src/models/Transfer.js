const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transfer = sequelize.define('Transfer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transferDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  type: {  // Free Transfer, Loan, etc.
    type: DataTypes.STRING,
    allowNull: true
  },
  fee: {
    type: DataTypes.STRING,  
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: true
  },
  season: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Referencias para las relaciones
  playerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fromTeamId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  toTeamId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sofaScoreId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seasonId: {
    type: DataTypes.INTEGER,
    allowNull: true, // podría ser nullable
    references: { model: 'Seasons', key: 'id' }
  },
}, {
  timestamps: true
});

module.exports = Transfer;