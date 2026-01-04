'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">持ち物管理</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/items">持ち物</NavLink>
            <NavLink href="/boxes">箱</NavLink>
            <NavLink href="/locations">保管場所</NavLink>
            <NavLink href="/wishlist">欲しい物</NavLink>
            <NavLink href="/inventory">棚卸</NavLink>
          </nav>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">
                    {user?.displayName?.charAt(0) || '?'}
                  </span>
                </div>
              )}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20 animate-fade-in">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-medium text-gray-900 truncate">{user?.displayName}</p>
                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <MenuLink href="/settings">設定</MenuLink>
                    {user?.role === 'admin' && <MenuLink href="/admin/invite">招待コード発行</MenuLink>}
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={signOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      ログアウト
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="md:hidden border-t border-gray-100">
        <div className="flex justify-around">
          <MobileNavLink href="/" icon="🏠" label="ホーム" />
          <MobileNavLink href="/items" icon="📦" label="持ち物" />
          <MobileNavLink href="/boxes" icon="🗃️" label="箱" />
          <MobileNavLink href="/wishlist" icon="📝" label="欲しい物" />
          <MobileNavLink href="/inventory" icon="📋" label="棚卸" />
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
      {children}
    </Link>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
      {children}
    </Link>
  );
}

function MobileNavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center py-2 px-4 text-gray-600 hover:text-primary-600 transition-colors">
      <span className="text-xl">{icon}</span>
      <span className="text-xs mt-0.5">{label}</span>
    </Link>
  );
}
