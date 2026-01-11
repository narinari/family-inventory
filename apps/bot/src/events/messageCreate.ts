import { type Message } from 'discord.js';
import { parseNaturalLanguage, isNlpEnabled } from '../lib/nlp.js';
import { handleIntent } from '../lib/nlp-handlers.js';
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
