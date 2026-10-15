import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import { recordAudit } from '../middleware/audit';
import { generateCode, saveOtp, checkOtp } from '../services/otpStore';
import { verifyTotp } from '../services/totp';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';
import { QueueService } from '../services/queueService';
import { EmailService } from '../services/emailService';

const cache = CacheService.getInstance();

// In-memory OTP storage for login (in production, use Redis)

export class AuthController {
  // Generate 6-digit OTP for login
  static generateLoginOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, role } = req.body;

      // Check if this is the first user registration
      const userCount = await prisma.user.count();
      const isFirstUser = userCount === 0;
      
      // If not first user, ensure role is not ADMIN
      if (!isFirstUser && role === 'ADMIN') {
        return res.status(403).json({ 
          success: false,
          error: {
            code: 'ADMIN_REGISTRATION_DISABLED',
            message: 'Admin registration is restricted.'
          }
        });
      }

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, email, and password are required'
          }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format'
          }
        });
      }

      // Validate password strength
      if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters and include letters and numbers'
          }
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          }
        });
      }

      // Split name into firstName and lastName
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Determine user role
      let userRole = 'WAREHOUSE_STAFF'; // Default role
      
      if (isFirstUser) {
        userRole = 'ADMIN';
      } else if (role && ['WAREHOUSE_STAFF', 'DISPATCH_OFFICER', 'DRIVER'].includes(role)) {
        userRole = role;
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Use transaction to create user and related records
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            firstName,
            lastName,
            name,
            email: normalizedEmail,
            password: hashedPassword,
            phone: phone || '',
            role: userRole as any,
            // Self-registered accounts wait for an admin to approve them;
            // only the very first user (the initial admin) is active straight away
            status: isFirstUser ? 'ACTIVE' : 'PENDING'
          }
        });

        // Create driver record if role is DRIVER
        if (userRole === 'DRIVER') {
          await tx.driver.create({
            data: {
              userId: user.id,
              name: user.name,
              licenseNumber: `LIC-${user.id.toString().padStart(6, '0')}`, // Generate temp license
              phone: user.phone || '',
              status: 'AVAILABLE',
              experience: 0,
              rating: 0
            }
          });
        }

        return user;
      });

      const user = result;

      // Send welcome email
      try {
        await QueueService.addEmailJob({
          email: user.email,
          title: 'Welcome to WareTrack-Pro',
          name: user.name,
          message: isFirstUser
            ? `Welcome to WareTrack-Pro, ${user.name}! Your administrator account is ready.`
            : `Welcome to WareTrack-Pro, ${user.name}! Your account has been created and is waiting for an administrator to approve it. You will be able to sign in once it is activated.`,
          template: 'welcome'
        });
      } catch (emailError) {
        console.warn('Welcome email failed:', emailError);
      }
      
      const { password: _, ...userWithoutPassword } = user;
      // No tokens here: every sign-in goes through password + emailed OTP
      res.status(201).json({ 
        success: true,
        message: isFirstUser
          ? 'Administrator account created. You can now sign in.'
          : 'Account created. An administrator must approve it before you can sign in.',
        data: {
          user: userWithoutPassword,
          requiresApproval: !isFirstUser
        }
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          }
        });
      }
      
      // Handle database connection errors
      if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          success: false,
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database is temporarily unavailable. Please try again later.'
          }
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Registration failed. Please try again.'
        }
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });
      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials'
          }
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials'
          }
        });
      }

      if (user.status === 'PENDING') {
        return res.status(403).json({ 
          success: false,
          error: {
            code: 'ACCOUNT_PENDING',
            message: 'Your account is waiting for an administrator to approve it. You will be able to sign in once it is activated.'
          }
        });
      }

      // Check if user account is active
      if (user.status === 'INACTIVE') {
        return res.status(403).json({ 
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Your account is inactive. Please contact an administrator to activate your account.'
          }
        });
      }

      // Accounts with an authenticator app use its 6-digit code instead of email
      if (user.twoFactorEnabled && user.totpSecret) {
        return res.json({
          success: true,
          requiresOTP: true,
          message: 'Enter the 6-digit code from your authenticator app',
          data: { email: email.toLowerCase(), otpRequired: true, method: 'totp' }
        });
      }

      // Generate and send OTP for login verification (valid 5 minutes, stored hashed)
      const otp = generateCode();
      await saveOtp(email, 'LOGIN', otp, user.id, 5 * 60 * 1000);

      // Send OTP via email
      const emailSent = await EmailService.sendLoginOTP(email, user.name, otp);

      // Local development without email configured: print the code instead
      if (!emailSent && process.env.NODE_ENV !== 'production') {
        console.log(`🔐 [dev] Login OTP for ${email}: ${otp}`);
      } else if (!emailSent) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'EMAIL_FAILED',
            message: 'Failed to send login OTP'
          }
        });
      }

      res.json({ 
        success: true,
        requiresOTP: true,
        message: 'Login OTP sent to your email',
        data: {
          email: email.toLowerCase(),
          otpRequired: true,
          method: 'email'
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle database connection errors
      if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          success: false,
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database is temporarily unavailable. Please try again later.'
          }
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Login failed. Please try again.'
        }
      });
    }
  }

  // Verify OTP and complete login
  static async verifyLoginOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'Email and OTP are required'
          }
        });
      }

      const account = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })
        || await prisma.user.findUnique({ where: { email: String(email) } });

      let verifiedUserId: number | null = null;
      if (account?.twoFactorEnabled && account.totpSecret) {
        if (!verifyTotp(account.totpSecret, String(otp))) {
          return res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'That authenticator code is not valid' } });
        }
        verifiedUserId = account.id;
      } else {
        const check = await checkOtp(email, 'LOGIN', String(otp));
        if (!check.ok) {
          const messages: Record<string, [string, string]> = {
            missing: ['INVALID_OTP', 'Invalid or expired code. Please sign in again.'],
            expired: ['OTP_EXPIRED', 'This code has expired. Please sign in again.'],
            invalid: ['INVALID_OTP', 'That code is not correct.'],
            locked: ['OTP_LOCKED', 'Too many wrong codes. Please sign in again to get a new one.'],
          };
          const [code, message] = messages[(check as { reason: string }).reason];
          return res.status(400).json({ success: false, error: { code, message } });
        }
        verifiedUserId = (check as { userId: number | null }).userId;
      }

      // Get user and complete login
      const user = verifiedUserId ? await prisma.user.findUnique({ where: { id: verifiedUserId } }) : null;

      if (!user || user.status !== 'ACTIVE') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or not active'
          }
        });
      }

      // Check if this is first login (lastLogin is null)
      const isFirstLogin = !user.lastLogin;
      recordAudit({ userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id, summary: `${user.name} signed in`, ipAddress: req.ip });
      
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Send welcome email for first-time users
      if (isFirstLogin) {
        console.log('✅ Welcome to WareTrack-Pro 🎉 - Sent successfully');
        await QueueService.addEmailJob({
          email: user.email,
          title: 'Welcome to WareTrack-Pro 🎉',
          name: user.name || user.firstName || 'User',
          message: `Welcome to WareTrack-Pro, ${user.name || user.firstName || 'User'}! You have successfully logged in for the first time.`,
          template: 'welcome'
        });
      }

      const accessToken = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
      const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, getJwtSecret(), { expiresIn: '30d' });
      
      await cache.setSession(accessToken, user.id);
      
      const { password: _, ...userWithoutPassword } = user;
      
      // All users go to dashboard - role-specific routing handled in frontend
      const redirectUrl = '/dashboard';
      
      res.json({ 
        success: true,
        data: {
          user: userWithoutPassword,
          tokens: {
            access: accessToken,
            refresh: refreshToken
          },
          redirectUrl
        }
      });
    } catch (error: any) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OTP verification failed. Please try again.'
        }
      });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const decoded = jwt.verify(refreshToken, getJwtSecret()) as any;
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token'
          }
        });
      }
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      if (!user || user.status !== 'ACTIVE') {
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive'
          }
        });
      }

      const newAccessToken = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
      const newRefreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, getJwtSecret(), { expiresIn: '30d' });
      await cache.setSession(newAccessToken, user.id);
      
      res.json({ 
        success: true,
        data: {
          access: newAccessToken,
          refresh: newRefreshToken
        }
      });
    } catch (error) {
      res.status(401).json({ 
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token'
        }
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await cache.deleteSession(token);
      }
      res.json({ 
        success: true,
        message: 'Successfully logged out'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(req.user?.userId) }
      });
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const { name, email, phone } = req.body;
      const userId = Number(req.user?.userId);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          email,
          phone
        }
      });

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ 
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile'
        }
      });
    }
  }

  static async getUserActivity(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);

      const [ordersProcessed, totalOrders, deliveredOrders] = await Promise.all([
        prisma.deliveryOrder.count({
          where: { createdBy: userId }
        }),
        prisma.deliveryOrder.count(),
        prisma.deliveryOrder.count({
          where: { 
            createdBy: userId,
            status: 'DELIVERED'
          }
        })
      ]);

      const successRate = ordersProcessed > 0 ? Math.round((deliveredOrders / ordersProcessed) * 100) : 0;

      res.json({ 
        success: true,
        data: {
          ordersProcessed,
          tasksCompleted: deliveredOrders,
          successRate
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user activity'
        }
      });
    }
  }

  static async getDashboardUrl(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(req.user?.userId) }
      });
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      let redirectUrl = '/dashboard';
      switch (user.role) {
        case 'ADMIN':
          redirectUrl = '/dashboard';
          break;
        case 'WAREHOUSE_STAFF':
          redirectUrl = '/inventory';
          break;
        case 'DISPATCH_OFFICER':
          redirectUrl = '/dispatch';
          break;
        case 'DRIVER':
          redirectUrl = '/tracking';
          break;
        default:
          redirectUrl = '/dashboard';
      }

      res.json({ 
        success: true,
        data: {
          redirectUrl,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Current password and new password are required' }
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters long' }
        });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
        });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }
}