import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  isLocationInUse,
  getLocationBoxes,
} from '../services/location.service.js';
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

const createLocationSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  address: z.string().max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});

const updateLocationSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  address: z.string().max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});

// GET / - 保管場所一覧取得
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const locations = await getLocations(user.familyId);
    sendSuccess(res, { locations });
  }, '保管場所の取得中にエラーが発生しました')
);

// POST / - 保管場所新規作成
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = createLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const location = await createLocation(user.familyId, parsed.data);
    sendCreated(res, { location });
  }, '保管場所の作成中にエラーが発生しました')
);

// PUT /:id - 保管場所更新
router.put(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const location = await updateLocation(user.familyId, req.params.id, parsed.data);
    if (!location) {
      sendNotFound(res, '保管場所', 'LOCATION_NOT_FOUND');
      return;
    }

    sendSuccess(res, { location });
  }, '保管場所の更新中にエラーが発生しました')
);

// DELETE /:id - 保管場所削除
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const inUse = await isLocationInUse(user.familyId, req.params.id);
    if (inUse) {
      sendError(res, 'LOCATION_IN_USE', 'この保管場所には箱が置かれているため削除できません', 400);
      return;
    }

    const deleted = await deleteLocation(user.familyId, req.params.id);
    if (!deleted) {
      sendNotFound(res, '保管場所', 'LOCATION_NOT_FOUND');
      return;
    }

    sendMessage(res, '保管場所を削除しました');
  }, '保管場所の削除中にエラーが発生しました')
);

// GET /:id/boxes - 保管場所内の箱一覧取得
router.get(
  '/:id/boxes',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const location = await getLocationById(user.familyId, req.params.id);
    if (!location) {
      sendNotFound(res, '保管場所', 'LOCATION_NOT_FOUND');
      return;
    }

    const boxes = await getLocationBoxes(user.familyId, req.params.id);
    sendSuccess(res, { location, boxes });
  }, '保管場所の箱取得中にエラーが発生しました')
);

export default router;
