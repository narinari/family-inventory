import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { apiClient } from '../lib/api-client.js';

export const data = new SlashCommandBuilder()
  .setName('whoami')
  .setDescription('連携されているユーザー情報を表示します');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const user = await apiClient.getUserByDiscordId(interaction.user.id);

    if (!user) {
      await interaction.editReply({
        content: '❌ Discord連携がされていません。\nWebサイトの設定画面からDiscord連携を行ってください。',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('👤 ユーザー情報')
      .addFields(
        { name: '名前', value: user.displayName, inline: true },
        { name: 'メール', value: user.email, inline: true },
        { name: 'ロール', value: user.role === 'admin' ? '管理者' : 'メンバー', inline: true }
      )
      .setFooter({ text: 'Family Inventory' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to get user info:', error);
    await interaction.editReply({
      content: '❌ ユーザー情報の取得に失敗しました。しばらく経ってから再度お試しください。',
    });
  }
}
