const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const db = require('../db/BinaryDB');
const colors = require('../utils/colors');

const DEFAULT_QUESTIONS = [
  'What is your age?',
  'What is your timezone?',
  'Why do you want to become a staff member?',
  'Do you have any previous moderation experience? If yes, please describe.',
  'How many hours per day can you be active on this server?',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseQuestions(raw) {
  if (!raw) return null;
  const list = raw.split(',').map(q => q.trim()).filter(Boolean);
  return list.length > 0 ? list : null;
}

function disabledApplyRow(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`apply_${guildId}`)
      .setLabel('Applications Closed')
      .setEmoji('📩')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );
}

async function sendQuestion(user, question, current, total) {
  const embed = new EmbedBuilder()
    .setColor(colors.MAIN)
    .setTitle(`📋 Question ${current} of ${total}`)
    .setDescription(question)
    .setFooter({ text: 'Type your answer below' });

  try {
    const dm = await user.createDM();
    await dm.send({ embeds: [embed] });
  } catch {
    // Can't send — session will be cleaned up naturally
  }
}

// ─── /application start ───────────────────────────────────────────────────────

async function startApplication(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const existing = db.getApplication(guildId);
  if (existing && existing.active) {
    return interaction.editReply({ content: '❌ There is already an active application running. Use `/application end` first.' });
  }

  const channel     = interaction.options.getChannel('channel');
  const staffRole   = interaction.options.getRole('staff_role');
  const staffChan   = interaction.options.getChannel('staff_channel');
  const questionsRaw = interaction.options.getString('questions');
  const questions   = parseQuestions(questionsRaw) || DEFAULT_QUESTIONS;

  const embed = new EmbedBuilder()
    .setColor(colors.MAIN)
    .setTitle('📋 Staff Application')
    .setDescription('We are looking for new staff members!\nClick the button below to start your application.')
    .setFooter({ text: interaction.guild.name })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`apply_${guildId}`)
      .setLabel('Apply')
      .setEmoji('📩')
      .setStyle(ButtonStyle.Secondary),
  );

  try {
    const msg = await channel.send({ embeds: [embed], components: [row] });
    db.setApplication(guildId, {
      active: true,
      channelId: channel.id,
      staffRoleId: staffRole.id,
      staffChannelId: staffChan.id,
      questions,
      messageId: msg.id,
      submissions: {},
    });
    return interaction.editReply({ content: `✅ Application started in ${channel}!` });
  } catch {
    return interaction.editReply({ content: '❌ I could not send the application message. Please check my permissions in that channel.' });
  }
}

// ─── /application end ─────────────────────────────────────────────────────────

async function endApplication(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  const app = db.getApplication(guildId);
  if (!app || !app.active) {
    return interaction.editReply({ content: '❌ No active application found.' });
  }

  // Try to disable the apply button on the original message
  try {
    const ch  = await client.channels.fetch(app.channelId);
    const msg = await ch.messages.fetch(app.messageId);
    await msg.edit({ components: [disabledApplyRow(guildId)] });
  } catch {
    // Message may have been deleted — that's fine
  }

  app.active = false;
  db.setApplication(guildId, app);
  return interaction.editReply({ content: '✅ Application has been ended successfully.' });
}

// ─── /application schedule ────────────────────────────────────────────────────

async function scheduleApplication(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const guildId      = interaction.guildId;
  const minutes      = interaction.options.getInteger('minutes');
  const channel      = interaction.options.getChannel('channel');
  const staffRole    = interaction.options.getRole('staff_role');
  const staffChan    = interaction.options.getChannel('staff_channel');
  const questionsRaw = interaction.options.getString('questions');
  const questions    = parseQuestions(questionsRaw) || DEFAULT_QUESTIONS;

  const startAt = Date.now() + minutes * 60 * 1000;

  db.setSchedule(guildId, {
    startAt,
    channelId: channel.id,
    staffRoleId: staffRole.id,
    staffChannelId: staffChan.id,
    questions,
  });

  const ts = Math.floor(startAt / 1000);
  return interaction.editReply({
    content: `✅ Application scheduled to start <t:${ts}:R> in ${channel}!`,
  });
}

// ─── /application questions ───────────────────────────────────────────────────

async function viewQuestions(interaction, client) {
  const guildId = interaction.guildId;
  const app = db.getApplication(guildId);
  if (!app || !app.active) {
    return interaction.reply({ content: '❌ No active application found.', ephemeral: true });
  }

  const listed = app.questions.map((q, i) => `**${i + 1}.** ${q}`).join('\n');
  const embed = new EmbedBuilder()
    .setColor(colors.MAIN)
    .setTitle('📋 Active Application Questions')
    .setDescription(listed)
    .setFooter({ text: `${app.questions.length} question(s) total` });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── Button: Apply (guild channel) ───────────────────────────────────────────

async function handleApplyButton(interaction, client) {
  const guildId = interaction.customId.replace('apply_', '');
  const userId  = interaction.user.id;

  const app = db.getApplication(guildId);
  if (!app || !app.active) {
    return interaction.reply({ content: '❌ This application is no longer active.', ephemeral: true });
  }

  const submissions = app.submissions || {};
  if (submissions[userId]) {
    return interaction.reply({ content: '❌ You have already submitted an application!', ephemeral: true });
  }

  if (db.getSession(userId)) {
    return interaction.reply({ content: '❌ You already have an ongoing application in your DMs! Please complete it first.', ephemeral: true });
  }

  const confirmEmbed = new EmbedBuilder()
    .setColor(colors.MAIN)
    .setTitle('📋 Confirm Application')
    .setDescription('You really want to apply?')
    .setFooter({ text: 'This will open your application in DMs' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirm_yes_${userId}_${guildId}`)
      .setLabel('Yes')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`confirm_no_${userId}`)
      .setLabel('No')
      .setStyle(ButtonStyle.Danger),
  );

  try {
    const dm = await interaction.user.createDM();
    await dm.send({ embeds: [confirmEmbed], components: [row] });
    db.setSession(userId, {
      guildId,
      stage: 'confirming',
      currentQuestion: 0,
      answers: [],
    });
    return interaction.reply({ content: '📩 Check your DMs!', ephemeral: true });
  } catch {
    return interaction.reply({
      content: '❌ I couldn\'t send you a DM! Please **enable your Direct Messages** from server members and try again.',
      ephemeral: true,
    });
  }
}

// ─── Button: Confirm Yes (DM) ─────────────────────────────────────────────────

async function handleConfirmYes(interaction, client) {
  const parts   = interaction.customId.split('_');
  // format: confirm_yes_<userId>_<guildId>
  const userId  = parts[2];
  const guildId = parts[3];

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: '❌ This is not your application!', ephemeral: true });
  }

  const session = db.getSession(userId);
  if (!session || session.stage !== 'confirming') {
    return interaction.reply({ content: '❌ No pending confirmation found. Please click Apply again.', ephemeral: true });
  }

  const app = db.getApplication(guildId);
  if (!app || !app.active) {
    db.deleteSession(userId);
    const closedEmbed = new EmbedBuilder()
      .setColor(colors.ERROR)
      .setDescription('❌ This application is no longer active.');
    return interaction.update({ embeds: [closedEmbed], components: [] });
  }

  // Disable the confirmation buttons
  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirm_yes_${userId}_${guildId}`)
      .setLabel('Yes')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`confirm_no_${userId}`)
      .setLabel('No')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
  );

  await interaction.update({ components: [disabledRow] });

  db.setSession(userId, {
    ...session,
    stage: 'answering',
    currentQuestion: 0,
    answers: [],
  });

  await sendQuestion(interaction.user, app.questions[0], 1, app.questions.length);
}

// ─── Button: Confirm No (DM) ──────────────────────────────────────────────────

async function handleConfirmNo(interaction, client) {
  const parts  = interaction.customId.split('_');
  // format: confirm_no_<userId>
  const userId = parts[2];

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: '❌ This is not your application!', ephemeral: true });
  }

  db.deleteSession(userId);

  const cancelEmbed = new EmbedBuilder()
    .setColor(colors.ERROR)
    .setDescription('❌ Application cancelled.');

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirm_yes_${userId}_none`)
      .setLabel('Yes')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`confirm_no_${userId}`)
      .setLabel('No')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
  );

  return interaction.update({ embeds: [cancelEmbed], components: [disabledRow] });
}

// ─── DM Message Answer ────────────────────────────────────────────────────────

async function handleDMAnswer(message, client) {
  const userId  = message.author.id;
  const session = db.getSession(userId);
  if (!session || session.stage !== 'answering') return;

  const app = db.getApplication(session.guildId);
  if (!app || !app.active) {
    db.deleteSession(userId);
    const embed = new EmbedBuilder()
      .setColor(colors.ERROR)
      .setDescription('❌ The application has ended. Your answers were not submitted.');
    try {
      await message.channel.send({ embeds: [embed] });
    } catch {}
    return;
  }

  const answers   = [...session.answers, message.content];
  const nextIndex = session.currentQuestion + 1;

  if (nextIndex < app.questions.length) {
    // More questions left
    db.setSession(userId, { ...session, currentQuestion: nextIndex, answers });
    await sendQuestion(message.author, app.questions[nextIndex], nextIndex + 1, app.questions.length);
  } else {
    // All questions answered
    db.deleteSession(userId);

    const submissions = app.submissions || {};
    submissions[userId] = {
      answers,
      timestamp: Date.now(),
      status: 'pending',
    };
    db.setApplication(session.guildId, { ...app, submissions });

    // Wait embed to user
    const waitEmbed = new EmbedBuilder()
      .setColor(colors.MAIN)
      .setTitle('✅ Application Submitted!')
      .setDescription(
        `Hey <@${userId}> I have submitted your staff application. If your application gets accepted/denied I'll let you know.\n\nMake sure the result can take a few days or weeks, please wait and be patient.`
      )
      .setTimestamp();

    try {
      await message.channel.send({ embeds: [waitEmbed] });
    } catch {}

    await sendToStaffChannel(userId, message.author, answers, app, session.guildId, client);
  }
}

// ─── Send to Staff Channel ────────────────────────────────────────────────────

async function sendToStaffChannel(userId, user, answers, app, guildId, client) {
  try {
    const staffCh = await client.channels.fetch(app.staffChannelId);

    const qaText = app.questions
      .map((q, i) => `**Q${i + 1}:** ${q}\n**A:** ${answers[i] ?? '_No answer provided_'}`)
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(colors.MAIN)
      .setTitle('📋 New Staff Application')
      .setDescription(`**Applicant:** <@${userId}> (\`${user.tag}\`)\n\n${qaText}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: `User ID: ${userId}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_accept_${userId}_${guildId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`staff_deny_${userId}_${guildId}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger),
    );

    await staffCh.send({ embeds: [embed], components: [row] });
  } catch (e) {
    console.error('[Handler] Failed to send to staff channel:', e.message);
  }
}

// ─── Staff Accept/Deny ────────────────────────────────────────────────────────

async function handleStaffDecision(interaction, client, decision) {
  const parts   = interaction.customId.split('_');
  // format: staff_accept_<userId>_<guildId>  OR  staff_deny_<userId>_<guildId>
  const userId  = parts[2];
  const guildId = parts[3];

  const app = db.getApplication(guildId);
  if (!app) {
    return interaction.reply({ content: '❌ Application data not found.', ephemeral: true });
  }

  const hasPermission =
    interaction.member.roles.cache.has(app.staffRoleId) ||
    interaction.member.permissions.has('ManageGuild');

  if (!hasPermission) {
    return interaction.reply({ content: '❌ You don\'t have permission to review applications.', ephemeral: true });
  }

  const submission = (app.submissions || {})[userId];
  if (!submission) {
    return interaction.reply({ content: '❌ This application submission was not found.', ephemeral: true });
  }

  if (submission.status !== 'pending') {
    return interaction.reply({
      content: `❌ This application was already **${submission.status}**.`,
      ephemeral: true,
    });
  }

  // Update status in DB
  app.submissions[userId].status = decision;
  db.setApplication(guildId, app);

  const isAccepted = decision === 'accepted';
  const color      = isAccepted ? colors.SUCCESS : colors.ERROR;
  const label      = isAccepted ? '✅ Accepted' : '❌ Denied';

  // Safely update the embed
  const originalEmbed = interaction.message.embeds[0];
  const updatedEmbed  = originalEmbed
    ? EmbedBuilder.from(originalEmbed)
        .setColor(color)
        .setFooter({ text: `${label} by ${interaction.user.tag} • User ID: ${userId}` })
    : new EmbedBuilder().setColor(color).setDescription(`${label} by ${interaction.user.tag}`);

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`staff_accept_${userId}_${guildId}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`staff_deny_${userId}_${guildId}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
  );

  await interaction.update({ embeds: [updatedEmbed], components: [disabledRow] });

  // DM the applicant
  try {
    const applicant = await client.users.fetch(userId);
    const dmEmbed   = new EmbedBuilder()
      .setColor(color)
      .setTitle('📋 Application Result')
      .setDescription(
        isAccepted
          ? `✅ Congratulations <@${userId}>! Your staff application has been **accepted**!`
          : `❌ Hey <@${userId}>, your staff application has been **denied**. You may try again in the future.`
      )
      .setTimestamp();
    await applicant.send({ embeds: [dmEmbed] });
  } catch {
    // User has DMs closed — silently skip
  }
}

module.exports = {
  startApplication,
  endApplication,
  scheduleApplication,
  viewQuestions,
  handleApplyButton,
  handleConfirmYes,
  handleConfirmNo,
  handleDMAnswer,
  handleStaffDecision,
};

// : ! Aegis !
// + Discord: itsfizys
// + Community: https://discord.gg/aerox (AeroX Development )
// + for any queries reach out Community or DM me.
