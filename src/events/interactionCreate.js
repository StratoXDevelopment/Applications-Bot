const handler = require('../handlers/applicationHandler');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {

    // ── Slash Commands ──
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;

      try {
        await cmd.execute(interaction, client);
      } catch (e) {
        console.error(`[Commands] Error in /${interaction.commandName}:`, e);
        const payload = { content: '❌ Something went wrong while running that command.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // ── Buttons ──
    if (interaction.isButton()) {
      const id = interaction.customId;

      try {
        if (id.startsWith('apply_'))         return await handler.handleApplyButton(interaction, client);
        if (id.startsWith('confirm_yes_'))   return await handler.handleConfirmYes(interaction, client);
        if (id.startsWith('confirm_no_'))    return await handler.handleConfirmNo(interaction, client);
        if (id.startsWith('staff_accept_')) return await handler.handleStaffDecision(interaction, client, 'accepted');
        if (id.startsWith('staff_deny_'))   return await handler.handleStaffDecision(interaction, client, 'denied');
      } catch (e) {
        console.error(`[Buttons] Error on ${id}:`, e);
        const payload = { content: '❌ An error occurred. Please try again.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    }
  });
};

// : ! Aegis !
// + Discord: itsfizys
// + Community: https://discord.gg/aerox (AeroX Development )
// + for any queries reach out Community or DM me.
