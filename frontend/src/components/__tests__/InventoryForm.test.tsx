import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddInventoryForm from '../forms/AddInventoryForm';
import { vi } from 'vitest';

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    createItem: vi.fn()
  }
}));

describe('AddInventoryForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<AddInventoryForm onClose={mockOnClose} onSave={mockOnSave} />);
    
    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/product code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<AddInventoryForm onClose={mockOnClose} onSave={mockOnSave} />);
    
    fireEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => {
      expect(screen.getByText(/product name is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 1, name: 'Test Product' }
    });
    
    vi.mocked(require('../../services/inventoryService').inventoryService.createItem)
      .mockImplementation(mockCreate);

    render(<AddInventoryForm onClose={mockOnClose} onSave={mockOnSave} />);
    
    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: 'Test Product' }
    });
    fireEvent.change(screen.getByLabelText(/product code/i), {
      target: { value: 'TEST001' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(mockOnSave).toHaveBeenCalled();
    });
  });
});