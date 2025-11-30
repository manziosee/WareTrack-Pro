import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get drivers endpoint' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create driver endpoint' });
});

export default router;