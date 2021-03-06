const Discord = require('discord.js');
const handler = require('./handler');
const Worker = require('./worker');
const config = require('./config/config');

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
    client.user.setPresence({ activity: { name: '!help for help' }, status: 'online' })
  });

  client.on('message', handler);

  client.login(process.env.DISCORD_TOKEN);
})();
