import { EmbedBuilder } from 'discord.js';
import { type ParsedIntent } from './nlp.js';
import { apiClient } from './api-client.js';

// Embed colors
const COLOR_SUCCESS = 0x00ff00;
const COLOR_INFO = 0x5865f2;

export interface HandleResult {
  success: boolean;
  message?: string;
  embed?: EmbedBuilder;
}

export async function handleIntent(
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

    case 'help':
      return handleHelp();

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
    .setColor(COLOR_INFO)
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
      .setColor(COLOR_SUCCESS)
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
      .setColor(COLOR_SUCCESS)
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
      .setColor(COLOR_SUCCESS)
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

  if (!success) {
    return { success: false, message: '売却済み処理に失敗しました。' };
  }

  const to = recipientName ? `「${recipientName}」に` : '';
  const priceText = price !== undefined ? ` (${price}円)` : '';
  return { success: true, message: `「${item.itemTypeName}」を${to}売却済みにしました。${priceText}` };
}

async function handleListItems(discordId: string, itemName?: string): Promise<HandleResult> {
  // アイテム名が指定されていれば検索、なければ全一覧
  if (itemName) {
    const results = await apiClient.searchItems(discordId, itemName);

    if (results.length === 0) {
      return { success: true, message: `「${itemName}」に該当する持ち物はありません。` };
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR_INFO)
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
    .setColor(COLOR_INFO)
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
  _discordId: string,
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

function handleHelp(): HandleResult {
  const embed = new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle('ヘルプ - 使い方ガイド')
    .setDescription('私に話しかけてくれれば、以下のことができます。')
    .addFields(
      {
        name: '🔍 物の場所を聞く',
        value: '「○○どこ？」「○○どこにある？」',
      },
      {
        name: '📦 持ち物を登録',
        value: '「○○買った」「○○もらった」「○○ゲットした」',
      },
      {
        name: '🛒 欲しい物を追加',
        value: '「○○欲しい」「○○買いたい」',
      },
      {
        name: '📬 届いた物を記録',
        value: '「○○届いた」「○○来た」',
      },
      {
        name: '✅ 使い切った記録',
        value: '「○○使い切った」「○○なくなった」「○○食べた」',
      },
      {
        name: '🎁 あげた記録',
        value: '「○○あげた」「○○を△△にあげた」',
      },
      {
        name: '💰 売った記録',
        value: '「○○売った」「○○を○円で売った」',
      },
      {
        name: '📋 一覧表示',
        value: '「持ち物一覧」「○○リスト」',
      },
      {
        name: '💡 ヒント',
        value: 'スラッシュコマンド `/help` で詳細なコマンド一覧も見れます。',
      }
    )
    .setFooter({ text: 'Family Inventory Bot' })
    .setTimestamp();

  return { success: true, embed };
}
