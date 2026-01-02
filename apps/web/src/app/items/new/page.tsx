'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getItemTypes, getBoxes, getMembers, createItem, createItemType } from '@/lib/api';
import type { ItemType, Box, User } from '@family-inventory/shared';

export default function NewItemPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewItemType, setShowNewItemType] = useState(false);

  const [formData, setFormData] = useState({
    itemTypeId: '',
    ownerId: '',
    boxId: '',
    memo: '',
  });

  const [newItemTypeName, setNewItemTypeName] = useState('');

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
      const [typesData, boxesData, membersData] = await Promise.all([
        getItemTypes(),
        getBoxes(),
        getMembers(),
      ]);
      setItemTypes(typesData);
      setBoxes(boxesData);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.itemTypeId) {
      setError('アイテム種別を選択してください');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await createItem({
        itemTypeId: formData.itemTypeId,
        ownerId: formData.ownerId || undefined,
        boxId: formData.boxId || undefined,
        memo: formData.memo || undefined,
      });

      if (result.success) {
        router.push('/items');
      } else {
        setError(result.error?.message ?? '登録に失敗しました');
      }
    } catch {
      setError('登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateItemType() {
    if (!newItemTypeName.trim()) return;

    try {
      const result = await createItemType({ name: newItemTypeName.trim() });
      if (result.success && result.data) {
        setItemTypes((prev) => [...prev, result.data!.itemType]);
        setFormData((prev) => ({ ...prev, itemTypeId: result.data!.itemType.id }));
        setNewItemTypeName('');
        setShowNewItemType(false);
      }
    } catch (err) {
      console.error('Failed to create item type:', err);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/items" className="text-primary-600 hover:text-primary-700">
            ← 持ち物一覧に戻る
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">持ち物を登録</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アイテム種別 <span className="text-red-500">*</span>
              </label>
              {dataLoading ? (
                <div className="animate-pulse h-10 bg-gray-200 rounded-lg" />
              ) : showNewItemType ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemTypeName}
                    onChange={(e) => setNewItemTypeName(e.target.value)}
                    placeholder="新しいアイテム種別名"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleCreateItemType}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewItemType(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={formData.itemTypeId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, itemTypeId: e.target.value }))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">選択してください</option>
                    {itemTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewItemType(true)}
                    className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    + 新規
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所有者
              </label>
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData((prev) => ({ ...prev, ownerId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">自分</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                保管場所（箱）
              </label>
              <select
                value={formData.boxId}
                onChange={(e) => setFormData((prev) => ({ ...prev, boxId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">未設定</option>
                {boxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メモ
              </label>
              <textarea
                value={formData.memo}
                onChange={(e) => setFormData((prev) => ({ ...prev, memo: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="メモを入力..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Link
                href="/items"
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? '登録中...' : '登録する'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
