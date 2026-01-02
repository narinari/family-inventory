import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from './page';
import { createMockAuthContext } from '@/test/mocks';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('@/components/settings/DiscordLinkButton', () => ({
  DiscordLinkButton: () => <button>Discord Link</button>,
}));

import { useAuth } from '@/contexts/AuthContext';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings page for admin user', () => {
    const mockAuth = createMockAuthContext({ role: 'admin' });
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuth);

    render(<SettingsPage />);

    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.getByText('プロフィール')).toBeInTheDocument();
    expect(screen.getByText('メンバー管理')).toBeInTheDocument();
    expect(screen.getByText('Discord 連携')).toBeInTheDocument();
    expect(screen.getByText('マスターデータ管理')).toBeInTheDocument();
    expect(screen.getByText('アカウント情報')).toBeInTheDocument();
  });

  it('should not show member management for non-admin users', () => {
    const mockAuth = createMockAuthContext({ role: 'member' });
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuth);

    render(<SettingsPage />);

    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.queryByText('メンバー管理')).not.toBeInTheDocument();
  });

  it('should display user information', () => {
    const mockAuth = createMockAuthContext({
      displayName: 'John Doe',
      email: 'john@example.com',
    });
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuth);

    render(<SettingsPage />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const mockAuth = {
      ...createMockAuthContext(),
      loading: true,
      user: null,
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuth);

    render(<SettingsPage />);

    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('should have links to sub-pages', () => {
    const mockAuth = createMockAuthContext({ role: 'admin' });
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuth);

    render(<SettingsPage />);

    expect(screen.getByRole('link', { name: '編集' })).toHaveAttribute('href', '/settings/profile');
    expect(screen.getByRole('link', { name: '詳細' })).toHaveAttribute('href', '/settings/members');
    expect(screen.getByRole('link', { name: 'アイテム種別' })).toHaveAttribute('href', '/settings/item-types');
    expect(screen.getByRole('link', { name: 'タグ' })).toHaveAttribute('href', '/settings/tags');
  });
});
