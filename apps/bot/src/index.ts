import {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  Partials,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from 'discord.js';
import { createServer } from 'node:http';
import { commands } from './commands/index.js';
import * as messageCreateEvent from './events/messageCreate.js';
import * as messageReactionAddEvent from './events/messageReactionAdd.js';
import { apiClient } from './lib/api-client.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 8080;

if (!BOT_TOKEN) {
  console.error('Error: BOT_TOKEN environment variable is required');
  process.exit(1);
}

// Command collection type
interface Command {
  data: { name: string };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction],
});

// Register commands
const commandCollection = new Collection<string, Command>();
for (const command of commands) {
  commandCollection.set(command.data.name, command);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot is ready! Logged in as ${readyClient.user.tag}`);
  console.log(`Registered ${commandCollection.size} commands`);
  console.log(`NLP enabled: ${process.env.GEMINI_API_KEY ? 'yes' : 'no'}`);
});

// Message create event for natural language processing
client.on(Events.MessageCreate, messageCreateEvent.execute);

// Message reaction add event for NLP trigger with robot emoji
client.on(Events.MessageReactionAdd, messageReactionAddEvent.execute);

client.on(Events.InteractionCreate, async (interaction) => {
  // ボタンインタラクションの処理
  if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commandCollection.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);

    const errorMessage = '❌ コマンドの実行中にエラーが発生しました。';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const [action, entityType, entityId] = interaction.customId.split(':');

  await interaction.deferReply({ ephemeral: true });

  try {
    if (entityType === 'item') {
      switch (action) {
        case 'consume': {
          const consumeSuccess = await apiClient.consumeItem(interaction.user.id, entityId);
          if (consumeSuccess) {
            await interaction.editReply({ content: '持ち物を消費済みにしました。' });
          } else {
            await interaction.editReply({ content: '消費処理に失敗しました。' });
          }
          break;
        }
        case 'give':
          await interaction.editReply({
            content: `譲渡先を指定してコマンドを実行してください:\n\`/item give id:${entityId.slice(0, 8)} to:〇〇\``,
          });
          break;
        case 'sell': {
          const sellSuccess = await apiClient.sellItem(interaction.user.id, entityId);
          if (sellSuccess) {
            await interaction.editReply({ content: '持ち物を売却済みにしました。' });
          } else {
            await interaction.editReply({ content: '売却処理に失敗しました。' });
          }
          break;
        }
        default:
          await interaction.editReply({ content: '不明な操作です。' });
      }
    } else if (entityType === 'wishlist') {
      switch (action) {
        case 'purchase': {
          const result = await apiClient.purchaseWishlistItem(interaction.user.id, entityId);
          if (result) {
            await interaction.editReply({
              content: `「${result.wishlist.name}」を購入完了にしました。\n持ち物にも登録されました。`,
            });
          } else {
            await interaction.editReply({ content: '購入完了処理に失敗しました。' });
          }
          break;
        }
        case 'cancel': {
          const cancelSuccess = await apiClient.cancelWishlistItem(interaction.user.id, entityId);
          if (cancelSuccess) {
            await interaction.editReply({ content: '購入を見送りにしました。' });
          } else {
            await interaction.editReply({ content: '見送り処理に失敗しました。' });
          }
          break;
        }
        default:
          await interaction.editReply({ content: '不明な操作です。' });
      }
    } else {
      await interaction.editReply({ content: '不明なエンティティタイプです。' });
    }
  } catch (error) {
    console.error('Button interaction error:', error);
    await interaction.editReply({ content: '処理中にエラーが発生しました。' });
  }
}

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
