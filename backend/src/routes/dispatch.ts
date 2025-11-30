import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get dispatch schedules endpoint' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create dispatch endpoint' });
});

export default router;