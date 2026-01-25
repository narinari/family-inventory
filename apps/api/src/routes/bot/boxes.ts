import { Router, type Request, type Response } from 'express';
import { requireDiscordUserFromQuery } from './helpers.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess, sendNotFound } from '../../utils/response.js';
import { getBoxes, getBoxById, getBoxItems } from '../../services/box.service.js';
import { getLocations } from '../../services/location.service.js';
import { getItemTypes } from '../../services/item-type.service.js';

const router: Router = Router();

// ============================================
// Boxes API
// ============================================

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireDiscordUserFromQuery(req, res);
    if (!user) return;

    const boxes = await getBoxes(user.familyId);
    const locations = await getLocations(user.familyId);

    const boxesWithLocation = boxes.map((box) => {
      const location = locations.find((l) => l.id === box.locationId);
      return { ...box, locationName: location?.name };
    });

    sendSuccess(res, { boxes: boxesWithLocation });
  }, '箱の取得中にエラーが発生しました')
);

router.get(
  '/:id/items',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireDiscordUserFromQuery(req, res);
    if (!user) return;

    const box = await getBoxById(user.familyId, req.params.id);
    if (!box) {
      sendNotFound(res, '箱', 'BOX_NOT_FOUND');
      return;
    }

    const items = await getBoxItems(user.familyId, req.params.id);
    const itemTypes = await getItemTypes(user.familyId);

    const itemsWithType = items.map((item) => {
      const itemType = itemTypes.find((t) => t.id === item.itemTypeId);
      return { ...item, itemTypeName: itemType?.name || '不明' };
    });

    sendSuccess(res, { box, items: itemsWithType });
  }, '箱の中身取得中にエラーが発生しました')
);

export default router;
