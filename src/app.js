const Discord = require('discord.js');
const handler = require('./handler');
const Worker = require('./worker');

(async () => {
  // Postgres
  require('./models');

  // Worker
  const worker = new Worker();
  worker.start();

  // Discord
  const client = new Discord.Client();

  client.once('ready', () => {
    console.log('Ready!');
  });

  client.on('message', handler);

  client.login(process.env.DISCORD_TOKEN);
})();
