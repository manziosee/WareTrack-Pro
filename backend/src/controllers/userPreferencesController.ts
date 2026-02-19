import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class UserPreferencesController {
  static async getPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      const prefs: any = await prisma.$queryRaw`
        SELECT * FROM user_preferences WHERE user_id = ${userId}
      `;
      
      if (!prefs || prefs.length === 0) {
        await prisma.$executeRaw`
          INSERT INTO user_preferences (user_id, theme, auto_theme, language)
          VALUES (${userId}, 'light', false, 'en')
        `;
        return res.json({ success: true, data: { theme: 'light', autoTheme: false, language: 'en' } });
      }
      
      res.json({ success: true, data: prefs[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }

  static async updatePreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { theme, autoTheme, language } = req.body;
      
      await prisma.$executeRaw`
        INSERT INTO user_preferences (user_id, theme, auto_theme, language, updated_at)
        VALUES (${userId}, ${theme}, ${autoTheme}, ${language}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          theme = ${theme},
          auto_theme = ${autoTheme},
          language = ${language},
          updated_at = NOW()
      `;
      
      res.json({ success: true, data: { theme, autoTheme, language } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
}
