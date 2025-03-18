const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Country = sequelize.define('Country', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {  // Código alpha2 (ES, UK, etc.)
    type: DataTypes.STRING(2),
    allowNull: true
  },
  code3: {  // Código alpha3 (ESP, GBR, etc.)
    type: DataTypes.STRING(3),
    allowNull: true
  },
  region: {  // Europa, Sudamérica, etc.
    type: DataTypes.STRING,
    allowNull: true
  },
  flag: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sofaScoreId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Country;