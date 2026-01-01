// ============================================
// ユーザー関連の型定義
// ============================================

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  discordId?: string;
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  photoURL?: string;
  inviteCode?: string;
}

export interface UpdateUserInput {
  displayName?: string;
  photoURL?: string;
  discordId?: string;
}

// ============================================
// 家族（グループ）関連の型定義
// ============================================

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// 招待コード関連の型定義
// ============================================

export type InviteCodeStatus = 'active' | 'used' | 'expired';

export interface InviteCode {
  id: string;
  code: string;
  familyId: string;
  createdBy: string;
  status: InviteCodeStatus;
  usedBy?: string;
  usedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateInviteCodeInput {
  expiresInDays?: number;
}

export interface InviteCodeValidation {
  valid: boolean;
  familyId?: string;
  error?: string;
}

// ============================================
// 認証関連の型定義
// ============================================

export interface AuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
}

export interface LoginResponse {
  user: User;
  isNewUser: boolean;
  needsInviteCode: boolean;
}

export interface DiscordLinkRequest {
  discordAccessToken: string;
}

// ============================================
// API レスポンス型
// ============================================

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ============================================
// エラーコード
// ============================================

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVITE_CODE_INVALID: 'INVITE_CODE_INVALID',
  INVITE_CODE_EXPIRED: 'INVITE_CODE_EXPIRED',
  INVITE_CODE_USED: 'INVITE_CODE_USED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  FORBIDDEN: 'FORBIDDEN',
  NOT_ADMIN: 'NOT_ADMIN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DISCORD_NOT_CONFIGURED: 'DISCORD_NOT_CONFIGURED',
  DISCORD_OAUTH_FAILED: 'DISCORD_OAUTH_FAILED',
  DISCORD_ALREADY_LINKED: 'DISCORD_ALREADY_LINKED',
  DISCORD_NOT_LINKED: 'DISCORD_NOT_LINKED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
