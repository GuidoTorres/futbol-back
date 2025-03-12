const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Match = require('./Match');
const Player = require('./Player');
const Team = require('./Team');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM('GOAL', 'OWN_GOAL', 'PENALTY', 'MISS_PENALTY', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'VAR'),
    allowNull: false
  },
  minute: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  extraMinute: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'For added time'
  },
  detail: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional information about the event'
  }
}, {
  timestamps: true
});

// Define associations
Event.belongsTo(Match);
Match.hasMany(Event);

Event.belongsTo(Player, { as: 'player' });
Event.belongsTo(Player, { as: 'assistPlayer', foreignKey: 'assistPlayerId' });
Event.belongsTo(Team);

module.exports = Event;