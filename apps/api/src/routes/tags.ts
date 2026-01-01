import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { getUserByUid } from '../services/auth.service.js';
import { getTags, createTag, updateTag, deleteTag } from '../services/tag.service.js';
import { ErrorCodes } from '@family-inventory/shared';

const router: Router = Router();

const createTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().max(20).trim().optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: z.string().max(20).trim().optional(),
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

    const tags = await getTags(user.familyId);
    res.json({ success: true, data: { tags } });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'タグの取得中にエラーが発生しました' },
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

    const parsed = createTagSchema.safeParse(req.body);
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

    const tag = await createTag(user.familyId, parsed.data);
    res.status(201).json({ success: true, data: { tag } });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'タグの作成中にエラーが発生しました' },
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

    const parsed = updateTagSchema.safeParse(req.body);
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

    const tag = await updateTag(user.familyId, req.params.id, parsed.data);
    if (!tag) {
      res.status(404).json({
        success: false,
        error: { code: 'TAG_NOT_FOUND', message: 'タグが見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { tag } });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'タグの更新中にエラーが発生しました' },
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

    const deleted = await deleteTag(user.familyId, req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'TAG_NOT_FOUND', message: 'タグが見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'タグを削除しました' } });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'タグの削除中にエラーが発生しました' },
    });
  }
});

export default router;
