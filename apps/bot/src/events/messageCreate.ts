import { type Message, EmbedBuilder } from 'discord.js';
import { parseNaturalLanguage, isNlpEnabled, type ParsedIntent } from '../lib/nlp.js';
import { apiClient } from '../lib/api-client.js';

export const name = 'messageCreate';

export async function execute(message: Message): Promise<void> {
  // Botのメッセージは無視
  if (message.author.bot) return;

  // NLPが有効でない場合は何もしない
  if (!isNlpEnabled()) return;

  // Botへのメンションがある場合のみ処理
  const botMention = message.mentions.users.has(message.client.user?.id ?? '');
  if (!botMention) return;

  // メンションを除去してメッセージを取得
  const content = message.content
    .replace(/<@!?\d+>/g, '')
    .trim();

  if (!content) {
    await message.reply('何かメッセージを入力してください。');
    return;
  }

  // ユーザー認証チェック
  const user = await apiClient.getUserByDiscordId(message.author.id);
  if (!user) {
    await message.reply(
      'Discord連携がされていません。\nWebサイトの設定画面からDiscord連携を行ってください。'
    );
    return;
  }

  // 処理中を示すリアクション
  await message.react('🤔');

  try {
    // 自然言語解析
    const parsed = await parseNaturalLanguage(content);

    // 処理
    const response = await handleIntent(message.author.id, parsed, content);

    // リアクションを更新
    await message.reactions.removeAll();

    if (response.success) {
      await message.react('✅');
    }

    if (response.embed) {
      await message.reply({ embeds: [response.embed] });
    } else if (response.message) {
      await message.reply(response.message);
    }
  } catch (error) {
    console.error('NLP processing error:', error);
    await message.reactions.removeAll();
    await message.react('❌');
    await message.reply('処理中にエラーが発生しました。');
  }
}

interface HandleResult {
  success: boolean;
  message?: string;
  embed?: EmbedBuilder;
}

async function handleIntent(
  discordId: string,
  parsed: ParsedIntent,
  originalMessage: string
): Promise<HandleResult> {
  const { intent, params, confidence } = parsed;

  // 確信度が低い場合
  if (confidence < 0.5) {
    return {
      success: false,
      message: `すみません、「${originalMessage}」の意図がよく分かりませんでした。\nスラッシュコマンドをお試しください。\n\`/help\` でコマンド一覧を確認できます。`,
    };
  }

  switch (intent) {
    case 'search_location':
      return handleSearchLocation(discordId, params.itemName);

    case 'add_item':
      return handleAddItem(discordId, params.itemName);

    case 'add_wishlist':
      return handleAddWishlist(discordId, params.itemName);

    case 'purchase_complete':
      return handlePurchaseComplete(discordId, params.itemName);

    case 'consume_item':
      return handleConsumeItem(discordId, params.itemName);

    case 'give_item':
      return handleGiveItem(discordId, params.itemName, params.recipientName);

    case 'sell_item':
      return handleSellItem(discordId, params.itemName, params.recipientName, params.price);

    case 'list_items':
      return handleListItems(discordId, params.itemName);

    case 'move_item':
      return handleMoveItem(discordId, params.itemName, params.boxName);

    default:
      return {
        success: false,
        message: `すみません、「${originalMessage}」の処理方法が分かりませんでした。\n\`/help\` でコマンド一覧を確認できます。`,
      };
  }
}

async function handleSearchLocation(
  discordId: string,
  itemName?: string
): Promise<HandleResult> {
  if (!itemName) {
    return { success: false, message: '検索する物の名前を指定してください。' };
  }

  const results = await apiClient.searchItems(discordId, itemName);

  if (results.length === 0) {
    return { success: true, message: `「${itemName}」は見つかりませんでした。` };
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${itemName} の場所`)
    .setTimestamp();

  for (const result of results.slice(0, 5)) {
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

  return { success: true, embed };
}

async function handleAddItem(discordId: string, itemName?: string): Promise<HandleResult> {
  if (!itemName) {
    return { success: false, message: '登録する物の名前を指定してください。' };
  }

  const item = await apiClient.createItem(discordId, { itemTypeName: itemName });

  if (item) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('持ち物を登録しました')
      .addFields({ name: '名前', value: item.itemTypeName, inline: true })
      .setTimestamp();

    return { success: true, embed };
  }

  return { success: false, message: '持ち物の登録に失敗しました。' };
}

async function handleAddWishlist(discordId: string, itemName?: string): Promise<HandleResult> {
  if (!itemName) {
    return { success: false, message: '欲しい物の名前を指定してください。' };
  }

  const wishlist = await apiClient.createWishlistItem(discordId, { name: itemName });

  if (wishlist) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('購入予定に追加しました')
      .addFields({ name: '商品名', value: wishlist.name, inline: true })
      .setTimestamp();

    return { success: true, embed };
  }

  return { success: false, message: '購入予定の追加に失敗しました。' };
}

async function handlePurchaseComplete(
  discordId: string,
  itemName?: string
): Promise<HandleResult> {
  if (!itemName) {
    return { success: false, message: '届いた物の名前を指定してください。' };
  }

  // 購入予定から検索
  const wishlist = await apiClient.getWishlist(discordId, 'pending');
  const matched = wishlist.find((w) =>
    w.name.toLowerCase().includes(itemName.toLowerCase())
  );

  if (!matched) {
    return {
      success: false,
      message: `購入予定に「${itemName}」が見つかりませんでした。`,
    };
  }

  const result = await apiClient.purchaseWishlistItem(discordId, matched.id);

  if (result) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('購入完了')
      .setDescription(`「${matched.name}」を購入完了にしました。\n持ち物にも登録されました。`)
      .setTimestamp();

    return { success: true, embed };
  }

  return { success: false, message: '購入完了処理に失敗しました。' };
}

async function handleConsumeItem(discordId: string, itemName?: string): Promise<HandleResult> {
  if (!itemName) {
    return { success: false, message: '使い切った物の名前を指定してください。' };
  }

  const results = await apiClient.searchItems(discordId, itemName);

  if (results.length === 0) {
    return { success: false, message: `「${itemName}」が見つかりませんでした。` };
  }

  const item = results[0].item;
  const success = await apiClient.consumeItem(discordId, item.id);

  if (success) {
    return { success: true, message: `「${item.itemTypeName}」を消費済みにしました。` };
  }

  return { success: false, message: '消費済み処理に失敗しました。' };
}

async function handleGiveItem(
  discordId: string,
  itemName?: string,
  recipientName?: string
): Promise<HandleResult> {
  if (!itemName) {
    return { success: false, message: 'あげた物の名前を指定してください。' };
  }

  const results = await apiClient.searchItems(discordId, itemName);

  if (results.length === 0) {
    return { success: false, message: `「${itemName}」が見つかりませんでした。` };
  }

  const item = results[0].item;
  const success = await apiClient.giveItem(discordId, item.id, recipientName || '不明');

  if (success) {
    const to = recipientName ? `「${recipientName}」に` : '';
    return { success: true, message: `「${item.itemTypeName}」を${to}譲渡済みにしました。` };
  }

  return { success: false, message: '譲渡済み処理に失敗しました。' };
}

async function handleSellItem(
  discordId: string,
  itemName?: string,
  recipientName?: string,
  price?: number
): Promise<HandleResult> {
  if (!itemName) {
    return { success: false, message: '売った物の名前を指定してください。' };
  }

  const results = await apiClient.searchItems(discordId, itemName);

  if (results.length === 0) {
    return { success: false, message: `「${itemName}」が見つかりませんでした。` };
  }

  const item = results[0].item;
  const success = await apiClient.sellItem(discordId, item.id, recipientName, price);

  if (success) {
    let message = `「${item.itemTypeName}」を売却済みにしました。`;
    if (recipientName) message = `「${item.itemTypeName}」を「${recipientName}」に売却済みにしました。`;
    if (price !== undefined) message += ` (${price}円)`;
    return { success: true, message };
  }

  return { success: false, message: '売却済み処理に失敗しました。' };
}

async function handleListItems(discordId: string, itemName?: string): Promise<HandleResult> {
  // アイテム名が指定されていれば検索、なければ全一覧
  if (itemName) {
    const results = await apiClient.searchItems(discordId, itemName);

    if (results.length === 0) {
      return { success: true, message: `「${itemName}」に該当する持ち物はありません。` };
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`「${itemName}」の検索結果`)
      .setDescription(`${results.length} 件見つかりました`)
      .setTimestamp();

    const itemList = results
      .slice(0, 10)
      .map((r, i) => `${i + 1}. **${r.item.itemTypeName}**`)
      .join('\n');

    embed.addFields({ name: '持ち物', value: itemList });

    return { success: true, embed };
  }

  const items = await apiClient.getItems(discordId, 'owned');

  if (items.length === 0) {
    return { success: true, message: '持ち物がありません。' };
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('持ち物一覧')
    .setDescription(`全 ${items.length} 件`)
    .setTimestamp();

  const itemList = items
    .slice(0, 10)
    .map((item, i) => `${i + 1}. **${item.itemTypeName}**`)
    .join('\n');

  embed.addFields({ name: '持ち物', value: itemList });

  if (items.length > 10) {
    embed.setFooter({ text: `他 ${items.length - 10} 件` });
  }

  return { success: true, embed };
}

async function handleMoveItem(
  discordId: string,
  itemName?: string,
  boxName?: string
): Promise<HandleResult> {
  // 現時点ではアイテムの移動APIは未実装のため、メッセージのみ返す
  if (!itemName) {
    return { success: false, message: '移動する物の名前を指定してください。' };
  }

  if (!boxName) {
    return { success: false, message: '移動先の箱や場所を指定してください。' };
  }

  return {
    success: false,
    message: `「${itemName}」を「${boxName}」に移動する機能は現在開発中です。\nWebサイトから操作してください。`,
  };
}
