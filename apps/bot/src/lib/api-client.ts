import type {
  User,
  Item,
  ItemType,
  Box,
  Location,
  Wishlist,
  ItemLocation,
} from '@family-inventory/shared';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
}

interface GetUserByDiscordIdResponse {
  user: User;
}

interface ItemWithType extends Item {
  itemTypeName: string;
}

interface BoxWithLocation extends Box {
  locationName?: string;
}

interface GetItemsResponse {
  items: ItemWithType[];
}

interface GetItemTypesResponse {
  itemTypes: ItemType[];
}

interface GetBoxesResponse {
  boxes: BoxWithLocation[];
}

interface GetBoxItemsResponse {
  box: Box;
  items: ItemWithType[];
}

interface GetLocationsResponse {
  locations: Location[];
}

interface GetLocationBoxesResponse {
  location: Location;
  boxes: Box[];
}

interface GetWishlistResponse {
  wishlist: Wishlist[];
}

interface CreateItemResponse {
  item: ItemWithType;
}

interface CreateWishlistResponse {
  wishlist: Wishlist;
}

interface PurchaseWishlistResponse {
  wishlist: Wishlist;
  item: Item;
}

interface SearchResult {
  item: ItemWithType;
  box?: Box;
  location?: Location;
}

interface SearchResponse {
  results: SearchResult[];
}

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json() as ApiResponse<T>;
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }

  async getUserByDiscordId(discordId: string): Promise<User | null> {
    const response = await this.get<GetUserByDiscordIdResponse>(`/auth/discord/user/${discordId}`);
    if (response.success && response.data) {
      return response.data.user;
    }
    return null;
  }

  // ============================================
  // Items API
  // ============================================

  async getItems(discordId: string, status?: string): Promise<ItemWithType[]> {
    const params = new URLSearchParams({ discordId });
    if (status) params.set('status', status);
    const response = await this.get<GetItemsResponse>(`/bot/items?${params}`);
    return response.success && response.data ? response.data.items : [];
  }

  async createItem(
    discordId: string,
    input: { itemTypeName?: string; itemTypeId?: string; boxId?: string; memo?: string }
  ): Promise<ItemWithType | null> {
    const response = await this.post<CreateItemResponse>('/bot/items', { discordId, ...input });
    return response.success && response.data ? response.data.item : null;
  }

  async consumeItem(discordId: string, itemId: string): Promise<boolean> {
    const response = await this.post(`/bot/items/${itemId}/consume`, { discordId });
    return response.success;
  }

  async giveItem(discordId: string, itemId: string, givenTo: string): Promise<boolean> {
    const response = await this.post(`/bot/items/${itemId}/give`, { discordId, givenTo });
    return response.success;
  }

  async sellItem(
    discordId: string,
    itemId: string,
    soldTo?: string,
    soldPrice?: number
  ): Promise<boolean> {
    const response = await this.post(`/bot/items/${itemId}/sell`, { discordId, soldTo, soldPrice });
    return response.success;
  }

  async searchItems(discordId: string, query: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ discordId, q: query });
    const response = await this.get<SearchResponse>(`/bot/search?${params}`);
    return response.success && response.data ? response.data.results : [];
  }

  async getItemLocation(discordId: string, itemId: string): Promise<ItemLocation | null> {
    const params = new URLSearchParams({ discordId });
    const response = await this.get<ItemLocation>(`/bot/items/${itemId}/location?${params}`);
    return response.success && response.data ? response.data : null;
  }

  // ============================================
  // Item Types API
  // ============================================

  async getItemTypes(discordId: string): Promise<ItemType[]> {
    const params = new URLSearchParams({ discordId });
    const response = await this.get<GetItemTypesResponse>(`/bot/item-types?${params}`);
    return response.success && response.data ? response.data.itemTypes : [];
  }

  // ============================================
  // Boxes API
  // ============================================

  async getBoxes(discordId: string): Promise<BoxWithLocation[]> {
    const params = new URLSearchParams({ discordId });
    const response = await this.get<GetBoxesResponse>(`/bot/boxes?${params}`);
    return response.success && response.data ? response.data.boxes : [];
  }

  async getBoxItems(discordId: string, boxId: string): Promise<GetBoxItemsResponse | null> {
    const params = new URLSearchParams({ discordId });
    const response = await this.get<GetBoxItemsResponse>(`/bot/boxes/${boxId}/items?${params}`);
    return response.success && response.data ? response.data : null;
  }

  // ============================================
  // Locations API
  // ============================================

  async getLocations(discordId: string): Promise<Location[]> {
    const params = new URLSearchParams({ discordId });
    const response = await this.get<GetLocationsResponse>(`/bot/locations?${params}`);
    return response.success && response.data ? response.data.locations : [];
  }

  async getLocationBoxes(discordId: string, locationId: string): Promise<GetLocationBoxesResponse | null> {
    const params = new URLSearchParams({ discordId });
    const response = await this.get<GetLocationBoxesResponse>(`/bot/locations/${locationId}/boxes?${params}`);
    return response.success && response.data ? response.data : null;
  }

  // ============================================
  // Wishlist API
  // ============================================

  async getWishlist(discordId: string, status?: string): Promise<Wishlist[]> {
    const params = new URLSearchParams({ discordId });
    if (status) params.set('status', status);
    const response = await this.get<GetWishlistResponse>(`/bot/wishlist?${params}`);
    return response.success && response.data ? response.data.wishlist : [];
  }

  async createWishlistItem(
    discordId: string,
    input: { name: string; priority?: 'high' | 'medium' | 'low'; memo?: string; url?: string }
  ): Promise<Wishlist | null> {
    const response = await this.post<CreateWishlistResponse>('/bot/wishlist', { discordId, ...input });
    return response.success && response.data ? response.data.wishlist : null;
  }

  async purchaseWishlistItem(discordId: string, wishlistId: string): Promise<PurchaseWishlistResponse | null> {
    const response = await this.post<PurchaseWishlistResponse>(`/bot/wishlist/${wishlistId}/purchase`, {
      discordId,
    });
    return response.success && response.data ? response.data : null;
  }

  async cancelWishlistItem(discordId: string, wishlistId: string): Promise<boolean> {
    const response = await this.post(`/bot/wishlist/${wishlistId}/cancel`, { discordId });
    return response.success;
  }

  async searchWishlist(discordId: string, query: string): Promise<Wishlist[]> {
    const params = new URLSearchParams({ discordId, q: query });
    const response = await this.get<GetWishlistResponse>(`/bot/wishlist/search?${params}`);
    return response.success && response.data ? response.data.wishlist : [];
  }
}

// Factory function for creating configured API client
export function createApiClient(): ApiClient {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080';
  const apiKey = process.env.BOT_API_KEY;

  return new ApiClient({ baseUrl, apiKey });
}

export const apiClient = createApiClient();
