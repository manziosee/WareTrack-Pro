import { authService } from '../authService';
import { vi } from 'vitest';

// Mock axios
vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn()
  }
}));

describe('AuthService', () => {
  const mockApi = require('../api').default;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and store token', async () => {
      const mockResponse = {
        data: {
          data: {
            token: 'mock-token',
            user: { id: 1, name: 'Test User', role: 'ADMIN' }
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });

      expect(localStorage.getItem('token')).toBe('mock-token');
      expect(result.token).toBe('mock-token');
      expect(result.user.name).toBe('Test User');
    });

    it('should handle login failure', async () => {
      mockApi.post.mockRejectedValue({
        response: {
          data: { error: { message: 'Invalid credentials' } }
        }
      });

      await expect(authService.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      })).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should return stored user', () => {
      const user = { id: 1, name: 'Test User', role: 'ADMIN' };
      localStorage.setItem('user', JSON.stringify(user));

      const result = authService.getCurrentUser();
      expect(result).toEqual(user);
    });

    it('should return null if no user stored', () => {
      const result = authService.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear stored data', async () => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));

      mockApi.post.mockResolvedValue({ data: { success: true } });

      await authService.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
});