import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ProofOfDeliveryController {
  static async createProof(req: Request, res: Response) {
    try {
      const { dispatchId, orderId, photoUrl, signatureData, recipientName, notes, latitude, longitude } = req.body;
      
      const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const proof = await prisma.deliveryProof.create({
        data: {
          dispatchId,
          orderId,
          photoUrl,
          signatureData,
          confirmationCode,
          recipientName,
          notes,
          latitude,
          longitude
        }
      });
      
      await prisma.deliveryOrder.update({
        where: { id: orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() }
      });
      
      res.json({ success: true, data: { confirmationCode, proof } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getProof(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const proof = await prisma.deliveryProof.findFirst({ where: { orderId: Number(orderId) } });
      res.json({ success: true, data: proof });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async verifyCode(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const proof = await prisma.deliveryProof.findUnique({ where: { confirmationCode: code } });
      res.json({ success: true, data: proof, verified: !!proof });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
