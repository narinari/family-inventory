import { Router } from 'express';
import { authenticateAgent } from '../../middleware/auth.js';
import itemsRouter from './items.js';
import itemTypesRouter from './item-types.js';
import tagsRouter from './tags.js';
import wishlistRouter from './wishlist.js';
import boxesRouter from './boxes.js';
import locationsRouter from './locations.js';
import searchRouter from './search.js';

const router: Router = Router();

// エージェント認証 (API Key + X-Agent-Actor) をすべてのルートに適用
router.use(authenticateAgent);

// ルーターをマウント
router.use(itemsRouter);
router.use(itemTypesRouter);
router.use(tagsRouter);
router.use('/wishlist', wishlistRouter);
router.use('/boxes', boxesRouter);
router.use('/locations', locationsRouter);
router.use('/search', searchRouter);

export default router;
