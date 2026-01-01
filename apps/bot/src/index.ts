import { Client, Collection, GatewayIntentBits, Events, type ChatInputCommandInteraction } from 'discord.js';
import { createServer } from 'node:http';
import { commands } from './commands/index.js';

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
  intents: [GatewayIntentBits.Guilds],
});

// Register commands
const commandCollection = new Collection<string, Command>();
for (const command of commands) {
  commandCollection.set(command.data.name, command);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot is ready! Logged in as ${readyClient.user.tag}`);
  console.log(`Registered ${commandCollection.size} commands`);
});

client.on(Events.InteractionCreate, async (interaction) => {
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
