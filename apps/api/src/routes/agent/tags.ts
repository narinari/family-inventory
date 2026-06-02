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
  getTags,
  createTag,
  updateTag,
} from '../../services/tag.service.js';
import {
  createTagSchema,
  updateTagSchema,
} from '../../schemas/index.js';

const router: Router = Router();

// GET /tags    → 一覧
router.get(
   '/tags',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = await requireAgentUser(req, res);
    if (!actor) return;
    const tags = await getTags(actor.familyId);
    sendSuccess(res, { tags });
   }, 'タグの取得中にエラーが発生しました'),
);

// POST /tags → 新規作成
router.post(
   '/tags',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createTagSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
     }
    const actor = await requireAgentUser(req, res);
    if (!actor) return;
    const tag = await createTag(actor.familyId, parsed.data);
    sendCreated(res, { tag });
   }, 'タグの作成中にエラーが発生しました'),
);

// PUT /tags/:id → 更新
router.put(
   '/tags/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateTagSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
     }
    const actor = await requireAgentUser(req, res);
    if (!actor) return;
    const tag = await updateTag(actor.familyId, req.params.id, parsed.data);
    if (!tag) {
      sendNotFound(res, 'タグ', 'TAG_NOT_FOUND');
      return;
     }
    sendSuccess(res, { tag });
   }, 'タグの更新中にエラーが発生しました'),
);

export default router;
