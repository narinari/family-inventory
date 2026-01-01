import { REST, Routes } from 'discord.js';
import { commands } from '../commands/index.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN) {
  console.error('Error: BOT_TOKEN environment variable is required');
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error('Error: DISCORD_CLIENT_ID environment variable is required');
  process.exit(1);
}

const commandData = commands.map((cmd) => cmd.data.toJSON());

const rest = new REST().setToken(BOT_TOKEN);

async function deployCommands() {
  try {
    console.log(`Started refreshing ${commandData.length} application (/) commands.`);

    let data: unknown[];

    if (GUILD_ID) {
      // Guild-specific commands (instant update, good for development)
      data = (await rest.put(Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID), {
        body: commandData,
      })) as unknown[];
      console.log(`Successfully registered ${data.length} guild commands for guild ${GUILD_ID}.`);
    } else {
      // Global commands (may take up to 1 hour to update)
      data = (await rest.put(Routes.applicationCommands(CLIENT_ID!), {
        body: commandData,
      })) as unknown[];
      console.log(`Successfully registered ${data.length} global commands.`);
    }
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    process.exit(1);
  }
}

deployCommands();
