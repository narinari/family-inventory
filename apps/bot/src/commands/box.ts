import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { apiClient } from '../lib/api-client.js';

export const data = new SlashCommandBuilder()
  .setName('box')
  .setDescription('箱を管理します')
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('箱一覧を表示します')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('contents')
      .setDescription('箱の中身を表示します')
      .addStringOption((option) =>
        option.setName('id').setDescription('箱ID').setRequired(true)
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
    case 'contents':
      await handleContents(interaction);
      break;
    default:
      await interaction.editReply({ content: '不明なサブコマンドです。' });
  }
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const boxes = await apiClient.getBoxes(interaction.user.id);

    if (boxes.length === 0) {
      await interaction.editReply({ content: '登録されている箱はありません。' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('箱一覧')
      .setDescription(`全 ${boxes.length} 件`)
      .setTimestamp();

    const displayBoxes = boxes.slice(0, 15);
    const boxList = displayBoxes
      .map((box, index) => {
        const location = box.locationName ? ` @ ${box.locationName}` : '';
        return `${index + 1}. **${box.name}**${location} (ID: \`${box.id.slice(0, 8)}\`)`;
      })
      .join('\n');

    embed.addFields({ name: '箱', value: boxList });

    if (boxes.length > 15) {
      embed.setFooter({ text: `他 ${boxes.length - 15} 件` });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to list boxes:', error);
    await interaction.editReply({ content: '箱一覧の取得中にエラーが発生しました。' });
  }
}

async function handleContents(interaction: ChatInputCommandInteraction): Promise<void> {
  const id = interaction.options.getString('id', true);

  try {
    // まず箱一覧を取得してIDをマッチ
    const boxes = await apiClient.getBoxes(interaction.user.id);
    const matchedBox = boxes.find((b) => b.id === id || b.id.startsWith(id));

    if (!matchedBox) {
      await interaction.editReply({ content: '箱が見つかりませんでした。' });
      return;
    }

    const result = await apiClient.getBoxItems(interaction.user.id, matchedBox.id);

    if (!result) {
      await interaction.editReply({ content: '箱の中身を取得できませんでした。' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${result.box.name} の中身`)
      .setTimestamp();

    if (result.items.length === 0) {
      embed.setDescription('この箱は空です。');
    } else {
      embed.setDescription(`${result.items.length} 件のアイテム`);

      const displayItems = result.items.slice(0, 15);
      const itemList = displayItems
        .map((item, index) => `${index + 1}. **${item.itemTypeName}**`)
        .join('\n');

      embed.addFields({ name: 'アイテム', value: itemList });

      if (result.items.length > 15) {
        embed.setFooter({ text: `他 ${result.items.length - 15} 件` });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to get box contents:', error);
    await interaction.editReply({ content: '箱の中身取得中にエラーが発生しました。' });
  }
}
