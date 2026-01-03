'use client';

import type { Tag } from '@family-inventory/shared';

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  loading?: boolean;
}

export function TagSelector({
  availableTags,
  selectedTagIds,
  onChange,
  loading,
}: TagSelectorProps) {
  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">タグを読み込み中...</div>;
  }

  if (availableTags.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        タグがまだありません。
        <a href="/settings/tags" className="text-blue-600 hover:underline ml-1">
          タグを作成
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableTags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
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
  );
}
