import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthProvider } from '../../context/AuthContext';
import { vi } from 'vitest';

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn()
  }
}));

const LoginWrapper = () => (
  <BrowserRouter>
    <AuthProvider>
      <Login />
    </AuthProvider>
  </BrowserRouter>
);

describe('Login Component', () => {
  it('renders login form', () => {
    render(<LoginWrapper />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('submits form with valid credentials', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      token: 'mock-token',
      user: { id: 1, name: 'Test User', role: 'ADMIN' }
    });
    
    vi.mocked(require('../../services/authService').authService.login).mockImplementation(mockLogin);

    render(<LoginWrapper />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});