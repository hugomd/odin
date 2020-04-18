const Sequelize = require('sequelize');
const User = require('./user');

module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define('Invoice', {
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'user',
        key: 'id',
        deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE
      }
    },
    value: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    settledAt: DataTypes.DATE,
    r_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    state: DataTypes.ENUM('PENDING', 'SETTLED'),
    type: DataTypes.ENUM('DEPOSIT', 'WITHDRAWAL')
  }, {timestamps: true});
  Invoice.associate = function(models) {
    // associations can be defined here
  };
  return Invoice;
};
