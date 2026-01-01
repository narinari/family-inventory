import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { getUserByUid } from '../services/auth.service.js';
import {
  getBoxes,
  getBoxById,
  createBox,
  updateBox,
  deleteBox,
  isBoxInUse,
  getBoxItems,
} from '../services/box.service.js';
import { ErrorCodes } from '@family-inventory/shared';

const router: Router = Router();

const createBoxSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  locationId: z.string().optional(),
  description: z.string().max(500).trim().optional(),
});

const updateBoxSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  locationId: z.string().optional(),
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

    const boxes = await getBoxes(user.familyId);
    res.json({ success: true, data: { boxes } });
  } catch (error) {
    console.error('Get boxes error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '箱の取得中にエラーが発生しました' },
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

    const parsed = createBoxSchema.safeParse(req.body);
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

    const box = await createBox(user.familyId, parsed.data);
    res.status(201).json({ success: true, data: { box } });
  } catch (error) {
    console.error('Create box error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '箱の作成中にエラーが発生しました' },
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

    const parsed = updateBoxSchema.safeParse(req.body);
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

    const box = await updateBox(user.familyId, req.params.id, parsed.data);
    if (!box) {
      res.status(404).json({
        success: false,
        error: { code: 'BOX_NOT_FOUND', message: '箱が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { box } });
  } catch (error) {
    console.error('Update box error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '箱の更新中にエラーが発生しました' },
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

    const inUse = await isBoxInUse(user.familyId, req.params.id);
    if (inUse) {
      res.status(400).json({
        success: false,
        error: { code: 'BOX_IN_USE', message: 'この箱にはアイテムが格納されているため削除できません' },
      });
      return;
    }

    const deleted = await deleteBox(user.familyId, req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'BOX_NOT_FOUND', message: '箱が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { message: '箱を削除しました' } });
  } catch (error) {
    console.error('Delete box error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '箱の削除中にエラーが発生しました' },
    });
  }
});

router.get('/:id/items', authenticateToken, async (req: Request, res: Response) => {
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

    const box = await getBoxById(user.familyId, req.params.id);
    if (!box) {
      res.status(404).json({
        success: false,
        error: { code: 'BOX_NOT_FOUND', message: '箱が見つかりません' },
      });
      return;
    }

    const items = await getBoxItems(user.familyId, req.params.id);
    res.json({ success: true, data: { box, items } });
  } catch (error) {
    console.error('Get box items error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '箱の中身取得中にエラーが発生しました' },
    });
  }
});

export default router;
