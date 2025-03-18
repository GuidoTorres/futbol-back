const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Player = require('./Player');
const Team = require('./Team');
const League = require('./League');

const TopScorer = sequelize.define('TopScorer', {
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
  // Estadísticas
  rank: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Posición en la tabla de goleadores'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Categoría (goals, assists, cards, etc.)'
  },
  value: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Valor numérico (cantidad de goles, asistencias, etc.)'
  },
  matches: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Partidos jugados'
  },
  minutesPlayed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Minutos jugados'
  },
  // Datos adicionales específicos para cada categoría
  penaltyGoals: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Goles de penalti (solo para goleadores)'
  },
  goalsPerMatch: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Promedio de goles por partido'
  },
  assistsPerMatch: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Promedio de asistencias por partido'
  },
  // Datos de SofaScore
  sofaScoreId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seasonId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Seasons', key: 'id' }
  },
}, {
  timestamps: true
});

// Definir asociaciones
TopScorer.belongsTo(Player);
Player.hasMany(TopScorer);

TopScorer.belongsTo(Team);
Team.hasMany(TopScorer);

TopScorer.belongsTo(League);
League.hasMany(TopScorer);

module.exports = TopScorer;