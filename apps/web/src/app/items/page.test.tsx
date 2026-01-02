import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemsPage from './page';
import { createMockAuthContext, mockItem, mockItemType, mockBox } from '@/test/mocks';
import * as api from '@/lib/api';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getItems: vi.fn(),
  getItemTypes: vi.fn(),
  getBoxes: vi.fn(),
  consumeItem: vi.fn(),
  giveItem: vi.fn(),
  sellItem: vi.fn(),
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

import { useAuth } from '@/contexts/AuthContext';

describe('ItemsPage', () => {
  const mockAuth = createMockAuthContext();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuth);
    (api.getItems as ReturnType<typeof vi.fn>).mockResolvedValue([mockItem]);
    (api.getItemTypes as ReturnType<typeof vi.fn>).mockResolvedValue([mockItemType]);
    (api.getBoxes as ReturnType<typeof vi.fn>).mockResolvedValue([mockBox]);
  });

  it('should render loading state initially', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockAuth,
      loading: true,
    });

    render(<ItemsPage />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('should render items list after loading', async () => {
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText('持ち物一覧')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Test Item Type')).toBeInTheDocument();
    });
  });

  it('should show empty state when no items', async () => {
    (api.getItems as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText('持ち物がまだ登録されていません')).toBeInTheDocument();
    });
  });

  it('should filter items by status', async () => {
    const user = userEvent.setup();
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText('持ち物一覧')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'all');

    expect(select).toHaveValue('all');
  });

  it('should open consume modal when clicking consume button', async () => {
    const user = userEvent.setup();
    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Item Type')).toBeInTheDocument();
    });

    const consumeButton = screen.getByRole('button', { name: '消費' });
    await user.click(consumeButton);

    await waitFor(() => {
      expect(screen.getByText('消費済にする')).toBeInTheDocument();
    });
  });

  it('should call consumeItem when confirming consume action', async () => {
    const user = userEvent.setup();
    (api.consumeItem as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    render(<ItemsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Item Type')).toBeInTheDocument();
    });

    const consumeButton = screen.getByRole('button', { name: '消費' });
    await user.click(consumeButton);

    const confirmButton = screen.getByRole('button', { name: '確定' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(api.consumeItem).toHaveBeenCalledWith('item-1');
    });
  });
});
