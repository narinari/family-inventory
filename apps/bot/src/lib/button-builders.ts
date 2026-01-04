import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:3000';

export function createItemActionRow(itemId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`consume:item:${itemId}`)
      .setLabel('消費')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`give:item:${itemId}`)
      .setLabel('譲渡')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`sell:item:${itemId}`)
      .setLabel('売却')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setLabel('Webで見る')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_BASE_URL}/items/detail?id=${itemId}`)
  );
}

export function createWishlistActionRow(wishlistId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`purchase:wishlist:${wishlistId}`)
      .setLabel('購入完了')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`cancel:wishlist:${wishlistId}`)
      .setLabel('見送り')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setLabel('Webで見る')
      .setStyle(ButtonStyle.Link)
      .setURL(`${WEB_BASE_URL}/wishlist/detail?id=${wishlistId}`)
  );
}
