import { Router, type Request, type Response } from 'express';
import { requireAgentUser } from './helpers.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendValidationError,
} from '../../utils/response.js';
import {
  getItemTypes,
  createItemType,
  updateItemType,
} from '../../services/item-type.service.js';
import {
  createItemTypeSchema,
  updateItemTypeSchema,
} from '../../schemas/index.js';

const router: Router = Router();

// GET /item-types    → 一覧
router.get(
   '/item-types',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = await requireAgentUser(req, res);
    if (!actor) return;
    const itemTypes = await getItemTypes(actor.familyId);
    sendSuccess(res, { itemTypes });
   }, 'アイテム種別の取得中にエラーが発生しました'),
);

// POST /item-types → 新規作成
router.post(
   '/item-types',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createItemTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
     }
    const actor = await requireAgentUser(req, res);
    if (!actor) return;
    const itemType = await createItemType(actor.familyId, parsed.data);
    sendCreated(res, { itemType });
   }, 'アイテム種別の作成中にエラーが発生しました'),
);

// PUT /item-types/:id → 更新
router.put(
   '/item-types/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateItemTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
     }
    const actor = await requireAgentUser(req, res);
    if (!actor) return;
    const itemType = await updateItemType(actor.familyId, req.params.id, parsed.data);
    if (!itemType) {
      sendNotFound(res, 'アイテム種別', 'ITEM_TYPE_NOT_FOUND');
      return;
     }
    sendSuccess(res, { itemType });
   }, 'アイテム種別の更新中にエラーが発生しました'),
);

export default router;
