'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { getItemTypes, getBoxes, getMembers, getTags, createItem, createItemType, getItem } from '@/lib/api';
import { ItemTypeSelector } from '@/components/common/ItemTypeSelector';
import type { ItemType, Box, User, Tag } from '@family-inventory/shared';

export default function NewItemClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateFromId = searchParams.get('templateFrom');

  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewItemType, setShowNewItemType] = useState(false);
  const [templateItemName, setTemplateItemName] = useState<string | null>(null);

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
  }, [user, templateFromId]);

  async function loadData() {
    try {
      const [typesData, boxesData, membersData, tagsData] = await Promise.all([
        getItemTypes(),
        getBoxes(),
        getMembers(),
        getTags(),
      ]);
      setItemTypes(typesData);
      setBoxes(boxesData);
      setMembers(membersData);
      setTags(tagsData);

      // テンプレートからのプリセット
      if (templateFromId) {
        const templateData = await getItem(templateFromId);
        if (templateData) {
          const { item, itemType } = templateData;
          setFormData({
            itemTypeId: item.itemTypeId,
            ownerId: '', // 所有者は自分にリセット
            boxId: item.boxId ?? '',
            memo: item.memo ?? '',
          });
          if (itemType) {
            setTemplateItemName(itemType.name);
          }
        }
      }
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {templateItemName ? `${templateItemName} を追加` : '持ち物を登録'}
          </h1>
          {templateItemName && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
              「{templateItemName}」の情報をもとに新しいアイテムを登録します。必要に応じて変更してください。
            </div>
          )}

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
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowNewItemType(true)}
                      className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      + 新規作成
                    </button>
                  </div>
                  <ItemTypeSelector
                    itemTypes={itemTypes}
                    availableTags={tags}
                    selectedId={formData.itemTypeId}
                    onChange={(itemTypeId) => setFormData((prev) => ({ ...prev, itemTypeId }))}
                  />
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
