import { auth } from './firebase';
import type {
  Item,
  ItemType,
  Box,
  Location,
  Tag,
  Wishlist,
  WishlistStatus,
  CreateItemInput,
  UpdateItemInput,
  CreateItemTypeInput,
  UpdateItemTypeInput,
  CreateBoxInput,
  UpdateBoxInput,
  CreateLocationInput,
  UpdateLocationInput,
  CreateTagInput,
  CreateWishlistInput,
  UpdateWishlistInput,
  User,
} from '@family-inventory/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
  return response.json();
}

export async function getItems(filter?: { status?: string }): Promise<Item[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  const query = params.toString();
  const path = query ? `/items?${query}` : '/items';
  const res = await fetchWithAuth<{ items: Item[] }>(path);
  return res.data?.items ?? [];
}

export async function getItemTypes(): Promise<ItemType[]> {
  const res = await fetchWithAuth<{ itemTypes: ItemType[] }>('/item-types');
  return res.data?.itemTypes ?? [];
}

export async function getBoxes(): Promise<Box[]> {
  const res = await fetchWithAuth<{ boxes: Box[] }>('/boxes');
  return res.data?.boxes ?? [];
}

export async function getWishlist(filter?: { status?: WishlistStatus }): Promise<Wishlist[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  const query = params.toString();
  const path = query ? `/wishlist?${query}` : '/wishlist';
  const res = await fetchWithAuth<{ wishlist: Wishlist[] }>(path);
  return res.data?.wishlist ?? [];
}

// Items CRUD
export async function getItem(id: string): Promise<Item | null> {
  const res = await fetchWithAuth<{ item: Item }>(`/items/${id}`);
  return res.data?.item ?? null;
}

export async function createItem(input: CreateItemInput): Promise<ApiResponse<{ item: Item }>> {
  return fetchWithAuth('/items', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateItem(id: string, input: UpdateItemInput): Promise<ApiResponse<{ item: Item }>> {
  return fetchWithAuth(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function consumeItem(id: string): Promise<ApiResponse<{ item: Item }>> {
  return fetchWithAuth(`/items/${id}/consume`, { method: 'POST' });
}

export async function giveItem(id: string, givenTo: string): Promise<ApiResponse<{ item: Item }>> {
  return fetchWithAuth(`/items/${id}/give`, {
    method: 'POST',
    body: JSON.stringify({ givenTo }),
  });
}

export async function sellItem(id: string, soldTo?: string, soldPrice?: number): Promise<ApiResponse<{ item: Item }>> {
  return fetchWithAuth(`/items/${id}/sell`, {
    method: 'POST',
    body: JSON.stringify({ soldTo, soldPrice }),
  });
}

// ItemTypes CRUD
export async function createItemType(input: CreateItemTypeInput): Promise<ApiResponse<{ itemType: ItemType }>> {
  return fetchWithAuth('/item-types', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateItemType(id: string, input: UpdateItemTypeInput): Promise<ApiResponse<{ itemType: ItemType }>> {
  return fetchWithAuth(`/item-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteItemType(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth(`/item-types/${id}`, { method: 'DELETE' });
}

// Boxes CRUD
export async function getBox(id: string): Promise<Box | null> {
  const res = await fetchWithAuth<{ box: Box }>(`/boxes/${id}`);
  return res.data?.box ?? null;
}

export async function createBox(input: CreateBoxInput): Promise<ApiResponse<{ box: Box }>> {
  return fetchWithAuth('/boxes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateBox(id: string, input: UpdateBoxInput): Promise<ApiResponse<{ box: Box }>> {
  return fetchWithAuth(`/boxes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteBox(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth(`/boxes/${id}`, { method: 'DELETE' });
}

export async function getBoxItems(id: string): Promise<{ box: Box; items: Item[] } | null> {
  const res = await fetchWithAuth<{ box: Box; items: Item[] }>(`/boxes/${id}/items`);
  return res.data ?? null;
}

// Locations CRUD
export async function getLocations(): Promise<Location[]> {
  const res = await fetchWithAuth<{ locations: Location[] }>('/locations');
  return res.data?.locations ?? [];
}

export async function createLocation(input: CreateLocationInput): Promise<ApiResponse<{ location: Location }>> {
  return fetchWithAuth('/locations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateLocation(id: string, input: UpdateLocationInput): Promise<ApiResponse<{ location: Location }>> {
  return fetchWithAuth(`/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteLocation(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth(`/locations/${id}`, { method: 'DELETE' });
}

export async function getLocationBoxes(id: string): Promise<{ location: Location; boxes: Box[] } | null> {
  const res = await fetchWithAuth<{ location: Location; boxes: Box[] }>(`/locations/${id}/boxes`);
  return res.data ?? null;
}

// Tags CRUD
export async function getTags(): Promise<Tag[]> {
  const res = await fetchWithAuth<{ tags: Tag[] }>('/tags');
  return res.data?.tags ?? [];
}

export async function createTag(input: CreateTagInput): Promise<ApiResponse<{ tag: Tag }>> {
  return fetchWithAuth('/tags', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteTag(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchWithAuth(`/tags/${id}`, { method: 'DELETE' });
}

// Wishlist CRUD
export async function getWishlistItem(id: string): Promise<Wishlist | null> {
  const res = await fetchWithAuth<{ wishlist: Wishlist }>(`/wishlist/${id}`);
  return res.data?.wishlist ?? null;
}

export async function createWishlistItem(input: CreateWishlistInput): Promise<ApiResponse<{ wishlist: Wishlist }>> {
  return fetchWithAuth('/wishlist', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateWishlistItem(id: string, input: UpdateWishlistInput): Promise<ApiResponse<{ wishlist: Wishlist }>> {
  return fetchWithAuth(`/wishlist/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function purchaseWishlistItem(id: string): Promise<ApiResponse<{ wishlist: Wishlist; item: Item }>> {
  return fetchWithAuth(`/wishlist/${id}/purchase`, { method: 'POST' });
}

export async function cancelWishlistItem(id: string): Promise<ApiResponse<{ wishlist: Wishlist }>> {
  return fetchWithAuth(`/wishlist/${id}/cancel`, { method: 'POST' });
}

// Users
export async function getMembers(): Promise<User[]> {
  const res = await fetchWithAuth<{ members: User[] }>('/auth/members');
  return res.data?.members ?? [];
}
