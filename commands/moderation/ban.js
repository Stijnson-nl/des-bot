const { EmbedBuilder } = require('discord.js');

const EMBED_COLOR = 0x992D22;

module.exports = {
  name: 'ban',
  description: 'Ban a member',
  options: [
    {
      name: 'user',
      type: 6, // USER
      description: 'The member to ban',
      required: true,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!interaction.member.permissions.has('BanMembers')) {
      const embed = new EmbedBuilder()
        .setTitle('Geen permissie')
        .setDescription('Je hebt geen permissie om leden te bannen.')
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
      await member.ban();
      const embed = new EmbedBuilder()
        .setTitle('Lid verbannen')
        .setDescription(`${member.user.tag} is verbannen.`)
        .setColor(EMBED_COLOR);
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle('Fout')
        .setDescription(`Kon niet bannen: ${err.message}`)
        .setColor(EMBED_COLOR);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
}; 