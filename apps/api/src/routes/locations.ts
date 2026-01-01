import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { getUserByUid } from '../services/auth.service.js';
import {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  isLocationInUse,
  getLocationBoxes,
} from '../services/location.service.js';
import { ErrorCodes } from '@family-inventory/shared';

const router: Router = Router();

const createLocationSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  address: z.string().max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
});

const updateLocationSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  address: z.string().max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
});

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    const locations = await getLocations(user.familyId);
    res.json({ success: true, data: { locations } });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '保管場所の取得中にエラーが発生しました' },
    });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    const parsed = createLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: '入力内容を確認してください',
          details: parsed.error.errors,
        },
      });
      return;
    }

    const location = await createLocation(user.familyId, parsed.data);
    res.status(201).json({ success: true, data: { location } });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '保管場所の作成中にエラーが発生しました' },
    });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: '入力内容を確認してください',
          details: parsed.error.errors,
        },
      });
      return;
    }

    const location = await updateLocation(user.familyId, req.params.id, parsed.data);
    if (!location) {
      res.status(404).json({
        success: false,
        error: { code: 'LOCATION_NOT_FOUND', message: '保管場所が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { location } });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '保管場所の更新中にエラーが発生しました' },
    });
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    const inUse = await isLocationInUse(user.familyId, req.params.id);
    if (inUse) {
      res.status(400).json({
        success: false,
        error: { code: 'LOCATION_IN_USE', message: 'この保管場所には箱が置かれているため削除できません' },
      });
      return;
    }

    const deleted = await deleteLocation(user.familyId, req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'LOCATION_NOT_FOUND', message: '保管場所が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { message: '保管場所を削除しました' } });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '保管場所の削除中にエラーが発生しました' },
    });
  }
});

router.get('/:id/boxes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    const location = await getLocationById(user.familyId, req.params.id);
    if (!location) {
      res.status(404).json({
        success: false,
        error: { code: 'LOCATION_NOT_FOUND', message: '保管場所が見つかりません' },
      });
      return;
    }

    const boxes = await getLocationBoxes(user.familyId, req.params.id);
    res.json({ success: true, data: { location, boxes } });
  } catch (error) {
    console.error('Get location boxes error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '保管場所の箱取得中にエラーが発生しました' },
    });
  }
});

export default router;
