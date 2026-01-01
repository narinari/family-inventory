import { Client, GatewayIntentBits, Events, type Message } from 'discord.js';
import { createServer } from 'node:http';
import { apiClient } from './lib/api-client.js';
import type { User } from '@family-inventory/shared';

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 8080;

if (!BOT_TOKEN) {
  console.error('Error: BOT_TOKEN environment variable is required');
  process.exit(1);
}

async function getLinkedUser(discordId: string): Promise<User | null> {
  try {
    return await apiClient.getUserByDiscordId(discordId);
  } catch (error) {
    console.error('Failed to get user by Discord ID:', error);
    return null;
  }
}

async function handleAuthenticatedMessage(
  message: Message,
  user: User
): Promise<void> {
  // 認証済みユーザー向けのコマンド処理
  if (message.content.startsWith('!whoami')) {
    await message.reply(`認証済み: ${user.displayName} (${user.email})`);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot is ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // 基本的なコマンド（認証不要）
  if (message.content.startsWith('!ping')) {
    await message.reply('Pong!');
    return;
  }

  // ユーザー特定が必要なコマンド
  if (message.content.startsWith('!whoami') || message.content.startsWith('!help')) {
    const user = await getLinkedUser(message.author.id);

    if (!user) {
      await message.reply(
        'Discord連携がされていません。\nWebサイトの設定画面からDiscord連携を行ってください。'
      );
      return;
    }

    await handleAuthenticatedMessage(message, user);
  }
});

client.login(BOT_TOKEN).catch((error) => {
  console.error('Failed to login:', error);
  process.exit(1);
});

// Health check server for Cloud Run
const server = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bot: client.isReady() ? 'connected' : 'connecting' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close();
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
