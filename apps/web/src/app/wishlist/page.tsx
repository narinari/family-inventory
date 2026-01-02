'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getWishlist, getMembers, purchaseWishlistItem, cancelWishlistItem } from '@/lib/api';
import type { Wishlist, User, WishlistStatus, Priority } from '@family-inventory/shared';

type StatusFilter = 'all' | WishlistStatus;

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [wishlist, setWishlist] = useState<Wishlist[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [actionModal, setActionModal] = useState<{ item: Wishlist; action: 'purchase' | 'cancel' } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    try {
      const [wishlistData, membersData] = await Promise.all([
        getWishlist(),
        getMembers(),
      ]);
      setWishlist(wishlistData);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleAction() {
    if (!actionModal) return;
    const { item, action } = actionModal;

    try {
      let result;
      if (action === 'purchase') {
        result = await purchaseWishlistItem(item.id);
      } else {
        result = await cancelWishlistItem(item.id);
      }

      if (result?.success) {
        await loadData();
        setActionModal(null);
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const filteredWishlist = wishlist
    .filter((item) => statusFilter === 'all' || item.status === statusFilter)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">欲しい物リスト</h1>
          <Link
            href="/wishlist/new"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + 追加
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="pending">検討中</option>
            <option value="purchased">購入済</option>
            <option value="cancelled">見送り</option>
          </select>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : filteredWishlist.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {filteredWishlist.map((item) => {
                const requester = memberMap.get(item.requesterId);
                return (
                  <li key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Link href={`/wishlist/detail?id=${item.id}`} className="flex-1">
                        <div className="flex items-center gap-3">
                          <PriorityBadge priority={item.priority} />
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <StatusBadge status={item.status} />
                              {item.priceRange && <span>{item.priceRange}</span>}
                              {requester && <span>@{requester.displayName}</span>}
                            </div>
                          </div>
                        </div>
                      </Link>
                      {item.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActionModal({ item, action: 'purchase' })}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded"
                          >
                            購入済
                          </button>
                          <button
                            onClick={() => setActionModal({ item, action: 'cancel' })}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            見送り
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            {statusFilter === 'pending'
              ? '検討中のアイテムはありません'
              : '条件に一致するアイテムがありません'}
          </div>
        )}
      </main>

      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {actionModal.action === 'purchase' ? '購入完了' : '見送り'}
            </h3>
            <p className="text-gray-600 mb-4">
              「{actionModal.item.name}」を
              {actionModal.action === 'purchase'
                ? '購入済にしますか？持ち物として自動登録されます。'
                : '見送りにしますか？'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleAction}
                className={`px-4 py-2 rounded-lg text-white ${
                  actionModal.action === 'purchase'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const config = {
    high: { label: '高', className: 'bg-red-100 text-red-800' },
    medium: { label: '中', className: 'bg-yellow-100 text-yellow-800' },
    low: { label: '低', className: 'bg-gray-100 text-gray-800' },
  };
  const { label, className } = config[priority];
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${className}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: WishlistStatus }) {
  const config = {
    pending: { label: '検討中', className: 'text-blue-600' },
    purchased: { label: '購入済', className: 'text-green-600' },
    cancelled: { label: '見送り', className: 'text-gray-600' },
  };
  const { label, className } = config[status];
  return <span className={className}>{label}</span>;
}
