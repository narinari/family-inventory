import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BoxesPage from './page';
import { createMockAuthContext, mockBox, mockLocation } from '@/test/mocks';
import * as api from '@/lib/api';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getBoxes: vi.fn(),
  getLocations: vi.fn(),
  createBox: vi.fn(),
  updateBox: vi.fn(),
  deleteBox: vi.fn(),
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

import { useAuth } from '@/contexts/AuthContext';

describe('BoxesPage', () => {
  const mockAuth = createMockAuthContext();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuth);
    (api.getBoxes as ReturnType<typeof vi.fn>).mockResolvedValue([mockBox]);
    (api.getLocations as ReturnType<typeof vi.fn>).mockResolvedValue([mockLocation]);
  });

  it('should render boxes list', async () => {
    render(<BoxesPage />);

    await waitFor(() => {
      expect(screen.getByText('箱一覧')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Test Box')).toBeInTheDocument();
    });
  });

  it('should show empty state when no boxes', async () => {
    (api.getBoxes as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(<BoxesPage />);

    await waitFor(() => {
      expect(screen.getByText('箱がまだ登録されていません')).toBeInTheDocument();
    });
  });

  it('should open create modal when clicking new button', async () => {
    const user = userEvent.setup();
    render(<BoxesPage />);

    await waitFor(() => {
      expect(screen.getByText('箱一覧')).toBeInTheDocument();
    });

    const newButton = screen.getByRole('button', { name: /新規作成/ });
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByText('箱を作成')).toBeInTheDocument();
    });
  });

  it('should create box when submitting form', async () => {
    const user = userEvent.setup();
    (api.createBox as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    render(<BoxesPage />);

    await waitFor(() => {
      expect(screen.getByText('箱一覧')).toBeInTheDocument();
    });

    const newButton = screen.getByRole('button', { name: /新規作成/ });
    await user.click(newButton);

    const nameInput = screen.getByPlaceholderText('箱の名前');
    await user.type(nameInput, 'New Box');

    const saveButton = screen.getByRole('button', { name: '保存' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(api.createBox).toHaveBeenCalledWith({
        name: 'New Box',
        locationId: undefined,
        description: undefined,
      });
    });
  });

  it('should open delete confirmation when clicking delete', async () => {
    const user = userEvent.setup();
    render(<BoxesPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Box')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: '削除' });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('箱を削除')).toBeInTheDocument();
    });
  });
});
