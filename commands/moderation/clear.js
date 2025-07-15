const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'clear',
  description: 'Clear messages',
  options: [
    {
      name: 'amount',
      type: 4, // INTEGER
      description: 'Number of messages to delete (1-100)',
      required: true,
    },
  ],
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
      const embed = new EmbedBuilder()
        .setTitle('Geen permissie')
        .setDescription('Je hebt geen permissie om berichten te verwijderen.')
        .setColor(0xFF0000);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const amount = interaction.options.getInteger('amount');
    if (isNaN(amount) || amount < 1 || amount > 100) {
      const embed = new EmbedBuilder()
        .setTitle('Ongeldig aantal')
        .setDescription('Geef een getal tussen 1 en 100 op.')
        .setColor(0xFF0000);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    try {
      await interaction.channel.bulkDelete(amount, true);
      const embed = new EmbedBuilder()
        .setTitle('Berichten verwijderd')
        .setDescription(`${amount} berichten verwijderd.`)
        .setColor(0x7289DA);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle('Fout')
        .setDescription(`Kon niet verwijderen: ${err.message}`)
        .setColor(0xFF0000);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
}; 