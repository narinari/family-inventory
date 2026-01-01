import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('利用可能なコマンド一覧を表示します');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📚 ヘルプ - コマンド一覧')
    .setDescription('Family Inventory Botで利用可能なコマンドです。')
    .addFields(
      {
        name: '🔧 基本コマンド',
        value: [
          '`/ping` - Botの応答速度を確認',
          '`/whoami` - 連携ユーザー情報を表示',
          '`/help` - このヘルプを表示',
        ].join('\n'),
      },
      {
        name: '📋 使い方',
        value: [
          '1. Webサイトでログイン',
          '2. 設定画面からDiscord連携を実行',
          '3. Botコマンドが利用可能に',
        ].join('\n'),
      }
    )
    .setFooter({ text: 'Family Inventory Bot' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
