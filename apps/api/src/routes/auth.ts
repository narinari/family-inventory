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
} from '../services/auth.service.js';
import { ErrorCodes } from '@family-inventory/shared';

const router: Router = Router();

const joinSchema = z.object({
  inviteCode: z.string().min(1),
});

const createInviteSchema = z.object({
  expiresInDays: z.number().min(1).max(30).optional(),
});

router.post('/login', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const existingUser = await getUserByUid(authUser.uid);

    if (existingUser) {
      res.json({
        success: true,
        data: { user: existingUser, isNewUser: false, needsInviteCode: false },
      });
      return;
    }

    // New users always need an invite code
    res.json({
      success: true,
      data: { user: null, isNewUser: true, needsInviteCode: true },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'ログイン処理中にエラーが発生しました' },
    });
  }
});

router.post('/join', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;

    const existingUser = await getUserByUid(authUser.uid);
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.USER_ALREADY_EXISTS, message: '既に登録済みです' },
      });
      return;
    }

    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: '招待コードを入力してください', details: parsed.error.errors },
      });
      return;
    }

    const { inviteCode } = parsed.data;
    const validation = await validateInviteCode(inviteCode);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.INVITE_CODE_INVALID, message: validation.error },
      });
      return;
    }

    const user = await createUser(authUser, validation.familyId!, false);
    await useInviteCode(validation.inviteCodeId!, authUser.uid);

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Join error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '参加処理中にエラーが発生しました' },
    });
  }
});

router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'ユーザー情報の取得中にエラーが発生しました' },
    });
  }
});

router.get('/members', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    const members = await getFamilyMembers(user.familyId);
    res.json({ success: true, data: { members } });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'メンバー一覧の取得中にエラーが発生しました' },
    });
  }
});

router.post('/invite', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: ErrorCodes.NOT_ADMIN, message: '招待コードの発行は管理者のみ可能です' },
      });
      return;
    }

    const parsed = createInviteSchema.safeParse(req.body);
    const expiresInDays = parsed.success ? parsed.data.expiresInDays : 7;

    const inviteCode = await createInviteCode(user.familyId, user.id, expiresInDays);
    res.json({ success: true, data: { inviteCode } });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '招待コードの発行中にエラーが発生しました' },
    });
  }
});

router.get('/invites', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: ErrorCodes.NOT_ADMIN, message: '招待コード一覧の取得は管理者のみ可能です' },
      });
      return;
    }

    const inviteCodes = await getFamilyInviteCodes(user.familyId);
    res.json({ success: true, data: { inviteCodes } });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '招待コード一覧の取得中にエラーが発生しました' },
    });
  }
});

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

router.get('/discord', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isDiscordConfigured()) {
      res.status(503).json({
        success: false,
        error: { code: ErrorCodes.DISCORD_NOT_CONFIGURED, message: 'Discord連携が設定されていません' },
      });
      return;
    }

    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    if (user.discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.DISCORD_ALREADY_LINKED, message: '既にDiscordと連携済みです' },
      });
      return;
    }

    const state = authUser.uid;
    const scope = 'identify';
    const authUrl = new URL('https://discord.com/api/oauth2/authorize');
    authUrl.searchParams.set('client_id', DISCORD_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    res.json({ success: true, data: { authUrl: authUrl.toString() } });
  } catch (error) {
    console.error('Discord auth URL error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Discord認証URLの生成中にエラーが発生しました' },
    });
  }
});

router.post('/discord/callback', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isDiscordConfigured()) {
      res.status(503).json({
        success: false,
        error: { code: ErrorCodes.DISCORD_NOT_CONFIGURED, message: 'Discord連携が設定されていません' },
      });
      return;
    }

    const parsed = discordCallbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: '認可コードが必要です', details: parsed.error.errors },
      });
      return;
    }

    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    if (user.discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.DISCORD_ALREADY_LINKED, message: '既にDiscordと連携済みです' },
      });
      return;
    }

    const { code } = parsed.data;

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.DISCORD_OAUTH_FAILED, message: 'Discord認証に失敗しました' },
      });
      return;
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Discord user fetch failed:', errorText);
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.DISCORD_OAUTH_FAILED, message: 'Discordユーザー情報の取得に失敗しました' },
      });
      return;
    }

    const discordUser = (await userResponse.json()) as { id: string; username: string };

    const existingUser = await getUserByDiscordId(discordUser.id);
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.DISCORD_ALREADY_LINKED, message: 'このDiscordアカウントは既に他のユーザーと連携されています' },
      });
      return;
    }

    await updateUserDiscordId(authUser.uid, discordUser.id);

    res.json({
      success: true,
      data: {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
      },
    });
  } catch (error) {
    console.error('Discord callback error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Discord連携処理中にエラーが発生しました' },
    });
  }
});

router.delete('/discord', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    if (!user.discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.DISCORD_NOT_LINKED, message: 'Discordと連携されていません' },
      });
      return;
    }

    await removeUserDiscordId(authUser.uid);

    res.json({ success: true, data: { message: 'Discord連携を解除しました' } });
  } catch (error) {
    console.error('Discord unlink error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Discord連携解除中にエラーが発生しました' },
    });
  }
});

// ============================================
// Bot専用エンドポイント（API Key認証）
// ============================================

router.get('/discord/user/:discordId', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const { discordId } = req.params;

    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Discord IDが必要です' },
      });
      return;
    }

    const user = await getUserByDiscordId(discordId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Get user by Discord ID error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'ユーザー情報の取得中にエラーが発生しました' },
    });
  }
});

export default router;
