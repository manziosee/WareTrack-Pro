import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class GamificationController {
  static async getLeaderboard(req: Request, res: Response) {
    try {
      const { month = new Date().toISOString().slice(0, 7) } = req.query;
      
      const leaderboard = await prisma.driverLeaderboard.findMany({
        where: { month: month as string },
        include: { driver: { select: { name: true, rating: true } } },
        orderBy: [{ rank: 'asc' }, { points: 'desc' }],
        take: 20
      });
      
      res.json({ success: true, data: leaderboard });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async getAchievements(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      
      const achievements = await prisma.driverAchievement.findMany({
        where: { driverId: Number(driverId) },
        orderBy: { earnedAt: 'desc' }
      });
      
      res.json({ success: true, data: achievements });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async awardAchievement(req: Request, res: Response) {
    try {
      const { driverId, achievementType, title, description, points } = req.body;
      
      const achievement = await prisma.driverAchievement.create({
        data: { driverId, achievementType, title, description, points }
      });
      
      const month = new Date().toISOString().slice(0, 7);
      await prisma.driverLeaderboard.update({
        where: { driverId_month: { driverId, month } },
        data: { points: { increment: points } }
      });
      
      res.json({ success: true, data: achievement });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async updateLeaderboard(req: Request, res: Response) {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const startOfMonth = new Date(month + '-01');
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      
      const drivers = await prisma.driver.findMany({
        include: {
          orders: {
            where: {
              createdAt: { gte: startOfMonth, lt: endOfMonth }
            }
          }
        }
      });
      
      for (const driver of drivers) {
        const deliveredOrders = driver.orders.filter(o => o.status === 'DELIVERED');
        const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const successRate = driver.orders.length > 0 ? (deliveredOrders.length / driver.orders.length) * 100 : 0;
        const points = deliveredOrders.length * 10;
        
        await prisma.driverLeaderboard.upsert({
          where: { driverId_month: { driverId: driver.id, month } },
          create: {
            driverId: driver.id,
            month,
            totalDeliveries: deliveredOrders.length,
            totalRevenue,
            successRate,
            points
          },
          update: {
            totalDeliveries: deliveredOrders.length,
            totalRevenue,
            successRate,
            points
          }
        });
      }
      
      const leaderboard = await prisma.driverLeaderboard.findMany({
        where: { month },
        orderBy: [{ points: 'desc' }, { totalDeliveries: 'desc' }]
      });
      
      for (let i = 0; i < leaderboard.length; i++) {
        await prisma.driverLeaderboard.update({
          where: { id: leaderboard[i].id },
          data: { rank: i + 1 }
        });
      }
      
      res.json({ success: true, message: 'Leaderboard updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
