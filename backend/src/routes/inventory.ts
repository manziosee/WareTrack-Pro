import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, InventoryController.getInventory);
router.get('/categories', auth, InventoryController.getCategories);
router.get('/low-stock', auth, InventoryController.getLowStock);
router.get('/stats', auth, InventoryController.getStats);
router.get('/:id', auth, InventoryController.getInventoryById);
router.get('/:id/history', auth, InventoryController.getItemHistory);
router.post('/', auth, InventoryController.createInventoryItem);
router.post('/import', auth, InventoryController.bulkImport);
router.put('/:id', auth, InventoryController.updateInventoryItem);
router.delete('/:id', auth, InventoryController.deleteInventoryItem);

export default router;