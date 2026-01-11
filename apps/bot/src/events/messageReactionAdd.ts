import {
  type Message,
  type MessageReaction,
  type User,
  type PartialMessageReaction,
  type PartialUser,
} from 'discord.js';
import { parseNaturalLanguage, isNlpEnabled } from '../lib/nlp.js';
import { handleIntent } from '../lib/nlp-handlers.js';
import { apiClient } from '../lib/api-client.js';

export const name = 'messageReactionAdd';

async function removeThinkingReaction(message: Message): Promise<void> {
  const thinkingReaction = message.reactions.cache.get('🤔');
  if (thinkingReaction) {
    await thinkingReaction.users.remove(message.client.user?.id);
  }
}

export async function execute(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  // Botによるリアクションは無視
  if (user.bot) return;

  // 🤖絵文字のみ処理
  if (reaction.emoji.name !== '🤖') return;

  // NLPが有効でない場合は何もしない
  if (!isNlpEnabled()) return;

  // 部分リアクションをフェッチ
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  // メッセージ取得（キャッシュにない場合はフェッチ）
  const message = reaction.message.partial
    ? await reaction.message.fetch()
    : reaction.message;

  // Bot自身のメッセージは無視
  if (message.author.bot) return;

  const content = message.content.trim();
  if (!content) return;

  // メッセージ作成者のDiscord連携確認
  const msgUser = await apiClient.getUserByDiscordId(message.author.id);
  if (!msgUser) {
    await message.reply(
      'このメッセージの作成者はDiscord連携がされていません。\nWebサイトの設定画面からDiscord連携を行ってください。'
    );
    return;
  }

  // 処理中リアクション
  await message.react('🤔');

  try {
    const parsed = await parseNaturalLanguage(content);
    const response = await handleIntent(message.author.id, parsed, content);

    await removeThinkingReaction(message);

    if (response.embed) {
      await message.reply({ embeds: [response.embed] });
    } else if (response.message) {
      await message.reply(response.message);
    }
  } catch (error) {
    console.error('Reaction NLP error:', error);
    await removeThinkingReaction(message);
    await message.reply('処理中にエラーが発生しました。');
  }
}
