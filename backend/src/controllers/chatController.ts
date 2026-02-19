import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ChatController {
  static async sendMessage(req: Request, res: Response) {
    try {
      const { receiverId, roomId, message, messageType = 'text' } = req.body;
      const senderId = req.user?.userId;
      
      const chatMessage = await prisma.chatMessage.create({
        data: {
          senderId: Number(senderId),
          receiverId,
          roomId,
          message,
          messageType
        },
        include: { sender: { select: { name: true } } }
      });
      
      const io = (global as any).io;
      if (io) {
        if (receiverId) io.to(`user-${receiverId}`).emit('chat-message', chatMessage);
        if (roomId) io.to(roomId).emit('chat-message', chatMessage);
      }
      
      res.json({ success: true, data: chatMessage });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const { roomId, userId } = req.query;
      const currentUserId = req.user?.userId;
      
      let messages;
      if (roomId) {
        messages = await prisma.chatMessage.findMany({
          where: { roomId: roomId as string },
          include: { sender: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100
        });
      } else if (userId) {
        messages = await prisma.chatMessage.findMany({
          where: {
            OR: [
              { senderId: Number(currentUserId), receiverId: Number(userId) },
              { senderId: Number(userId), receiverId: Number(currentUserId) }
            ]
          },
          include: { sender: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100
        });
      }
      
      res.json({ success: true, data: messages });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { messageIds } = req.body;
      await prisma.chatMessage.updateMany({
        where: { id: { in: messageIds } },
        data: { read: true }
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
