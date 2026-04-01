const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const handler = require('../handlers/applicationHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('application')
    .setDescription('Manage staff applications')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start a new staff application')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to send the Apply message in')
            .setRequired(true))
        .addRoleOption(opt =>
          opt.setName('staff_role')
            .setDescription('Role that can accept or deny applications')
            .setRequired(true))
        .addChannelOption(opt =>
          opt.setName('staff_channel')
            .setDescription('Channel where submitted applications are posted')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('questions')
            .setDescription('Questions separated by comma — optional, defaults are used if skipped')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('End the currently running application'))
    .addSubcommand(sub =>
      sub.setName('schedule')
        .setDescription('Schedule an application to start after X minutes')
        .addIntegerOption(opt =>
          opt.setName('minutes')
            .setDescription('Minutes from now to start')
            .setRequired(true)
            .setMinValue(1))
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to send the Apply message in')
            .setRequired(true))
        .addRoleOption(opt =>
          opt.setName('staff_role')
            .setDescription('Role that can accept or deny applications')
            .setRequired(true))
        .addChannelOption(opt =>
          opt.setName('staff_channel')
            .setDescription('Channel where submitted applications are posted')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('questions')
            .setDescription('Questions separated by comma — optional')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('questions')
        .setDescription('View the questions of the active application')),

  async execute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ You need **Manage Server** permission to use this command.',
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'start') return handler.startApplication(interaction, client);
    if (sub === 'end') return handler.endApplication(interaction, client);
    if (sub === 'schedule') return handler.scheduleApplication(interaction, client);
    if (sub === 'questions') return handler.viewQuestions(interaction, client);
  },
};

// : ! Aegis !
// + Discord: itsfizys
// + Community: https://discord.gg/aerox (AeroX Development )
// + for any queries reach out Community or DM me.
