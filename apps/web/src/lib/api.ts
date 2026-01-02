import { auth } from './firebase';
import type {
  Item,
  ItemType,
  Box,
  Wishlist,
  WishlistStatus,
} from '@family-inventory/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ApiResponse<T> {
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
