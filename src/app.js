const Discord = require('discord.js');
const handler = require('./handler');
const Worker = require('./worker');

const envVars = [
  'LND_IP',
  'LND_PORT',
  'MACAROON_BASE64',
  'DISCORD_TOKEN',
];

const prodVars = [
  'DB_HOST',
  'DB_DATABASE',
  'DB_USERNAME',
  'DB_PASSWORD',
];

if (process.env.NODE_ENV === 'production') {
  envVars = [...envVars, ...prodVars]
}

(async () => {
  // Check environment variables properly set
  const missingEnv = envVars.filter(e => !process.env[e]);
  if (missingEnv.length > 0) {
    console.error('Required environment variables missing:', missingEnv.join(', '));
    process.exit(1);
  }

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
