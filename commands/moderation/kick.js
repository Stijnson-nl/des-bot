const { EmbedBuilder } = require('discord.js');

const EMBED_COLOR = 0x992D22;

module.exports = {
  name: 'kick',
  description: 'Kick a member',
  options: [
    {
      name: 'user',
      type: 6, // USER
      description: 'The member to kick',
      required: true,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!interaction.member.permissions.has('KickMembers')) {
      const embed = new EmbedBuilder()
        .setTitle('Geen permissie')
        .setDescription('Je hebt geen permissie om leden te kicken.')
        .setColor(EMBED_COLOR);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (!member) {
      const embed = new EmbedBuilder()
        .setTitle('Ongeldige gebruiker')
        .setDescription('Geef een geldige gebruiker op.')
        .setColor(EMBED_COLOR);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    try {
      await member.kick();
      const embed = new EmbedBuilder()
        .setTitle('Lid gekickt')
        .setDescription(`${member.user.tag} is gekickt.`)
        .setColor(EMBED_COLOR);
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle('Fout')
        .setDescription(`Kon niet kicken: ${err.message}`)
        .setColor(EMBED_COLOR);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
}; 