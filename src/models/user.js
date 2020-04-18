module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    discordId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    balance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    }
  }, {timestamps: true});
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};
