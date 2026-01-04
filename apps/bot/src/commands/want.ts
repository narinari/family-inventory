import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type ActionRowBuilder,
  type ButtonBuilder,
} from 'discord.js';
import { apiClient } from '../lib/api-client.js';
import { createWishlistActionRow } from '../lib/button-builders.js';

export const data = new SlashCommandBuilder()
  .setName('want')
  .setDescription('購入予定リストを管理します')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('欲しい物を追加します')
      .addStringOption((option) =>
        option.setName('name').setDescription('商品名').setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('priority')
          .setDescription('優先度')
          .setRequired(false)
          .addChoices(
            { name: '高', value: 'high' },
            { name: '中', value: 'medium' },
            { name: '低', value: 'low' }
          )
      )
      .addStringOption((option) =>
        option.setName('url').setDescription('商品URL').setRequired(false)
      )
      .addStringOption((option) =>
        option.setName('memo').setDescription('メモ').setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('購入予定一覧を表示します')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('done')
      .setDescription('購入完了にします')
      .addStringOption((option) =>
        option.setName('id').setDescription('購入予定ID').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('cancel')
      .setDescription('購入を見送ります')
      .addStringOption((option) =>
        option.setName('id').setDescription('購入予定ID').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('detail')
      .setDescription('購入予定の詳細を表示します')
      .addStringOption((option) =>
        option.setName('id').setDescription('購入予定ID').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('search')
      .setDescription('購入予定を検索します')
      .addStringOption((option) =>
        option.setName('keyword').setDescription('検索キーワード').setRequired(true)
      )
  );

async function checkUser(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const user = await apiClient.getUserByDiscordId(interaction.user.id);
  if (!user) {
    await interaction.editReply({
      content: 'Discord連携がされていません。\nWebサイトの設定画面からDiscord連携を行ってください。',
    });
    return false;
  }
  return true;
}

const priorityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const priorityEmojis: Record<string, string> = {
  high: '!!!',
  medium: '!!',
  low: '!',
};

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!(await checkUser(interaction))) return;

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'add':
      await handleAdd(interaction);
      break;
    case 'list':
      await handleList(interaction);
      break;
    case 'done':
      await handleDone(interaction);
      break;
    case 'cancel':
      await handleCancel(interaction);
      break;
    case 'detail':
      await handleDetail(interaction);
      break;
    case 'search':
      await handleSearch(interaction);
      break;
    default:
      await interaction.editReply({ content: '不明なサブコマンドです。' });
  }
}

async function handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString('name', true);
  const priority = interaction.options.getString('priority') as
    | 'high'
    | 'medium'
    | 'low'
    | null;
  const url = interaction.options.getString('url') || undefined;
  const memo = interaction.options.getString('memo') || undefined;

  try {
    const wishlist = await apiClient.createWishlistItem(interaction.user.id, {
      name,
      priority: priority || undefined,
      url,
      memo,
    });

    if (wishlist) {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('購入予定に追加しました')
        .addFields(
          { name: '商品名', value: wishlist.name, inline: true },
          { name: '優先度', value: priorityLabels[wishlist.priority] || '中', inline: true },
          { name: 'ID', value: wishlist.id.slice(0, 8), inline: true }
        )
        .setTimestamp();

      if (url) {
        embed.addFields({ name: 'URL', value: url });
      }
      if (memo) {
        embed.addFields({ name: 'メモ', value: memo });
      }

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({ content: '購入予定の追加に失敗しました。' });
    }
  } catch (error) {
    console.error('Failed to add wishlist item:', error);
    await interaction.editReply({ content: '購入予定の追加中にエラーが発生しました。' });
  }
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const wishlist = await apiClient.getWishlist(interaction.user.id, 'pending');

    if (wishlist.length === 0) {
      await interaction.editReply({ content: '購入予定はありません。' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('購入予定リスト')
      .setDescription(`全 ${wishlist.length} 件（ボタン操作は最初の5件のみ）`)
      .setTimestamp();

    // 優先度でソート
    const sorted = [...wishlist].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // 最大5件までボタン表示（Discordの制限: 1メッセージに最大5 ActionRow）
    const displayItems = sorted.slice(0, 5);
    const itemList = displayItems
      .map((item, index) => {
        const emoji = priorityEmojis[item.priority] || '';
        return `${index + 1}. ${emoji} **${item.name}** (ID: \`${item.id.slice(0, 8)}\`)`;
      })
      .join('\n');

    embed.addFields({ name: '購入予定', value: itemList });

    if (wishlist.length > 5) {
      embed.setFooter({ text: `他 ${wishlist.length - 5} 件（/want search で検索）` });
    }

    // 各アイテムにボタンを追加
    const components: ActionRowBuilder<ButtonBuilder>[] = displayItems.map((item) =>
      createWishlistActionRow(item.id)
    );

    await interaction.editReply({ embeds: [embed], components });
  } catch (error) {
    console.error('Failed to list wishlist:', error);
    await interaction.editReply({ content: '購入予定一覧の取得中にエラーが発生しました。' });
  }
}

async function handleDone(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getString('id', true);

  try {
    const result = await apiClient.purchaseWishlistItem(interaction.user.id, id);

    if (result) {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('購入完了')
        .setDescription(`「${result.wishlist.name}」を購入完了にしました。\n持ち物にも登録されました。`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: '購入完了処理に失敗しました。IDを確認してください。',
      });
    }
  } catch (error) {
    console.error('Failed to complete purchase:', error);
    await interaction.editReply({ content: '処理中にエラーが発生しました。' });
  }
}

async function handleCancel(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getString('id', true);

  try {
    const success = await apiClient.cancelWishlistItem(interaction.user.id, id);

    if (success) {
      await interaction.editReply({ content: '購入を見送りにしました。' });
    } else {
      await interaction.editReply({
        content: '見送り処理に失敗しました。IDを確認してください。',
      });
    }
  } catch (error) {
    console.error('Failed to cancel wishlist item:', error);
    await interaction.editReply({ content: '処理中にエラーが発生しました。' });
  }
}

async function handleDetail(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getString('id', true);

  try {
    // 一覧から取得して該当するものを探す
    const wishlist = await apiClient.getWishlist(interaction.user.id);
    const item = wishlist.find((w) => w.id === id || w.id.startsWith(id));

    if (!item) {
      await interaction.editReply({ content: '購入予定が見つかりませんでした。' });
      return;
    }

    const statusLabels: Record<string, string> = {
      pending: '検討中',
      purchased: '購入済み',
      cancelled: '見送り',
    };

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(item.name)
      .addFields(
        { name: 'ステータス', value: statusLabels[item.status] || item.status, inline: true },
        { name: '優先度', value: priorityLabels[item.priority] || '中', inline: true },
        { name: 'ID', value: item.id, inline: false }
      )
      .setTimestamp();

    if (item.priceRange) {
      embed.addFields({ name: '価格帯', value: item.priceRange, inline: true });
    }
    if (item.url) {
      embed.addFields({ name: 'URL', value: item.url });
    }
    if (item.memo) {
      embed.addFields({ name: 'メモ', value: item.memo });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to get wishlist detail:', error);
    await interaction.editReply({ content: '詳細の取得中にエラーが発生しました。' });
  }
}

async function handleSearch(interaction: ChatInputCommandInteraction): Promise<void> {
  const keyword = interaction.options.getString('keyword', true);

  try {
    const wishlist = await apiClient.searchWishlist(interaction.user.id, keyword);

    if (wishlist.length === 0) {
      await interaction.editReply({
        content: `「${keyword}」に一致する購入予定は見つかりませんでした。`,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`検索結果: "${keyword}"`)
      .setDescription(`${wishlist.length} 件見つかりました`)
      .setTimestamp();

    const displayItems = wishlist.slice(0, 10);
    const itemList = displayItems
      .map((item, index) => {
        const emoji = priorityEmojis[item.priority] || '';
        return `${index + 1}. ${emoji} **${item.name}** (ID: \`${item.id.slice(0, 8)}\`)`;
      })
      .join('\n');

    embed.addFields({ name: '購入予定', value: itemList });

    if (wishlist.length > 10) {
      embed.setFooter({ text: `他 ${wishlist.length - 10} 件` });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to search wishlist:', error);
    await interaction.editReply({ content: '検索中にエラーが発生しました。' });
  }
}
