import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken, authenticateBotApiKey } from '../middleware/auth.js';
import {
  getUserByUid,
  createInviteCode,
  validateInviteCode,
  useInviteCode,
  getFamilyMembers,
  getFamilyInviteCodes,
  createUser,
  updateUserDiscordId,
  removeUserDiscordId,
  getUserByDiscordId,
  updateUserProfile,
} from '../services/auth.service.js';
import { ErrorCodes } from '@family-inventory/shared';
import { asyncHandler } from '../utils/async-handler.js';
import { requireUser, requireAdmin } from '../utils/auth-helpers.js';
import { sendSuccess, sendError, sendNotFound, sendValidationError, sendMessage } from '../utils/response.js';

const router: Router = Router();

const joinSchema = z.object({
  inviteCode: z.string().min(1),
});

const createInviteSchema = z.object({
  expiresInDays: z.number().min(1).max(30).optional(),
});

const updateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(50).trim().optional(),
    photoURL: z.string().url().nullable().optional(),
  })
  .refine((data) => data.displayName !== undefined || data.photoURL !== undefined, {
    message: '更新するフィールドが必要です',
  });

router.post(
  '/login',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const authUser = req.authUser!;
    const existingUser = await getUserByUid(authUser.uid);

    if (existingUser) {
      sendSuccess(res, { user: existingUser, isNewUser: false, needsInviteCode: false });
      return;
    }

    // New users always need an invite code
    sendSuccess(res, { user: null, isNewUser: true, needsInviteCode: true });
  }, 'ログイン処理中にエラーが発生しました')
);

router.post(
  '/join',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const authUser = req.authUser!;

    const existingUser = await getUserByUid(authUser.uid);
    if (existingUser) {
      sendError(res, ErrorCodes.USER_ALREADY_EXISTS, '既に登録済みです', 400);
      return;
    }

    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, ErrorCodes.VALIDATION_ERROR, '招待コードを入力してください', 400, parsed.error.errors);
      return;
    }

    const { inviteCode } = parsed.data;
    const validation = await validateInviteCode(inviteCode);

    if (!validation.valid) {
      sendError(res, ErrorCodes.INVITE_CODE_INVALID, validation.error!, 400);
      return;
    }

    const user = await createUser(authUser, validation.familyId!, false);
    await useInviteCode(validation.inviteCodeId!, authUser.uid);

    sendSuccess(res, { user });
  }, '参加処理中にエラーが発生しました')
);

router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    sendSuccess(res, { user });
  }, 'ユーザー情報の取得中にエラーが発生しました')
);

router.put(
  '/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const authUser = req.authUser!;
    const updatedUser = await updateUserProfile(authUser.uid, parsed.data);
    sendSuccess(res, { user: updatedUser });
  }, 'プロフィール更新中にエラーが発生しました')
);

router.get(
  '/members',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const members = await getFamilyMembers(user.familyId);
    sendSuccess(res, { members });
  }, 'メンバー一覧の取得中にエラーが発生しました')
);

router.post(
  '/invite',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    if (!requireAdmin(user, res)) return;

    const parsed = createInviteSchema.safeParse(req.body);
    const expiresInDays = parsed.success ? parsed.data.expiresInDays : 7;

    const inviteCode = await createInviteCode(user.familyId, user.id, expiresInDays);
    sendSuccess(res, { inviteCode });
  }, '招待コードの発行中にエラーが発生しました')
);

router.get(
  '/invites',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    if (!requireAdmin(user, res)) return;

    const inviteCodes = await getFamilyInviteCodes(user.familyId);
    sendSuccess(res, { inviteCodes });
  }, '招待コード一覧の取得中にエラーが発生しました')
);

// ============================================
// Discord OAuth2 連携エンドポイント
// ============================================

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

const discordCallbackSchema = z.object({
  code: z.string().min(1),
});

function isDiscordConfigured(): boolean {
  return !!(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && DISCORD_REDIRECT_URI);
}

router.get(
  '/discord',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    if (!isDiscordConfigured()) {
      sendError(res, ErrorCodes.DISCORD_NOT_CONFIGURED, 'Discord連携が設定されていません', 503);
      return;
    }

    const user = await requireUser(req, res);
    if (!user) return;

    if (user.discordId) {
      sendError(res, ErrorCodes.DISCORD_ALREADY_LINKED, '既にDiscordと連携済みです', 400);
      return;
    }

    const authUser = req.authUser!;
    const state = authUser.uid;
    const scope = 'identify';
    const authUrl = new URL('https://discord.com/api/oauth2/authorize');
    authUrl.searchParams.set('client_id', DISCORD_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    sendSuccess(res, { authUrl: authUrl.toString() });
  }, 'Discord認証URLの生成中にエラーが発生しました')
);

router.post(
  '/discord/callback',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    if (!isDiscordConfigured()) {
      sendError(res, ErrorCodes.DISCORD_NOT_CONFIGURED, 'Discord連携が設定されていません', 503);
      return;
    }

    const parsed = discordCallbackSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, ErrorCodes.VALIDATION_ERROR, '認可コードが必要です', 400, parsed.error.errors);
      return;
    }

    const user = await requireUser(req, res);
    if (!user) return;

    if (user.discordId) {
      sendError(res, ErrorCodes.DISCORD_ALREADY_LINKED, '既にDiscordと連携済みです', 400);
      return;
    }

    const { code } = parsed.data;

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID!,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Discord token exchange failed:', errorText);
      sendError(res, ErrorCodes.DISCORD_OAUTH_FAILED, 'Discord認証に失敗しました', 400);
      return;
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Discord user fetch failed:', errorText);
      sendError(res, ErrorCodes.DISCORD_OAUTH_FAILED, 'Discordユーザー情報の取得に失敗しました', 400);
      return;
    }

    const discordUser = (await userResponse.json()) as { id: string; username: string };

    const existingUser = await getUserByDiscordId(discordUser.id);
    if (existingUser) {
      sendError(res, ErrorCodes.DISCORD_ALREADY_LINKED, 'このDiscordアカウントは既に他のユーザーと連携されています', 400);
      return;
    }

    const authUser = req.authUser!;
    await updateUserDiscordId(authUser.uid, discordUser.id);

    sendSuccess(res, { discordId: discordUser.id, discordUsername: discordUser.username });
  }, 'Discord連携処理中にエラーが発生しました')
);

router.delete(
  '/discord',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    if (!user.discordId) {
      sendError(res, ErrorCodes.DISCORD_NOT_LINKED, 'Discordと連携されていません', 400);
      return;
    }

    const authUser = req.authUser!;
    await removeUserDiscordId(authUser.uid);

    sendMessage(res, 'Discord連携を解除しました');
  }, 'Discord連携解除中にエラーが発生しました')
);

// ============================================
// Bot専用エンドポイント（API Key認証）
// ============================================

router.get(
  '/discord/user/:discordId',
  authenticateBotApiKey,
  asyncHandler(async (req: Request, res: Response) => {
    const { discordId } = req.params;

    if (!discordId) {
      sendError(res, ErrorCodes.VALIDATION_ERROR, 'Discord IDが必要です', 400);
      return;
    }

    const user = await getUserByDiscordId(discordId);

    if (!user) {
      sendNotFound(res, 'ユーザー', ErrorCodes.USER_NOT_FOUND);
      return;
    }

    sendSuccess(res, { user });
  }, 'ユーザー情報の取得中にエラーが発生しました')
);

export default router;
