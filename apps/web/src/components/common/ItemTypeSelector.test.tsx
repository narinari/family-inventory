import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemTypeSelector } from './ItemTypeSelector';
import type { ItemType, Tag } from '@family-inventory/shared';

const mockTags: Tag[] = [
  { id: 'tag-1', familyId: 'family-1', name: '衣類', createdAt: new Date(), updatedAt: new Date() },
  { id: 'tag-2', familyId: 'family-1', name: '文房具', createdAt: new Date(), updatedAt: new Date() },
];

const mockItemTypes: ItemType[] = [
  {
    id: 'type-1',
    familyId: 'family-1',
    name: 'Tシャツ',
    manufacturer: 'ユニクロ',
    tags: ['tag-1'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'type-2',
    familyId: 'family-1',
    name: 'パーカー',
    tags: ['tag-1'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'type-3',
    familyId: 'family-1',
    name: 'ボールペン',
    manufacturer: 'PILOT',
    tags: ['tag-2'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('ItemTypeSelector', () => {
  it('should render all item types', () => {
    render(
      <ItemTypeSelector
        itemTypes={mockItemTypes}
        availableTags={mockTags}
        selectedId=""
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Tシャツ')).toBeInTheDocument();
    expect(screen.getByText('パーカー')).toBeInTheDocument();
    expect(screen.getByText('ボールペン')).toBeInTheDocument();
    expect(screen.getByText('3 / 3 件')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <ItemTypeSelector
        itemTypes={[]}
        availableTags={[]}
        selectedId=""
        onChange={vi.fn()}
        loading={true}
      />
    );

    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('should filter by search query', async () => {
    const user = userEvent.setup();

    render(
      <ItemTypeSelector
        itemTypes={mockItemTypes}
        availableTags={mockTags}
        selectedId=""
        onChange={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('検索...');
    await user.type(searchInput, 'Tシャツ');

    expect(screen.getByText('Tシャツ')).toBeInTheDocument();
    expect(screen.queryByText('パーカー')).not.toBeInTheDocument();
    expect(screen.queryByText('ボールペン')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 3 件')).toBeInTheDocument();
  });

  it('should filter by manufacturer', async () => {
    const user = userEvent.setup();

    render(
      <ItemTypeSelector
        itemTypes={mockItemTypes}
        availableTags={mockTags}
        selectedId=""
        onChange={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('検索...');
    await user.type(searchInput, 'PILOT');

    expect(screen.getByText('ボールペン')).toBeInTheDocument();
    expect(screen.queryByText('Tシャツ')).not.toBeInTheDocument();
  });

  it('should filter by tag', async () => {
    const user = userEvent.setup();

    render(
      <ItemTypeSelector
        itemTypes={mockItemTypes}
        availableTags={mockTags}
        selectedId=""
        onChange={vi.fn()}
      />
    );

    const tagButton = screen.getByRole('button', { name: '衣類' });
    await user.click(tagButton);

    expect(screen.getByText('Tシャツ')).toBeInTheDocument();
    expect(screen.getByText('パーカー')).toBeInTheDocument();
    expect(screen.queryByText('ボールペン')).not.toBeInTheDocument();
    expect(screen.getByText('2 / 3 件')).toBeInTheDocument();
  });

  it('should call onChange when selecting an item type', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ItemTypeSelector
        itemTypes={mockItemTypes}
        availableTags={mockTags}
        selectedId=""
        onChange={onChange}
      />
    );

    const radio = screen.getByRole('radio', { name: /Tシャツ/ });
    await user.click(radio);

    expect(onChange).toHaveBeenCalledWith('type-1');
  });

  it('should show selected item type', () => {
    render(
      <ItemTypeSelector
        itemTypes={mockItemTypes}
        availableTags={mockTags}
        selectedId="type-2"
        onChange={vi.fn()}
      />
    );

    const radio = screen.getByRole('radio', { name: /パーカー/ });
    expect(radio).toBeChecked();
  });

  it('should clear filters when clicking clear button', async () => {
    const user = userEvent.setup();

    render(
      <ItemTypeSelector
        itemTypes={mockItemTypes}
        availableTags={mockTags}
        selectedId=""
        onChange={vi.fn()}
      />
    );

    // タグでフィルタ
    const tagButton = screen.getByRole('button', { name: '衣類' });
    await user.click(tagButton);
    expect(screen.getByText('2 / 3 件')).toBeInTheDocument();

    // クリアボタンをクリック
    const clearButton = screen.getByRole('button', { name: 'クリア' });
    await user.click(clearButton);

    expect(screen.getByText('3 / 3 件')).toBeInTheDocument();
  });

  it('should show empty message when no matches', async () => {
    const user = userEvent.setup();

    render(
      <ItemTypeSelector
        itemTypes={mockItemTypes}
        availableTags={mockTags}
        selectedId=""
        onChange={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('検索...');
    await user.type(searchInput, '存在しないアイテム');

    expect(screen.getByText('該当するアイテム種別がありません')).toBeInTheDocument();
  });
});
