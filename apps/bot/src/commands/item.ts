import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { apiClient } from '../lib/api-client.js';

export const data = new SlashCommandBuilder()
  .setName('item')
  .setDescription('持ち物を管理します')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('持ち物を登録します')
      .addStringOption((option) =>
        option.setName('name').setDescription('アイテム名').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('memo').setDescription('メモ').setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('持ち物一覧を表示します')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('search')
      .setDescription('持ち物を検索します')
      .addStringOption((option) =>
        option.setName('query').setDescription('検索キーワード').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('where')
      .setDescription('持ち物の場所を検索します')
      .addStringOption((option) =>
        option.setName('query').setDescription('検索キーワード').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('use')
      .setDescription('持ち物を消費済みにします')
      .addStringOption((option) =>
        option.setName('id').setDescription('アイテムID').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('give')
      .setDescription('持ち物を譲渡済みにします')
      .addStringOption((option) =>
        option.setName('id').setDescription('アイテムID').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('to').setDescription('譲渡先').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('sell')
      .setDescription('持ち物を売却済みにします')
      .addStringOption((option) =>
        option.setName('id').setDescription('アイテムID').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('to').setDescription('売却先').setRequired(false)
      )
      .addNumberOption((option) =>
        option.setName('price').setDescription('売却価格').setRequired(false)
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
    case 'search':
      await handleSearch(interaction);
      break;
    case 'where':
      await handleWhere(interaction);
      break;
    case 'use':
      await handleUse(interaction);
      break;
    case 'give':
      await handleGive(interaction);
      break;
    case 'sell':
      await handleSell(interaction);
      break;
    default:
      await interaction.editReply({ content: '不明なサブコマンドです。' });
  }
}

async function handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString('name', true);
  const memo = interaction.options.getString('memo') || undefined;

  try {
    const item = await apiClient.createItem(interaction.user.id, {
      itemTypeName: name,
      memo,
    });

    if (item) {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('持ち物を登録しました')
        .addFields(
          { name: '名前', value: item.itemTypeName, inline: true },
          { name: 'ID', value: item.id, inline: true }
        )
        .setTimestamp();

      if (memo) {
        embed.addFields({ name: 'メモ', value: memo });
      }

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({ content: '持ち物の登録に失敗しました。' });
    }
  } catch (error) {
    console.error('Failed to add item:', error);
    await interaction.editReply({ content: '持ち物の登録中にエラーが発生しました。' });
  }
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const items = await apiClient.getItems(interaction.user.id, 'owned');

    if (items.length === 0) {
      await interaction.editReply({ content: '持ち物がありません。' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('持ち物一覧')
      .setDescription(`全 ${items.length} 件`)
      .setTimestamp();

    const displayItems = items.slice(0, 10);
    const itemList = displayItems
      .map((item, index) => `${index + 1}. **${item.itemTypeName}** (ID: \`${item.id.slice(0, 8)}\`)`)
      .join('\n');

    embed.addFields({ name: '持ち物', value: itemList });

    if (items.length > 10) {
      embed.setFooter({ text: `他 ${items.length - 10} 件` });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to list items:', error);
    await interaction.editReply({ content: '持ち物一覧の取得中にエラーが発生しました。' });
  }
}

async function handleSearch(interaction: ChatInputCommandInteraction): Promise<void> {
  const query = interaction.options.getString('query', true);

  try {
    const results = await apiClient.searchItems(interaction.user.id, query);

    if (results.length === 0) {
      await interaction.editReply({ content: `「${query}」に該当する持ち物が見つかりませんでした。` });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`検索結果: "${query}"`)
      .setDescription(`${results.length} 件見つかりました`)
      .setTimestamp();

    const displayResults = results.slice(0, 10);
    const resultList = displayResults
      .map((result, index) => {
        let location = '場所未設定';
        if (result.location && result.box) {
          location = `${result.location.name} > ${result.box.name}`;
        } else if (result.box) {
          location = result.box.name;
        }
        return `${index + 1}. **${result.item.itemTypeName}** - ${location}`;
      })
      .join('\n');

    embed.addFields({ name: '検索結果', value: resultList });

    if (results.length > 10) {
      embed.setFooter({ text: `他 ${results.length - 10} 件` });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to search items:', error);
    await interaction.editReply({ content: '検索中にエラーが発生しました。' });
  }
}

async function handleWhere(interaction: ChatInputCommandInteraction): Promise<void> {
  const query = interaction.options.getString('query', true);

  try {
    const results = await apiClient.searchItems(interaction.user.id, query);

    if (results.length === 0) {
      await interaction.editReply({ content: `「${query}」に該当する持ち物が見つかりませんでした。` });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`場所検索: "${query}"`)
      .setTimestamp();

    const displayResults = results.slice(0, 5);
    for (const result of displayResults) {
      let location = '場所未設定';
      if (result.location && result.box) {
        location = `${result.location.name} > ${result.box.name}`;
      } else if (result.box) {
        location = result.box.name;
      }

      embed.addFields({
        name: result.item.itemTypeName,
        value: location,
        inline: false,
      });
    }

    if (results.length > 5) {
      embed.setFooter({ text: `他 ${results.length - 5} 件` });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to search item location:', error);
    await interaction.editReply({ content: '場所検索中にエラーが発生しました。' });
  }
}

async function handleUse(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getString('id', true);

  try {
    const success = await apiClient.consumeItem(interaction.user.id, id);

    if (success) {
      await interaction.editReply({ content: '持ち物を消費済みにしました。' });
    } else {
      await interaction.editReply({
        content: '持ち物を消費済みにできませんでした。IDを確認してください。',
      });
    }
  } catch (error) {
    console.error('Failed to consume item:', error);
    await interaction.editReply({ content: '処理中にエラーが発生しました。' });
  }
}

async function handleGive(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getString('id', true);
  const to = interaction.options.getString('to', true);

  try {
    const success = await apiClient.giveItem(interaction.user.id, id, to);

    if (success) {
      await interaction.editReply({ content: `持ち物を「${to}」に譲渡済みにしました。` });
    } else {
      await interaction.editReply({
        content: '持ち物を譲渡済みにできませんでした。IDを確認してください。',
      });
    }
  } catch (error) {
    console.error('Failed to give item:', error);
    await interaction.editReply({ content: '処理中にエラーが発生しました。' });
  }
}

async function handleSell(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getString('id', true);
  const to = interaction.options.getString('to') || undefined;
  const price = interaction.options.getNumber('price') || undefined;

  try {
    const success = await apiClient.sellItem(interaction.user.id, id, to, price);

    if (success) {
      let message = '持ち物を売却済みにしました。';
      if (to) message = `持ち物を「${to}」に売却済みにしました。`;
      if (price !== undefined) message += ` (${price}円)`;
      await interaction.editReply({ content: message });
    } else {
      await interaction.editReply({
        content: '持ち物を売却済みにできませんでした。IDを確認してください。',
      });
    }
  } catch (error) {
    console.error('Failed to sell item:', error);
    await interaction.editReply({ content: '処理中にエラーが発生しました。' });
  }
}
