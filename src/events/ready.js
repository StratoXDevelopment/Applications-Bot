const { REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { token, clientId } = require('../../config');
const db = require('../db/BinaryDB');
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Deploy slash commands
    const commands = [];
    const commandsDir = path.join(__dirname, '..', 'commands');
    for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
      const cmd = require(path.join(commandsDir, file));
      if (cmd.data) commands.push(cmd.data.toJSON());
    }

    try {
      const rest = new REST().setToken(token);
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`✅ Deployed ${commands.length} command(s) globally`);
    } catch (e) {
      console.error('❌ Failed to deploy commands:', e.message);
    }

    // Schedule checker — runs every 30 seconds
    setInterval(async () => {
      const schedules = db.getAllSchedules();
      const now = Date.now();

      for (const [guildId, schedule] of Object.entries(schedules)) {
        if (schedule.startAt > now) continue;

        db.deleteSchedule(guildId);

        const existing = db.getApplication(guildId);
        if (existing && existing.active) continue;

        try {
          const channel = await client.channels.fetch(schedule.channelId);

          const embed = new EmbedBuilder()
            .setColor(0x5F9EA0)
            .setTitle('📋 Staff Application')
            .setDescription('We are looking for new staff members!\nClick the button below to start your application.')
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`apply_${guildId}`)
              .setLabel('Apply')
              .setEmoji('📩')
              .setStyle(ButtonStyle.Secondary),
          );

          const msg = await channel.send({ embeds: [embed], components: [row] });

          db.setApplication(guildId, {
            active: true,
            channelId: schedule.channelId,
            staffRoleId: schedule.staffRoleId,
            staffChannelId: schedule.staffChannelId,
            questions: schedule.questions,
            messageId: msg.id,
            submissions: {},
          });

          console.log(`[Schedule] Application started in guild ${guildId}`);
        } catch (e) {
          console.error(`[Schedule] Failed to start for guild ${guildId}:`, e.message);
        }
      }
    }, 30_000);
  });
};

// : ! Aegis !
// + Discord: itsfizys
// + Community: https://discord.gg/aerox (AeroX Development )
// + for any queries reach out Community or DM me.
