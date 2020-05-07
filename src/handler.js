const Discord = require('discord.js');
const {MessageEmbed} = Discord;

const {Invoice, User, sequelize} = require('./models');
const Lightning = require('./lightning/lightning');
const {logMsg, logError, logSuccess, logInfo} = require('./logger');
const db = require('./db');

const ln = new Lightning(
  process.env.LND_IP,
  process.env.LND_PORT,
  process.env.MACAROON_BASE64,
);

const satSuffix = amount => (amount > 1 ? 'sats' : 'sat');

// !deposit 10
const deposit = async msg => {
  const [command, amount] = msg.content.split(' ');

  if (!amount) {
    return msg.reply('you must specify an amount');
  }

  const t = await sequelize.transaction();

  try {
    const parsedAmount = parseRawAmount(amount);

    const user = await User.findOne({where: {discordId: msg.author.id}});

    const {payment_request, r_hash} = await ln.invoice(amount);

    const invoice = await Invoice.create(
      {
        state: 'PENDING', // TODO: Constant
        value: new Number(amount),
        type: 'DEPOSIT', // TODO: Constant
        settledAt: null,
        r_hash,
        userId: user.id,
      },
      {transaction: t},
    );

    await t.commit();

    const image = await ln.generateQR(payment_request);

    const attachment = new Discord.MessageAttachment(
      image.toBuffer(),
      'qrcode.png',
    );

    return msg.reply(
      `please pay this invoice, it may take a few moments for your balance to update: \`${payment_request}\``,
      attachment,
    );
  } catch (error) {
    await t.rollback();
    logError(
      '`Failed to deposit ${amount} for discordId: ${discordId}`',
      error,
    );
  }
};

// !withdraw 10
const withdraw = async msg => {
  const [command, payment_request] = msg.content.split(' ');

  if (!payment_request) {
    return msg.reply('you must specify a payment request');
  }

  const decodedPaymentRequest = await ln.decodePaymentRequest(payment_request);
  const {num_satoshis, timestamp, expiry} = decodedPaymentRequest;

  const expiresAt = parseInt(timestamp) + parseInt(expiry);
  const satoshis = parseRawAmount(num_satoshis);

  if (expiresAt <= Date.now() / 1000) {
    return msg.reply('payment request has expired');
  }

  const t = await sequelize.transaction();

  try {
    const user = await User.findOne({where: {discordId: msg.author.id}});

    if (satoshis > user.balance) {
      return msg.reply(
        `you are trying to withdraw ${satoshis} ${satSuffix(
          satoshis,
        )}, but you only have ${user.balance} ${satSuffix(user.balance)}`,
      );
    }

    const result = await ln.sendPayment(payment_request);

    if (result.payment_error) {
      return msg.reply(`payment error: \`${result.payment_error}\``);
    }

    if (!result.payment_error) {
      await user.update(
        {
          balance: user.balance - satoshis,
        },
        {transaction: t},
      );
    }

    await t.commit();

    return msg.reply(
      `successfully withdrew ${satoshis} ${satSuffix(satoshis)}`,
    );
  } catch (error) {
    await t.rollback();
    logError(
      '`Failed to withdraw ${amount} for discordId: ${discordId}`',
      error,
    );
  }
};

// !balance
const balance = async msg => {
  const {id: discordId} = msg.author;
  const {balance} = await User.findOne({where: {discordId}});
  logInfo(
    `Retrieved balance of ${balance} ${satSuffix(
      balance,
    )} for discordId: ${discordId}`,
  );
  return msg.reply(`your balance is ${balance} ${satSuffix(balance)}`);
};

const parseRawAmount = rawAmountString => {
  const parseError = 'Cannot parse amount';
  if (isNaN(rawAmountString)) {
    throw new Error(parseError);
  }

  const parsedAmount = parseInt(rawAmountString, 10);

  if (!parsedAmount || parsedAmount < 1) {
    throw new Error(parseError);
  }

  return parsedAmount;
};

const getReceiverUser = msg => {
  const mentions = msg.mentions.users;
  if (mentions.array().length === 0 || mentions.array().length > 1) {
    throw new Error('You must provide a user to tip');
  }

  return mentions.first();
};

const validateReceiver = (msg, receiver) => {
  if (receiver.bot) {
    msg.reply('you cannot tip bots');
    throw new Error('You cannot tip bots');
  }

  if (receiver.id === msg.author.id) {
    msg.reply('you cannot tip yourself');
    throw new Error('You cannot tip yourself');
  }
};

// !tip
const tip = async msg => {
  const args = msg.content.split(' ');

  if (args.length > 3) {
    return msg.reply('command has too many arguments');
  }

  const [command, , amount] = args;

  const receiverUser = getReceiverUser(msg);
  validateReceiver(msg, receiverUser);

  try {
    const parsedAmount = parseRawAmount(amount);

    await handleNewUser(receiverUser.id);

    const receiverId = receiverUser.id;
    const senderId = msg.author.id;

    if (!receiverId || !senderId) {
      return msg.reply('something went wrong..');
    }

    const sender = await User.findOne({where: {discordId: senderId}});

    if (sender.balance < amount) {
      return msg.reply(
        `your balance is insufficient, it is ${sender.balance} ${satSuffix(
          sender.balance,
        )}`,
      );
    }

    await db.transfer(senderId, receiverId, amount);
    logInfo(
      `Tipped ${amount} from ${msg.author.username}(${sender.discordId}) to ${
        receiverUser.username
      }(${receiverUser.id})`,
    );
    msg.reply(`you tipped ${receiverUser} ${amount} ${satSuffix(amount)}`);
  } catch (error) {
    logError(
      `Failed to tip ${amount} from discordId: ${msg.author.id} to discordId: ${
        receiverUser.id
      }`,
      error,
    );
  }
};

const help = async msg => {
  msg.reply(`I'm a bot that allows you to send and receive tips via the lightning network. \:zap:

\`!balance\` to retrieve balance
\`!deposit 10\` to deposit 10 sats
\`!withdraw payment_request\` to withdraw via payment_request
\`!tip @user 10\` to tip 10 sats to a user

Read more about Lightning here: <https://lightning.network/>
`);
};

const handlers = {
  deposit,
  withdraw,
  balance,
  tip,
  help,
};

const noop = () => {};

const handleNewUser = async discordId => {
  if (!discordId) {
    throw new Error('No discordId provided');
  }

  const userExists = await User.findOne({where: {discordId}});

  if (!userExists) {
    await User.create({
      discordId,
      balance: 0,
    });
    logInfo(`Created new user for discordId: ${discordId}`);
  }
};

const Handler = async msg => {
  // Ignore bot messages
  if (msg.author.bot) return;
  // Ignore direct messages
  if (msg.channel.type === 'dm') return;

  logMsg(msg);

  await handleNewUser(msg.author.id);

  const [command, amount] = msg.content.split(' ');

  const [, handler] = command.split('!');

  (handlers[handler] || noop)(msg);
};

module.exports = Handler;
