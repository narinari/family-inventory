import { z } from 'zod';

/**
 * 認証関連スキーマ
 */

export const joinSchema = z.object({
  inviteCode: z.string().min(1),
});

export const createInviteSchema = z.object({
  expiresInDays: z.number().min(1).max(30).optional(),
});

export const updateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(50).trim().optional(),
    photoURL: z.string().url().nullable().optional(),
  })
  .refine((data) => data.displayName !== undefined || data.photoURL !== undefined, {
    message: '更新するフィールドが必要です',
  });

export const discordCallbackSchema = z.object({
  code: z.string().min(1),
});
