const { EmbedBuilder } = require('discord.js');

const EMBED_COLOR = 0x992D22;

module.exports = {
  name: 'mute',
  description: 'Mute a member for 10 minutes',
  options: [
    {
      name: 'user',
      type: 6, // USER
      description: 'The member to mute',
      required: true,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!interaction.member.permissions.has('ModerateMembers')) {
      const embed = new EmbedBuilder()
        .setTitle('Geen permissie')
        .setDescription('Je hebt geen permissie om leden te muten.')
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
      await member.timeout(10 * 60 * 1000);
      const embed = new EmbedBuilder()
        .setTitle('Lid gemute')
        .setDescription(`${member.user.tag} is voor 10 minuten gemute.`)
        .setColor(EMBED_COLOR);
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle('Fout')
        .setDescription(`Kon niet muten: ${err.message}`)
        .setColor(EMBED_COLOR);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
}; 