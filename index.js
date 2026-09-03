const express = require('express')
const app = express()
const port = process.env.PORT || 4000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const TICKET_COUNTER_FILE = path.join(__dirname, 'ticket_counter.json');

function getNextTicketNumber() {
  let counter = 1;
  try {
    if (fs.existsSync(TICKET_COUNTER_FILE)) {
      const data = fs.readFileSync(TICKET_COUNTER_FILE, 'utf8');
      counter = JSON.parse(data).counter + 1;
    }
    fs.writeFileSync(TICKET_COUNTER_FILE, JSON.stringify({ counter }), 'utf8');
  } catch (err) {
    console.error('Error reading/writing ticket counter:', err);
  }
  return counter;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

const TOKEN = process.env.DISCORD_TOKEN; // Replace with your bot token
if (!TOKEN) {
  throw new Error("DISCORD_TOKEN ontbreekt");
}
const CLIENT_ID = '1106928382752600204'; // Replace with your bot's client ID
const GUILD_ID = '1394401573240574154'; // Replace with your test server's guild ID

client.commands = new Collection();

// Load commands from both moderation and tickets folders
const commandFolders = ['moderation', 'tickets'];
const slashCommands = [];

for (const folder of commandFolders) {
  const commandsPath = path.join(__dirname, 'commands', folder);
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if (command.name && typeof command.execute === 'function') {
        // Add slash command data
        slashCommands.push({
          name: command.name,
          description: command.description || 'No description',
          options: command.options || [],
        });
        client.commands.set(command.name, command);
      }
    }
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  // VERWIJDER ALLE GLOBALE COMMANDS (tijdelijk)
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [] }
    );
    console.log('Alle globale slash commands verwijderd.');
  } catch (error) {
    console.error('Fout bij verwijderen globale commands:', error);
  }
  // Registreer alleen de gewenste guild commands
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: slashCommands }
    );
    console.log('Slash commands geregistreerd.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
  // Log alle globale commands
  try {
    const globalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    console.log('Globale commands:', globalCommands.map(cmd => cmd.name));
  } catch (error) {
    console.error('Fout bij ophalen globale commands:', error);
  }
  // Log alle guild commands
  try {
    const guildCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    console.log('Guild commands:', guildCommands.map(cmd => cmd.name));
  } catch (error) {
    console.error('Fout bij ophalen guild commands:', error);
  }
  // Set initial status
  updateMemberStatus();
  // (Automatic member role assignment removed)
});

function updateMemberStatus() {
  const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  client.user.setActivity(`${totalMembers} members`, { type: 3 }); // 3 = Watching
}

// (Automatic member role assignment on join removed)
// client.on('guildMemberAdd', async (member) => {
//   // Zoek de rol "member" (hoofdlettergevoelig!)
//   const role = member.guild.roles.cache.find(r => r.name.toLowerCase() === 'member');
//   if (role) {
//     try {
//       await member.roles.add(role);
//       console.log(`Gave 'member' role to ${member.user.tag}`);
//     } catch (err) {
//       console.error(`Failed to give 'member' role to ${member.user.tag}:`, err);
//     }
//   } else {
//     console.warn("Role 'member' not found!");
//   }
// });

client.on('guildMemberRemove', updateMemberStatus);

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      // Log command execution
      await logCommandExecution(interaction, command);
      
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      try {
        if (interaction.deferred) {
          await interaction.editReply({ content: 'There was an error executing that command.' });
        } else {
          await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  } else if (interaction.isButton()) {
    if (interaction.customId.startsWith('ticket_')) {
      await handleTicketButton(interaction);
    } else if (interaction.customId === 'close_ticket') {
      // Show confirmation
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_close_ticket')
          .setLabel('Yes, close ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_close_ticket')
          .setLabel('No, keep open')
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ content: 'Are you sure you want to close this ticket?', components: [confirmRow], ephemeral: true });
    } else if (interaction.customId === 'confirm_close_ticket') {
      // Call the close command logic
      const closeCommand = client.commands.get('close');
      if (closeCommand) await closeCommand.execute(interaction);
    } else if (interaction.customId === 'cancel_close_ticket') {
      await interaction.reply({ content: 'Ticket closure cancelled.', ephemeral: true });
    }
  }
});

async function logCommandExecution(interaction, command) {
  const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
  const EMBED_COLOR = 0x992D22;
  
  try {
    // Get command options/arguments
    let commandDetails = `/${command.name}`;
    if (interaction.options.data && interaction.options.data.length > 0) {
      const options = interaction.options.data.map(option => {
        if (option.type === 6) { // USER type
          return `@${option.user?.username || 'unknown'}`;
        } else if (option.type === 4) { // INTEGER type
          return option.value;
        } else if (option.type === 3) { // STRING type
          return `"${option.value}"`;
        } else {
          return option.value;
        }
      });
      commandDetails += ` ${options.join(' ')}`;
    }

    // Create log embed
    const logEmbed = new EmbedBuilder()
      .setTitle(`🔧 ${command.name.toUpperCase()}`)
      .addFields(
        { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
        { name: 'Command', value: commandDetails, inline: true },
        { name: 'User', value: `<@${interaction.user.id}> (${interaction.user.id})`, inline: false }
      )
      .setColor(EMBED_COLOR)
      .setTimestamp();

    // Find or create discord-logs channel
    let logsChannel = interaction.guild.channels.cache.find(c => 
      c.name === 'discord-logs' && c.type === 0
    );

    if (!logsChannel) {
      logsChannel = await interaction.guild.channels.create({
        name: 'discord-logs',
        type: 0, // Text channel
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
        ],
      });
    }

    // Send log to discord-logs channel (no user mention in content)
    await logsChannel.send({ embeds: [logEmbed] });

  } catch (error) {
    console.error('Error logging command execution:', error);
  }
}

async function handleTicketButton(interaction) {
  const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
  const EMBED_COLOR = 0x992D22;
  
  const ticketType = interaction.customId.replace('ticket_', '');
  const user = interaction.user;
  
  // Get or create the appropriate category
  let category;
  if (ticketType === 'question') {
    category = interaction.guild.channels.cache.find(c => c.name === 'Question Tickets' && c.type === 4);
  } else if (ticketType === 'solicitation') {
    category = interaction.guild.channels.cache.find(c => c.name === 'Solicitation Tickets' && c.type === 4);
  } else if (ticketType === 'complaint') {
    category = interaction.guild.channels.cache.find(c => c.name === 'Complaint Tickets' && c.type === 4);
  }
  
  if (!category) {
    const embed = new EmbedBuilder()
      .setTitle('Error')
      .setDescription('Ticket categories not found. Please run `/ticketsetup` first.')
      .setColor(EMBED_COLOR);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  // Generate unique ticket number
  const existingTickets = interaction.guild.channels.cache.filter(
    channel => channel.name.startsWith('ticket-') && channel.parent && (
      channel.parent.name === 'Question Tickets' ||
      channel.parent.name === 'Solicitation Tickets' ||
      channel.parent.name === 'Complaint Tickets'
    )
  );
  const ticketNumber = getNextTicketNumber();
  const ticketName = `ticket-${ticketNumber.toString().padStart(4, '0')}`;
  
  // Check if user already has an open ticket
  const existingTicket = interaction.guild.channels.cache.find(
    channel => channel.name.startsWith('ticket-') && channel.parent && (
      channel.parent.name === 'Question Tickets' ||
      channel.parent.name === 'Solicitation Tickets' ||
      channel.parent.name === 'Complaint Tickets'
    ) && channel.topic && channel.topic.includes(user.id)
  );
  
  if (existingTicket) {
    const embed = new EmbedBuilder()
      .setTitle('Ticket Already Exists')
      .setDescription(`You already have an open ticket: ${existingTicket}`)
      .setColor(EMBED_COLOR);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  try {
    // Find support roles for individual ticket channels
    const supportRoles = interaction.guild.roles.cache.filter(role => 
      role.name.toLowerCase() === 'ticket support'
    );
    
    // Create permission overwrites for support roles
    const supportPermissions = supportRoles.map(role => ({
      id: role.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    }));
    
    // Create the ticket channel with topic containing creator info
    const ticketChannel = await interaction.guild.channels.create({
      name: ticketName,
      type: 0, // Text channel
      parent: category,
      topic: `${user.tag} | ${user.id}`,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: interaction.client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
        },
        ...supportPermissions,
      ],
    });
    
    const embed = new EmbedBuilder()
      .setTitle(`🎫 ${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} Ticket`)
      .setDescription(`Welcome ${user}! Please describe your ${ticketType} and a staff member will assist you shortly.`)
      .addFields(
        { name: 'Ticket Number', value: `#${ticketNumber.toString().padStart(4, '0')}`, inline: true },
        { name: 'Ticket Type', value: ticketType.charAt(0).toUpperCase() + ticketType.slice(1), inline: true },
        { name: 'Created By', value: user.tag, inline: true }
      )
      .setColor(EMBED_COLOR)
      .setTimestamp();
    
    const closeButtonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
    );
    await ticketChannel.send({ embeds: [embed], components: [closeButtonRow] });
    
    const successEmbed = new EmbedBuilder()
      .setTitle('Ticket Created')
      .setDescription(`Your ticket has been created: ${ticketChannel}`)
      .setColor(EMBED_COLOR);
    
    await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    const errorEmbed = new EmbedBuilder()
      .setTitle('Error')
      .setDescription(`Failed to create ticket: ${error.message}`)
      .setColor(EMBED_COLOR);
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}

client.login(TOKEN); 
