import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('利用可能なコマンド一覧を表示します');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('ヘルプ - コマンド一覧')
    .setDescription('Family Inventory Botで利用可能なコマンドです。')
    .addFields(
      {
        name: '基本コマンド',
        value: [
          '`/ping` - Botの応答速度を確認',
          '`/whoami` - 連携ユーザー情報を表示',
          '`/help` - このヘルプを表示',
        ].join('\n'),
      },
      {
        name: '持ち物管理',
        value: [
          '`/item add <name>` - 持ち物を登録',
          '`/item list` - 持ち物一覧を表示',
          '`/item search <query>` - 持ち物を検索',
          '`/item where <query>` - 持ち物の場所を検索',
          '`/item use <id>` - 消費済みにする',
          '`/item give <id> <to>` - 譲渡済みにする',
          '`/item sell <id>` - 売却済みにする',
        ].join('\n'),
      },
      {
        name: '購入予定リスト',
        value: [
          '`/want add <name>` - 欲しい物を追加',
          '`/want list` - 購入予定一覧',
          '`/want done <id>` - 購入完了',
          '`/want cancel <id>` - 見送り',
          '`/want detail <id>` - 詳細表示',
        ].join('\n'),
      },
      {
        name: '箱・保管場所',
        value: [
          '`/box list` - 箱一覧',
          '`/box contents <id>` - 箱の中身を表示',
          '`/place list` - 保管場所一覧',
          '`/place boxes <id>` - 保管場所の箱を表示',
        ].join('\n'),
      },
      {
        name: '使い方',
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
