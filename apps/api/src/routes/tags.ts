import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { getTags, createTag, updateTag, deleteTag } from '../services/tag.service.js';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendValidationError,
  sendMessage,
  asyncHandler,
  requireUser,
} from '../utils/index.js';

const router: Router = Router();

const createTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().max(20).trim().optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: z.string().max(20).trim().optional(),
});

// GET / - タグ一覧取得
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const tags = await getTags(user.familyId);
    sendSuccess(res, { tags });
  }, 'タグの取得中にエラーが発生しました')
);

// POST / - タグ新規作成
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = createTagSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const tag = await createTag(user.familyId, parsed.data);
    sendCreated(res, { tag });
  }, 'タグの作成中にエラーが発生しました')
);

// PUT /:id - タグ更新
router.put(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = updateTagSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const tag = await updateTag(user.familyId, req.params.id, parsed.data);
    if (!tag) {
      sendNotFound(res, 'タグ', 'TAG_NOT_FOUND');
      return;
    }

    sendSuccess(res, { tag });
  }, 'タグの更新中にエラーが発生しました')
);

// DELETE /:id - タグ削除
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const deleted = await deleteTag(user.familyId, req.params.id);
    if (!deleted) {
      sendNotFound(res, 'タグ', 'TAG_NOT_FOUND');
      return;
    }

    sendMessage(res, 'タグを削除しました');
  }, 'タグの削除中にエラーが発生しました')
);

export default router;
