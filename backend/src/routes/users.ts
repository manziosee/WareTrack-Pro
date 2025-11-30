import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get users endpoint' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create user endpoint' });
});

export default router;