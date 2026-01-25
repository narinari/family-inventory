import { Router, type Request, type Response } from 'express';
import { requireDiscordUserFromQuery } from './helpers.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { getItems, getItemLocation } from '../../services/item.service.js';
import { getItemTypes } from '../../services/item-type.service.js';

const router: Router = Router();

// ============================================
// Search API（アイテム名で検索）
// ============================================

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query) {
      sendError(res, 'VALIDATION_ERROR', '検索キーワード(q)が必要です', 400);
      return;
    }

    const user = await requireDiscordUserFromQuery(req, res);
    if (!user) return;

    // アイテム種別で検索
    const itemTypes = await getItemTypes(user.familyId);
    const matchingTypes = itemTypes.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase())
    );

    // マッチしたアイテム種別のIDで持ち物を検索
    const items = await getItems(user.familyId, { status: 'owned' });
    const matchingItems = items.filter((item) =>
      matchingTypes.some((t) => t.id === item.itemTypeId)
    );

    // 場所情報を付与
    const results = await Promise.all(
      matchingItems.map(async (item) => {
        const location = await getItemLocation(user.familyId, item.id);
        const itemType = matchingTypes.find((t) => t.id === item.itemTypeId);
        return {
          item: { ...item, itemTypeName: itemType?.name || '不明' },
          box: location?.box,
          location: location?.location,
        };
      })
    );

    sendSuccess(res, { results });
  }, '検索中にエラーが発生しました')
);

export default router;
