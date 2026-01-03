import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { apiClient } from '../lib/api-client.js';

export const data = new SlashCommandBuilder()
  .setName('place')
  .setDescription('保管場所を管理します')
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('保管場所一覧を表示します')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('boxes')
      .setDescription('保管場所にある箱を表示します')
      .addStringOption((option) =>
        option.setName('id').setDescription('保管場所ID').setRequired(true)
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
    case 'list':
      await handleList(interaction);
      break;
    case 'boxes':
      await handleBoxes(interaction);
      break;
    default:
      await interaction.editReply({ content: '不明なサブコマンドです。' });
  }
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const locations = await apiClient.getLocations(interaction.user.id);

    if (locations.length === 0) {
      await interaction.editReply({ content: '登録されている保管場所はありません。' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('保管場所一覧')
      .setDescription(`全 ${locations.length} 件`)
      .setTimestamp();

    const displayLocations = locations.slice(0, 15);
    const locationList = displayLocations
      .map((location, index) => {
        const address = location.address ? ` (${location.address})` : '';
        return `${index + 1}. **${location.name}**${address} (ID: \`${location.id.slice(0, 8)}\`)`;
      })
      .join('\n');

    embed.addFields({ name: '保管場所', value: locationList });

    if (locations.length > 15) {
      embed.setFooter({ text: `他 ${locations.length - 15} 件` });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to list locations:', error);
    await interaction.editReply({ content: '保管場所一覧の取得中にエラーが発生しました。' });
  }
}

async function handleBoxes(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getString('id', true);

  try {
    // まず保管場所一覧を取得してIDをマッチ
    const locations = await apiClient.getLocations(interaction.user.id);
    const matchedLocation = locations.find((l) => l.id === id || l.id.startsWith(id));

    if (!matchedLocation) {
      await interaction.editReply({ content: '保管場所が見つかりませんでした。' });
      return;
    }

    const result = await apiClient.getLocationBoxes(interaction.user.id, matchedLocation.id);

    if (!result) {
      await interaction.editReply({ content: '保管場所の箱を取得できませんでした。' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${result.location.name} の箱`)
      .setTimestamp();

    if (result.location.address) {
      embed.setDescription(result.location.address);
    }

    if (result.boxes.length === 0) {
      embed.addFields({ name: '箱', value: 'この場所に箱はありません。' });
    } else {
      const displayBoxes = result.boxes.slice(0, 15);
      const boxList = displayBoxes
        .map((box, index) => `${index + 1}. **${box.name}** (ID: \`${box.id.slice(0, 8)}\`)`)
        .join('\n');

      embed.addFields({ name: `箱 (${result.boxes.length}件)`, value: boxList });

      if (result.boxes.length > 15) {
        embed.setFooter({ text: `他 ${result.boxes.length - 15} 件` });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to get location boxes:', error);
    await interaction.editReply({ content: '保管場所の箱取得中にエラーが発生しました。' });
  }
}
