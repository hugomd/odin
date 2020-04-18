const Discord = require('discord.js');
const {Invoice, User} = require('./models');
const Lightning = require('./lightning/lightning');

const ln = new Lightning(
  process.env.LND_IP,
  process.env.LND_PORT,
  process.env.MACAROON_BASE64,
);

// !deposit 10
const deposit = async msg => {
  const [command, amount] = msg.content.split(' ');

  if (!amount) {
    return msg.reply('you must specify an amount');
  }

  const user = await User.findOne({where: {discordId: msg.author.id}});

  const {payment_request, r_hash} = await ln.invoice(amount);

  const invoice = await Invoice.create({
    state: 'PENDING', // TODO: Constant
    value: new Number(amount),
    type: 'DEPOSIT', // TODO: Constant
    settledAt: null,
    r_hash,
    userId: user.id,
  });

  const image = await ln.generateQR(payment_request);

  const attachment = new Discord.MessageAttachment(
    image.toBuffer(),
    'qrcode.png',
  );

  return msg.reply(
    'please pay this invoice. It may take a few moments for your balance to update',
    attachment,
  );
};

// !withdraw 10
const withdraw = async msg => {
  return msg.reply('withdrew something');
};

// !balance
const balance = async msg => {
  const {id: discordId} = msg.author;
  const {balance} = await User.findOne({where: {discordId}});
  return msg.reply(`your balance is ${balance} sat${balance > 1 ? 's' : ''}`);
};

// !tip @hugo
const tip = async msg => {
  const [command, , amount] = msg.content.split(' ');

  const mentions = msg.mentions.users;
  if (mentions.array().length > 1) {
    return msg.reply('you can only tip one user at a time');
  }

  if (mentions.array().length === 0) {
    return msg.reply('you must mention a user to tip them');
  }

  const receiverUser = mentions.first();

  if (!amount) {
    return msg.reply('you must specify an amount');
  }

  if (amount < 1) {
    return msg.reply('you cannot send 0 or negative amounts');
  }

  if (receiverUser.bot) {
    return msg.reply('you cannot tip bots');
  }

  if (receiverUser.id === msg.author.id) {
    return msg.reply('you cannot tip yourself');
  }

  await handleNewUser(receiverUser.id);

  const sender = await User.findOne({where: {discordId: msg.author.id}});

  if (sender.balance < amount) {
    return msg.reply(
      `your balance is insufficient, it is ${sender.balance} sat${
        sender.balance > 1 ? 's' : ''
      }`,
    );
  }

  const receiver = await User.findOne({where: {discordId: receiverUser.id}});

  await receiver.update({
    balance: receiver.balance + amount,
  });

  await sender.update({
    balance: sender.balance - amount,
  });

  msg.reply(`you tipped ${receiverUser} ${amount} sat${amount > 1 ? 's' : ''}`);
};

const help = async msg => {
  msg.reply(`I'm a bot that allows you to send and receive tips via the lightning network. \:zap:

\`!balance\` to retrieve balance
\`!deposit 10\` to deposit 10 sats
\`!tip 10 @user\` to tip 10 sats to a user

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
    console.log('Creating user', discordId);
    await User.create({
      discordId,
      balance: 0,
    });
  }
};

const Handler = async msg => {
  if (msg.author.bot) return;

  await handleNewUser(msg.author.id);

  const [command, amount] = msg.content.split(' ');

  const [, handler] = command.split('!');

  (handlers[handler] || noop)(msg);
};

module.exports = Handler;