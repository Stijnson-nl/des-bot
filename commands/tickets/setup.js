const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const EMBED_COLOR = 0x992D22;

module.exports = {
  name: 'ticketsetup',
  description: 'Setup the ticket system with categories and buttons',
  async execute(interaction) {
    // Defer reply immediately to prevent timeout
    await interaction.deferReply({ ephemeral: true });
    
    // Check if user has Administrator role OR is the server owner
    const hasAdminRole = interaction.member.roles.cache.some(role => 
      role.name.toLowerCase() === 'creator'
    );
    
    const isOwner = interaction.member.id === interaction.guild.ownerId;
    
    if (!hasAdminRole && !isOwner) {
      const embed = new EmbedBuilder()
        .setTitle('Geen permissie')
        .setDescription('Je hebt geen Administrator rol of ben geen server owner om het ticket systeem op te zetten.')
        .setColor(EMBED_COLOR);
      return interaction.editReply({ embeds: [embed] });
    }

    try {
      const guild = interaction.guild;
      
      // Check if categories already exist
      const existingQuestionCategory = guild.channels.cache.find(c => c.name === 'Question Tickets' && c.type === 4);
      const existingSolicitationCategory = guild.channels.cache.find(c => c.name === 'Solicitation Tickets' && c.type === 4);
      const existingComplaintCategory = guild.channels.cache.find(c => c.name === 'Complaint Tickets' && c.type === 4);
      
      if (existingQuestionCategory && existingSolicitationCategory && existingComplaintCategory) {
        // Categories exist, but we still want to send the ticket panel
        console.log('All ticket categories already exist, sending ticket panel...');
      }
      
      // Find support roles
      const supportRoles = guild.roles.cache.filter(role => 
        role.name.toLowerCase() === 'ticket support'
      );
      
      // Create permission overwrites for support roles
      const supportPermissions = supportRoles.map(role => ({
        id: role.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      }));
      
      // Create categories for different ticket types (only if they don't exist)
      const categories = {};
      
      if (!existingQuestionCategory) {
        categories.question = await guild.channels.create({
          name: 'Question Tickets',
          type: 4, // Category
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
            },
            ...supportPermissions,
          ],
        });
      } else {
        categories.question = existingQuestionCategory;
      }
      
      if (!existingSolicitationCategory) {
        categories.solicitation = await guild.channels.create({
          name: 'Solicitation Tickets',
          type: 4, // Category
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
            },
            ...supportPermissions,
          ],
        });
      } else {
        categories.solicitation = existingSolicitationCategory;
      }
      
      if (!existingComplaintCategory) {
        categories.complaint = await guild.channels.create({
          name: 'Complaint Tickets',
          type: 4, // Category
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
            },
            ...supportPermissions,
          ],
        });
      } else {
        categories.complaint = existingComplaintCategory;
      }

      // Create ticket panel embed
      const embed = new EmbedBuilder()
        .setTitle('🎫 Support Ticket System')
        .setDescription('Select the type of ticket you want to create:')
        .addFields(
          { name: '❓  Question', value: 'Ask a question about our services', inline: true },
          { name: '💼  Solicitation', value: 'Request information or services', inline: true },
          { name: '⚠️  Complaint', value: 'Report an issue or file a complaint', inline: true }
        )
        .setColor(EMBED_COLOR)
        .setFooter({ text: 'Click a button below to create a ticket' });

      // Create buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_question')
            .setLabel('Question')
           // .setEmoji('❓')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('ticket_solicitation')
            .setLabel('Solicitation')
         //   .setEmoji('💼')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('ticket_complaint')
            .setLabel('Complaint')
         //   .setEmoji('⚠️')
            .setStyle(ButtonStyle.Secondary)
        );

      // Send the ticket panel
      await interaction.channel.send({
        embeds: [embed],
        components: [row],
      });

      // Store categories in client for later use
      interaction.client.ticketCategories = categories;

      // Determine what was created vs what already existed
      const createdCategories = [];
      const existingCategories = [];
      
      if (!existingQuestionCategory) createdCategories.push('📋 Question Tickets');
      else existingCategories.push('📋 Question Tickets');
      
      if (!existingSolicitationCategory) createdCategories.push('💼 Solicitation Tickets');
      else existingCategories.push('💼 Solicitation Tickets');
      
      if (!existingComplaintCategory) createdCategories.push('⚠️ Complaint Tickets');
      else existingCategories.push('⚠️ Complaint Tickets');

      const successEmbed = new EmbedBuilder()
        .setTitle('Ticket System Setup Complete')
        .setDescription('The ticket system has been configured successfully.')
        .addFields(
          { name: 'Created Categories', value: createdCategories.length > 0 ? createdCategories.join('\n') : 'None (all existed)', inline: true },
          { name: 'Existing Categories', value: existingCategories.length > 0 ? existingCategories.join('\n') : 'None', inline: true },
          { name: 'Support Roles Found', value: supportRoles.size > 0 ? supportRoles.map(r => r.name).join(', ') : 'None found', inline: false }
        )
        .setColor(EMBED_COLOR);

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error setting up ticket system:', error);
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription(`Failed to setup ticket system: ${error.message}`)
        .setColor(EMBED_COLOR);
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
}; 