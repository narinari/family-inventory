import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WishlistPage from './page';
import { createMockAuthContext, mockWishlist, mockUser } from '@/test/mocks';
import * as api from '@/lib/api';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getWishlist: vi.fn(),
  getMembers: vi.fn(),
  purchaseWishlistItem: vi.fn(),
  cancelWishlistItem: vi.fn(),
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

import { useAuth } from '@/contexts/AuthContext';

describe('WishlistPage', () => {
  const mockAuth = createMockAuthContext();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuth);
    (api.getWishlist as ReturnType<typeof vi.fn>).mockResolvedValue([mockWishlist]);
    (api.getMembers as ReturnType<typeof vi.fn>).mockResolvedValue([mockUser]);
  });

  it('should render wishlist', async () => {
    render(<WishlistPage />);

    await waitFor(() => {
      expect(screen.getByText('欲しい物リスト')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Test Wishlist Item')).toBeInTheDocument();
    });
  });

  it('should show empty state when no pending items', async () => {
    (api.getWishlist as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(<WishlistPage />);

    await waitFor(() => {
      expect(screen.getByText('検討中のアイテムはありません')).toBeInTheDocument();
    });
  });

  it('should filter by status', async () => {
    const user = userEvent.setup();
    render(<WishlistPage />);

    await waitFor(() => {
      expect(screen.getByText('欲しい物リスト')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'all');

    expect(select).toHaveValue('all');
  });

  it('should open purchase modal when clicking purchase button', async () => {
    const user = userEvent.setup();
    render(<WishlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Wishlist Item')).toBeInTheDocument();
    });

    const purchaseButton = screen.getByRole('button', { name: '購入済' });
    await user.click(purchaseButton);

    await waitFor(() => {
      expect(screen.getByText('購入完了')).toBeInTheDocument();
    });
  });

  it('should call purchaseWishlistItem when confirming purchase', async () => {
    const user = userEvent.setup();
    (api.purchaseWishlistItem as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    render(<WishlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Wishlist Item')).toBeInTheDocument();
    });

    const purchaseButton = screen.getByRole('button', { name: '購入済' });
    await user.click(purchaseButton);

    const confirmButton = screen.getByRole('button', { name: '確定' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(api.purchaseWishlistItem).toHaveBeenCalledWith('wishlist-1');
    });
  });

  it('should open cancel modal when clicking cancel button', async () => {
    const user = userEvent.setup();
    render(<WishlistPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Wishlist Item')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: '見送り' });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText(/見送りにしますか/)).toBeInTheDocument();
    });
  });
});
