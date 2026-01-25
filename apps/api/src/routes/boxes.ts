import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import {
  getBoxes,
  getBoxById,
  createBox,
  updateBox,
  deleteBox,
  isBoxInUse,
  getBoxItems,
} from '../services/box.service.js';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendValidationError,
  sendMessage,
  asyncHandler,
  requireUser,
} from '../utils/index.js';

const router: Router = Router();

const createBoxSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  locationId: z.string().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});

const updateBoxSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  locationId: z.string().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});

// GET / - 箱一覧取得
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const boxes = await getBoxes(user.familyId);
    sendSuccess(res, { boxes });
  }, '箱の取得中にエラーが発生しました')
);

// POST / - 箱新規作成
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = createBoxSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const box = await createBox(user.familyId, parsed.data);
    sendCreated(res, { box });
  }, '箱の作成中にエラーが発生しました')
);

// PUT /:id - 箱更新
router.put(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = updateBoxSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const box = await updateBox(user.familyId, req.params.id, parsed.data);
    if (!box) {
      sendNotFound(res, '箱', 'BOX_NOT_FOUND');
      return;
    }

    sendSuccess(res, { box });
  }, '箱の更新中にエラーが発生しました')
);

// DELETE /:id - 箱削除
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const inUse = await isBoxInUse(user.familyId, req.params.id);
    if (inUse) {
      sendError(res, 'BOX_IN_USE', 'この箱にはアイテムが格納されているため削除できません', 400);
      return;
    }

    const deleted = await deleteBox(user.familyId, req.params.id);
    if (!deleted) {
      sendNotFound(res, '箱', 'BOX_NOT_FOUND');
      return;
    }

    sendMessage(res, '箱を削除しました');
  }, '箱の削除中にエラーが発生しました')
);

// GET /:id/items - 箱の中身一覧取得
router.get(
  '/:id/items',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const box = await getBoxById(user.familyId, req.params.id);
    if (!box) {
      sendNotFound(res, '箱', 'BOX_NOT_FOUND');
      return;
    }

    const items = await getBoxItems(user.familyId, req.params.id);
    sendSuccess(res, { box, items });
  }, '箱の中身取得中にエラーが発生しました')
);

export default router;
