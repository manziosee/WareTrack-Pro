import express from 'express';
const router = express.Router();

router.get('/dashboard', (req, res) => {
  res.json({ message: 'Get dashboard stats endpoint' });
});

router.get('/inventory', (req, res) => {
  res.json({ message: 'Get inventory reports endpoint' });
});

export default router;