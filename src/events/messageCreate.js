const { ChannelType } = require('discord.js');
const handler = require('../handlers/applicationHandler');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType.DM) return;

    try {
      await handler.handleDMAnswer(message, client);
    } catch (e) {
      console.error('[messageCreate] DM handler error:', e);
    }
  });
};

// : ! Aegis !
// + Discord: itsfizys
// + Community: https://discord.gg/aerox (AeroX Development )
// + for any queries reach out Community or DM me.
