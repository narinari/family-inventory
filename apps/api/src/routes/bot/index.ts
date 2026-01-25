import { Router } from 'express';
import { authenticateBotApiKey } from '../../middleware/auth.js';
import itemsRouter from './items.js';
import wishlistRouter from './wishlist.js';
import boxesRouter from './boxes.js';
import locationsRouter from './locations.js';
import searchRouter from './search.js';

const router: Router = Router();

// Bot API Key認証をすべてのルートに適用
router.use(authenticateBotApiKey);

// ルーターをマウント
router.use(itemsRouter);
router.use('/wishlist', wishlistRouter);
router.use('/boxes', boxesRouter);
router.use('/locations', locationsRouter);
router.use('/search', searchRouter);

export default router;
