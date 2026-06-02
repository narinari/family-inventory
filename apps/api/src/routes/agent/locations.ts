import { Router, type Request, type Response } from 'express';
import { requireAgentUser } from './helpers.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess, sendNotFound } from '../../utils/response.js';
import { getLocations, getLocationById, getLocationBoxes } from '../../services/location.service.js';

const router: Router = Router();

// ============================================
// Locations API
// ============================================

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    const locations = await getLocations(actor.familyId);
    sendSuccess(res, { locations });
  }, '保管場所の取得中にエラーが発生しました')
);

router.get(
  '/:id/boxes',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    const location = await getLocationById(actor.familyId, req.params.id);
    if (!location) {
      sendNotFound(res, '保管場所', 'LOCATION_NOT_FOUND');
      return;
    }

    const boxes = await getLocationBoxes(actor.familyId, req.params.id);
    sendSuccess(res, { location, boxes });
  }, '保管場所の箱取得中にエラーが発生しました')
);

export default router;
