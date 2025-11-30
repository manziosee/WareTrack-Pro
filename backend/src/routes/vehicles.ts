import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get vehicles endpoint' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create vehicle endpoint' });
});

export default router;