const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { token } = require('./config');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();

const eventsDir = path.join(__dirname, 'src', 'events');
const commandsDir = path.join(__dirname, 'src', 'commands');

for (const file of fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'))) {
  require(path.join(eventsDir, file))(client);
}

for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(commandsDir, file));
  if (!cmd.data || !cmd.execute) {
    console.warn(`[Commands] Skipping ${file} — missing data or execute`);
    continue;
  }
  client.commands.set(cmd.data.name, cmd);
}

client.login(token).catch(err => {
  console.error('[Login] Failed to login:', err.message);
  process.exit(1);
});

// : ! Aegis !
// + Discord: itsfizys
// + Community: https://discord.gg/aerox (AeroX Development )
// + for any queries reach out Community or DM me.
