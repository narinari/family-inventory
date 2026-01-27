import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getItemTypes,
  getItemTypeById,
  createItemType,
  updateItemType,
  deleteItemType,
  isItemTypeInUse,
} from '../services/item-type.service.js';
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
import { createItemTypeSchema, updateItemTypeSchema } from '../schemas/index.js';

const router: Router = Router();

// GET / - アイテム種別一覧取得
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const itemTypes = await getItemTypes(user.familyId);
    sendSuccess(res, { itemTypes });
  }, 'アイテム種別の取得中にエラーが発生しました')
);

// GET /:id - アイテム種別詳細取得
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const itemType = await getItemTypeById(user.familyId, req.params.id);
    if (!itemType) {
      sendNotFound(res, 'アイテム種別', 'ITEM_TYPE_NOT_FOUND');
      return;
    }

    sendSuccess(res, { itemType });
  }, 'アイテム種別の取得中にエラーが発生しました')
);

// POST / - アイテム種別新規作成
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = createItemTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const itemType = await createItemType(user.familyId, parsed.data);
    sendCreated(res, { itemType });
  }, 'アイテム種別の作成中にエラーが発生しました')
);

// PUT /:id - アイテム種別更新
router.put(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = updateItemTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const itemType = await updateItemType(user.familyId, req.params.id, parsed.data);
    if (!itemType) {
      sendNotFound(res, 'アイテム種別', 'ITEM_TYPE_NOT_FOUND');
      return;
    }

    sendSuccess(res, { itemType });
  }, 'アイテム種別の更新中にエラーが発生しました')
);

// DELETE /:id - アイテム種別削除
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const inUse = await isItemTypeInUse(user.familyId, req.params.id);
    if (inUse) {
      sendError(res, 'ITEM_TYPE_IN_USE', 'このアイテム種別は使用中のため削除できません', 400);
      return;
    }

    const deleted = await deleteItemType(user.familyId, req.params.id);
    if (!deleted) {
      sendNotFound(res, 'アイテム種別', 'ITEM_TYPE_NOT_FOUND');
      return;
    }

    sendMessage(res, 'アイテム種別を削除しました');
  }, 'アイテム種別の削除中にエラーが発生しました')
);

export default router;
