require('dotenv').config();

if (!process.env.TOKEN) throw new Error('[Config] TOKEN is missing in .env');
if (!process.env.CLIENT_ID) throw new Error('[Config] CLIENT_ID is missing in .env');

module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
};

// : ! Aegis !
// + Discord: itsfizys
// + Community: https://discord.gg/aerox (AeroX Development )
// + for any queries reach out Community or DM me.
