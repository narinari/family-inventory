import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserByUid,
  createInviteCode,
  validateInviteCode,
  useInviteCode,
  getFamilyMembers,
  getFamilyInviteCodes,
  createUser,
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

export default router;
