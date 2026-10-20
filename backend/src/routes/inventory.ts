import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { auth, authorizeRoles, ROLES } from '../middleware/auth';

const router = Router();

router.get('/', auth, InventoryController.getInventory);
router.get('/categories', auth, InventoryController.getCategories);
router.post('/categories', auth, authorizeRoles(...ROLES.inventoryManagers), InventoryController.createCategory);
router.put('/categories', auth, authorizeRoles(...ROLES.inventoryManagers), InventoryController.renameCategory);
router.delete('/categories', auth, authorizeRoles(...ROLES.inventoryManagers), InventoryController.deleteCategory);
router.get('/low-stock', auth, InventoryController.getLowStock);
router.get('/stats', auth, InventoryController.getStats);
router.get('/:id', auth, InventoryController.getInventoryById);
/**
 * @swagger
 * /api/inventory/{id}/history:
 *   get:
 *     summary: Search stock movement history for an item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search movement type, notes, related order number, or staff member
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 25 }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated stock movements with actor and related order details
 *       400:
 *         description: Invalid item ID or date filter
 *       401:
 *         description: Authentication required
 */
router.get('/:id/history', auth, InventoryController.getItemHistory);
router.post('/', auth, authorizeRoles(...ROLES.inventoryManagers), InventoryController.createInventoryItem);
router.post('/import', auth, authorizeRoles(...ROLES.inventoryManagers), InventoryController.bulkImport);
router.put('/:id', auth, authorizeRoles(...ROLES.inventoryManagers), InventoryController.updateInventoryItem);
router.delete('/:id', auth, authorizeRoles(...ROLES.inventoryManagers), InventoryController.deleteInventoryItem);

export default router;
