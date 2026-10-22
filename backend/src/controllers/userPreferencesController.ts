import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class UserPreferencesController {
  static async getPreferences(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const prefs = await prisma.userPreferences.upsert({
        where: { userId },
        update: {},
        create: { userId, theme: 'light', autoTheme: false, language: 'en' },
      });
      res.json({ success: true, data: prefs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: 'Could not load preferences' } });
    }
  }

  static async updatePreferences(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const { theme, autoTheme, language } = req.body || {};
      const data = {
        ...(theme !== undefined && { theme: String(theme) }),
        ...(autoTheme !== undefined && { autoTheme: Boolean(autoTheme) }),
        ...(language !== undefined && { language: String(language) }),
      };
      const prefs = await prisma.userPreferences.upsert({
        where: { userId },
        update: data,
        create: { userId, theme: 'light', autoTheme: false, language: 'en', ...data },
      });
      res.json({ success: true, data: prefs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: 'Could not save preferences' } });
    }
  }
}
