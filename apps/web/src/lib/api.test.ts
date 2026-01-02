import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getItems,
  getItemTypes,
  getBoxes,
  getLocations,
  getTags,
  getWishlist,
  getMembers,
  createItem,
  updateItem,
  consumeItem,
  giveItem,
  sellItem,
  createBox,
  updateBox,
  deleteBox,
  createLocation,
  updateLocation,
  deleteLocation,
  createTag,
  deleteTag,
  createWishlistItem,
  updateWishlistItem,
  purchaseWishlistItem,
  cancelWishlistItem,
  createItemType,
  updateItemType,
  deleteItemType,
  updateProfile,
  createInviteCode,
  getInviteCodes,
} from './api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('./firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
}));

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getItems', () => {
    it('should fetch items without filter', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { items: [{ id: '1', status: 'owned' }] } }),
      });

      const result = await getItems();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/items',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should fetch items with status filter', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { items: [] } }),
      });

      await getItems({ status: 'owned' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/items?status=owned',
        expect.any(Object)
      );
    });

    it('should return empty array on error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: { code: 'ERROR' } }),
      });

      const result = await getItems();
      expect(result).toEqual([]);
    });
  });

  describe('getItemTypes', () => {
    it('should fetch item types', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { itemTypes: [{ id: '1', name: 'Test' }] } }),
      });

      const result = await getItemTypes();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/item-types',
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getBoxes', () => {
    it('should fetch boxes', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { boxes: [{ id: '1', name: 'Box 1' }] } }),
      });

      const result = await getBoxes();
      expect(result).toHaveLength(1);
    });
  });

  describe('getLocations', () => {
    it('should fetch locations', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { locations: [{ id: '1', name: 'Location 1' }] } }),
      });

      const result = await getLocations();
      expect(result).toHaveLength(1);
    });
  });

  describe('getTags', () => {
    it('should fetch tags', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { tags: [{ id: '1', name: 'Tag 1' }] } }),
      });

      const result = await getTags();
      expect(result).toHaveLength(1);
    });
  });

  describe('getWishlist', () => {
    it('should fetch wishlist without filter', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { wishlist: [{ id: '1', name: 'Wish 1' }] } }),
      });

      const result = await getWishlist();
      expect(result).toHaveLength(1);
    });

    it('should fetch wishlist with status filter', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { wishlist: [] } }),
      });

      await getWishlist({ status: 'pending' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/wishlist?status=pending',
        expect.any(Object)
      );
    });
  });

  describe('getMembers', () => {
    it('should fetch members', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { members: [{ id: '1', displayName: 'User 1' }] } }),
      });

      const result = await getMembers();
      expect(result).toHaveLength(1);
    });
  });

  describe('createItem', () => {
    it('should create item', async () => {
      const newItem = { itemTypeId: 'type1' };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { item: { id: '1', ...newItem } } }),
      });

      const result = await createItem(newItem);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newItem),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('updateItem', () => {
    it('should update item', async () => {
      const updates = { memo: 'Updated' };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { item: { id: '1', ...updates } } }),
      });

      const result = await updateItem('1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/items/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('consumeItem', () => {
    it('should consume item', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { item: { id: '1', status: 'consumed' } } }),
      });

      const result = await consumeItem('1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/items/1/consume',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('giveItem', () => {
    it('should give item', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { item: { id: '1', status: 'given' } } }),
      });

      const result = await giveItem('1', 'Someone');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/items/1/give',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ givenTo: 'Someone' }),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('sellItem', () => {
    it('should sell item', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { item: { id: '1', status: 'sold' } } }),
      });

      const result = await sellItem('1', 'Buyer', 1000);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/items/1/sell',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ soldTo: 'Buyer', soldPrice: 1000 }),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Box CRUD', () => {
    it('should create box', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { box: { id: '1', name: 'New Box' } } }),
      });

      const result = await createBox({ name: 'New Box' });
      expect(result.success).toBe(true);
    });

    it('should update box', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { box: { id: '1', name: 'Updated' } } }),
      });

      const result = await updateBox('1', { name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should delete box', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { message: 'Deleted' } }),
      });

      const result = await deleteBox('1');
      expect(result.success).toBe(true);
    });
  });

  describe('Location CRUD', () => {
    it('should create location', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { location: { id: '1', name: 'New Location' } } }),
      });

      const result = await createLocation({ name: 'New Location' });
      expect(result.success).toBe(true);
    });

    it('should update location', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { location: { id: '1', name: 'Updated' } } }),
      });

      const result = await updateLocation('1', { name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should delete location', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { message: 'Deleted' } }),
      });

      const result = await deleteLocation('1');
      expect(result.success).toBe(true);
    });
  });

  describe('Tag CRUD', () => {
    it('should create tag', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { tag: { id: '1', name: 'New Tag' } } }),
      });

      const result = await createTag({ name: 'New Tag' });
      expect(result.success).toBe(true);
    });

    it('should delete tag', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { message: 'Deleted' } }),
      });

      const result = await deleteTag('1');
      expect(result.success).toBe(true);
    });
  });

  describe('Wishlist CRUD', () => {
    it('should create wishlist item', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { wishlist: { id: '1', name: 'New Wish' } } }),
      });

      const result = await createWishlistItem({ name: 'New Wish' });
      expect(result.success).toBe(true);
    });

    it('should update wishlist item', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { wishlist: { id: '1', name: 'Updated' } } }),
      });

      const result = await updateWishlistItem('1', { name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should purchase wishlist item', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { wishlist: { id: '1' }, item: { id: '2' } } }),
      });

      const result = await purchaseWishlistItem('1');
      expect(result.success).toBe(true);
    });

    it('should cancel wishlist item', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { wishlist: { id: '1', status: 'cancelled' } } }),
      });

      const result = await cancelWishlistItem('1');
      expect(result.success).toBe(true);
    });
  });

  describe('ItemType CRUD', () => {
    it('should create item type', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { itemType: { id: '1', name: 'New Type' } } }),
      });

      const result = await createItemType({ name: 'New Type' });
      expect(result.success).toBe(true);
    });

    it('should update item type', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { itemType: { id: '1', name: 'Updated' } } }),
      });

      const result = await updateItemType('1', { name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should delete item type', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { message: 'Deleted' } }),
      });

      const result = await deleteItemType('1');
      expect(result.success).toBe(true);
    });
  });

  describe('User functions', () => {
    it('should update profile', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { user: { id: '1', displayName: 'Updated' } } }),
      });

      const result = await updateProfile({ displayName: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should create invite code', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { inviteCode: { code: 'ABC123' } } }),
      });

      const result = await createInviteCode(7);
      expect(result.success).toBe(true);
    });

    it('should get invite codes', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { inviteCodes: [{ code: 'ABC123' }] } }),
      });

      const result = await getInviteCodes();
      expect(result).toHaveLength(1);
    });
  });
});
