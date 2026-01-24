'use client';

import { useMemo, useState } from 'react';
import type { ItemType, Tag } from '@family-inventory/shared';

interface ItemTypeSelectorProps {
  itemTypes: ItemType[];
  availableTags: Tag[];
  selectedId: string;
  onChange: (itemTypeId: string) => void;
  loading?: boolean;
}

export function ItemTypeSelector({
  itemTypes,
  availableTags,
  selectedId,
  onChange,
  loading,
}: ItemTypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTagIds([]);
  };

  const filteredItemTypes = useMemo(() => {
    return itemTypes.filter((type) => {
      // タグフィルタ: 選択されたタグを全て持つもの
      const matchesTags =
        selectedTagIds.length === 0 ||
        selectedTagIds.every((tagId) => type.tags.includes(tagId));

      // 検索フィルタ: 名前またはメーカーに部分一致
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        type.name.toLowerCase().includes(query) ||
        type.manufacturer?.toLowerCase().includes(query);

      return matchesTags && matchesSearch;
    });
  }, [itemTypes, selectedTagIds, searchQuery]);

  // タグIDから名前へのマップを作成
  const tagNameMap = useMemo(() => {
    const map = new Map<string, string>();
    availableTags.forEach((tag) => map.set(tag.id, tag.name));
    return map;
  }, [availableTags]);

  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-200 rounded-lg" />;
  }

  const hasActiveFilters = searchQuery || selectedTagIds.length > 0;

  return (
    <div className="space-y-3">
      {/* タグフィルタ */}
      {availableTags.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">タグでフィルタ</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                クリア
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 検索入力 */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="検索..."
          aria-label="アイテム種別を検索"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* 候補リスト */}
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
        {filteredItemTypes.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            該当するアイテム種別がありません
          </div>
        ) : (
          filteredItemTypes.map((type) => {
            const isSelected = selectedId === type.id;
            const typeTags = type.tags
              .map((tagId) => tagNameMap.get(tagId))
              .filter(Boolean);

            return (
              <label
                key={type.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                  isSelected ? 'bg-primary-50' : ''
                }`}
              >
                <input
                  type="radio"
                  name="itemType"
                  value={type.id}
                  checked={isSelected}
                  onChange={() => onChange(type.id)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {type.name}
                  </div>
                  {type.manufacturer && (
                    <div className="text-xs text-gray-500 truncate">
                      {type.manufacturer}
                    </div>
                  )}
                </div>
                {typeTags.length > 0 && (
                  <div className="flex gap-1 flex-shrink-0">
                    {typeTags.slice(0, 2).map((tagName) => (
                      <span
                        key={tagName}
                        className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {tagName}
                      </span>
                    ))}
                    {typeTags.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{typeTags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </label>
            );
          })
        )}
      </div>

      {/* 候補数 */}
      <div className="text-xs text-gray-500">
        {filteredItemTypes.length} / {itemTypes.length} 件
      </div>
    </div>
  );
}
