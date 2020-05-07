const {User, sequelize} = require('./models');

const transfer = async (senderId, receiverId, amount) => {
  const t = await sequelize.transaction();

  try {
    const sender = await User.findOne({where: {discordId: senderId}});

    if (sender.balance < amount) {
      throw new Error('Insufficient funds');
    }

    const receiver = await User.findOne({where: {discordId: receiverId}});

    if (!receiver) {
      throw new Error('Receiver not found');
    }

    await Promise.all([
      receiver.update(
        {
          balance: receiver.balance + parseInt(amount),
        },
        {transaction: t},
      ),
      sender.update(
        {
          balance: sender.balance - parseInt(amount),
        },
        {transaction: t},
      ),
    ]);

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw new Error('Failed to transfer between users');
  }
};

module.exports = {
  transfer
};
