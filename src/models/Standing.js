const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Team = require('./Team');
const League = require('./League');

const Standing = sequelize.define('Standing', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Temporada (ej. "2023-2024")
  season: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Posición en la tabla
  position: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Estadísticas generales
  played: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos jugados'
  },
  won: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos ganados'
  },
  drawn: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos empatados'
  },
  lost: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos perdidos'
  },
  goalsFor: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Goles a favor'
  },
  goalsAgainst: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Goles en contra'
  },
  goalDifference: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Diferencia de goles'
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Puntos'
  },
  // Estadísticas detalladas
  homeWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos ganados en casa'
  },
  homeDrawn: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos empatados en casa'
  },
  homeLost: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos perdidos en casa'
  },
  homeGoalsFor: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Goles a favor en casa'
  },
  homeGoalsAgainst: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Goles en contra en casa'
  },
  awayWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos ganados fuera'
  },
  awayDrawn: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos empatados fuera'
  },
  awayLost: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos perdidos fuera'
  },
  awayGoalsFor: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Goles a favor fuera'
  },
  awayGoalsAgainst: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Goles en contra fuera'
  },
  // Información adicional
  form: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Forma reciente (ej. "WWDL")'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Estado (ej. "Promotion", "Relegation")'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Descripción adicional'
  },
  // Datos de SofaScore
  sofaScoreId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  groupName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nombre del grupo si la liga tiene grupos'
  }
}, {
  timestamps: true
});

// Definir asociaciones
Standing.belongsTo(Team);
Team.hasMany(Standing);

Standing.belongsTo(League);
League.hasMany(Standing);

module.exports = Standing;