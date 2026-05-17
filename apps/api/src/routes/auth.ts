import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserByUid,
  createInviteCode,
  validateInviteCode,
  useInviteCode,
  getFamilyMembers,
  getFamilyInviteCodes,
  createUser,
  updateUserProfile,
} from '../services/auth.service.js';
import { ErrorCodes } from '@family-inventory/shared';
import { asyncHandler } from '../utils/async-handler.js';
import { requireUser, requireAdmin } from '../utils/auth-helpers.js';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.js';
import {
  joinSchema,
  createInviteSchema,
  updateProfileSchema,
} from '../schemas/index.js';

const router: Router = Router();

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

export default router;
