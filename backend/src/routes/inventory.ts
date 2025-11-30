import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get inventory items endpoint' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create inventory item endpoint' });
});

export default router;