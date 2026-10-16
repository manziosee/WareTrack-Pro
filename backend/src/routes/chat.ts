import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { auth } from '../middleware/auth';
import { emitToUser } from '../services/realtime';
import { pushToUsers } from '../services/push';

/** Direct messages between team members (e.g. dispatch ↔ drivers). Mounted at /api/chat. */
const router = Router();
const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message } });

/** People you can message, with the last message and your unread count for each. */
router.get('/conversations', auth, async (req, res, next) => {
  try {
    const me = Number(req.user!.userId);
    const [people, messages] = await Promise.all([
      prisma.user.findMany({ where: { status: 'ACTIVE', id: { not: me } }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
      prisma.chatMessage.findMany({
        where: { OR: [{ senderId: me }, { receiverId: me }], receiverId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: { senderId: true, receiverId: true, message: true, createdAt: true, read: true },
      }),
    ]);
    const data = people.map((p) => {
      const thread = messages.filter((m) => (m.senderId === p.id && m.receiverId === me) || (m.senderId === me && m.receiverId === p.id));
      return {
        user: p,
        lastMessage: thread[0] ? { text: thread[0].message, at: thread[0].createdAt, mine: thread[0].senderId === me } : null,
        unread: thread.filter((m) => m.senderId === p.id && !m.read).length,
      };
    });
    data.sort((a, b) => (b.lastMessage?.at.getTime() || 0) - (a.lastMessage?.at.getTime() || 0) || a.user.name.localeCompare(b.user.name));
    res.json({ success: true, data, unreadTotal: data.reduce((s, c) => s + c.unread, 0) });
  } catch (error) {
    next(error);
  }
});

router.get('/with/:userId', auth, async (req, res, next) => {
  try {
    const me = Number(req.user!.userId);
    const other = Number(req.params.userId);
    const messages = await prisma.chatMessage.findMany({
      where: { OR: [{ senderId: me, receiverId: other }, { senderId: other, receiverId: me }] },
      orderBy: { createdAt: 'asc' },
      take: 300,
      select: { id: true, senderId: true, receiverId: true, message: true, createdAt: true, read: true },
    });
    // Opening a conversation marks the other person's messages as read
    await prisma.chatMessage.updateMany({ where: { senderId: other, receiverId: me, read: false }, data: { read: true } });
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

router.post('/send', auth, async (req, res, next) => {
  try {
    const me = Number(req.user!.userId);
    const to = Number(req.body?.to);
    const text = String(req.body?.message || '').trim();
    if (!to || !text) return bad(res, 'Recipient and message are required');
    if (text.length > 2000) return bad(res, 'Messages can be up to 2000 characters');
    const recipient = await prisma.user.findUnique({ where: { id: to }, select: { id: true, status: true } });
    if (!recipient || recipient.status !== 'ACTIVE' || to === me) return bad(res, 'Recipient not found', 404);
    const message = await prisma.chatMessage.create({
      data: { senderId: me, receiverId: to, message: text },
      select: { id: true, senderId: true, receiverId: true, message: true, createdAt: true, read: true, sender: { select: { name: true } } },
    });
    emitToUser(to, 'chat:message', message);
    // Phone notification for the recipient (the in-app bubble covers open apps)
    void pushToUsers([to], { title: message.sender.name, body: text, url: '/messages', tag: `chat-${me}` });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

export default router;
