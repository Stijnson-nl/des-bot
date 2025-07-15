const { EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');

const EMBED_COLOR = 0x992D22;

module.exports = {
  name: 'close',
  description: 'Close the current ticket',
  async execute(interaction) {
    // Defer reply immediately to prevent timeout
    await interaction.deferReply({ ephemeral: false });
    
    const channel = interaction.channel;
    
    // Check if this is actually a ticket channel
    if (!channel.name.startsWith('ticket-')) {
      const embed = new EmbedBuilder()
        .setTitle('Geen ticket kanaal')
        .setDescription('Dit commando kan alleen gebruikt worden in een ticket kanaal.')
        .setColor(EMBED_COLOR);
      return interaction.editReply({ embeds: [embed] });
    }

    // Check if user has permission to close tickets
    const hasAdminRole = interaction.member.roles.cache.some(role => 
      role.name.toLowerCase() === 'ticket support'
    );
    
    if (!hasAdminRole) {
      const embed = new EmbedBuilder()
        .setTitle('Geen permissie')
        .setDescription('Je hebt geen permissie om tickets te sluiten.')
        .setColor(EMBED_COLOR);
      return interaction.editReply({ embeds: [embed] });
    }

    try {
      // Get ticket information
      const ticketType = channel.parent?.name || 'Unknown';
      const ticketCreator = channel.topic ? channel.topic.split('|')[0].trim() : 'Unknown';
      const closedBy = interaction.user.tag;
      const closedAt = new Date().toLocaleString();

      // Generate ticket number from channel name
      const ticketNumber = channel.name.replace('ticket-', '');

      // Generate transcript before closing
      const messages = await channel.messages.fetch({ limit: 100 });
      let transcript = `=== TICKET-${ticketNumber} ===\n`;
      transcript += `Ticket: ${channel.name}\n`;
      transcript += `Type: ${ticketType}\n`;
      transcript += `Created: ${channel.createdAt.toLocaleString()}\n`;
      transcript += `Closed: ${closedAt}\n`;
      transcript += `Closed by: ${closedBy}\n`;
      transcript += `================================\n\n`;

      // Sort messages by timestamp
      const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      // Add each message to transcript
      for (const message of sortedMessages.values()) {
        const timestamp = message.createdAt.toLocaleString();
        const author = message.author.tag;
        const content = message.content || '[No text content]';
        
        transcript += `[${timestamp}] ${author}:\n${content}\n\n`;
        
        // Add attachments if any
        if (message.attachments.size > 0) {
          transcript += `[Attachments: ${message.attachments.map(a => a.url).join(', ')}]\n\n`;
        }
      }

      // Create transcript file
      const fs = require('fs');
      const path = require('path');
      const fileName = `TICKET-${ticketNumber}-${Date.now()}.txt`;
      const filePath = path.join(__dirname, '..', '..', fileName);
      
      fs.writeFileSync(filePath, transcript);

      // Create attachment
      const attachment = new AttachmentBuilder(filePath, { name: fileName });

      // Find or create ticket-logs channel
      let logsChannel = interaction.guild.channels.cache.find(c => 
        c.name === 'ticket-logs' && c.type === 0
      );

      if (!logsChannel) {
        logsChannel = await interaction.guild.channels.create({
          name: 'ticket-logs',
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

      // Get ticket creator ID from topic if possible
      let ticketCreatorId = null;
      if (channel.topic) {
        const parts = channel.topic.split('|').map(s => s.trim());
        if (parts.length > 1) ticketCreatorId = parts[1];
      }

      // Create closed info embed for ticket-logs
      const closedInfoEmbed = new EmbedBuilder()
        .setTitle(`Ticket-${ticketNumber} gesloten`)
        .setDescription(`Maker: ${ticketCreatorId ? `<@${ticketCreatorId}>` : 'Onbekend'}\nGesloten door: <@${interaction.user.id}>`)
        .setColor(EMBED_COLOR)
        .setTimestamp();

      // Send only transcript and closed info embed to ticket-logs channel
      await logsChannel.send({
        embeds: [closedInfoEmbed],
        files: [attachment],
      });

      // Send confirmation to the ticket channel
      const confirmEmbed = new EmbedBuilder()
        .setTitle('Ticket Gesloten')
        .setDescription(`Dit ticket wordt over 5 seconden gesloten door ${closedBy}.`)
        .setColor(EMBED_COLOR)
        .setTimestamp();

      await interaction.editReply({ embeds: [confirmEmbed] });

      // Delete the channel after 5 seconds
      setTimeout(async () => {
        try {
          await channel.delete();
        } catch (error) {
          console.error('Error deleting ticket channel:', error);
        }
      }, 5000);

      // Clean up transcript file after 10 seconds
      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error('Error deleting transcript file:', error);
        }
      }, 10000);

    } catch (error) {
      console.error('Error closing ticket:', error);
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`Fout bij sluiten van ticket: ${error.message}`)
        .setColor(EMBED_COLOR);
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
}; 