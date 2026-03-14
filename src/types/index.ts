import { Request } from 'express';

export interface User {
  user_uuid: string;
  user_id: string;
  nickname: string;
  password: string;
  wallet_address: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface Nonce {
  id: string;
  wallet_address: string;
  nonce: string;
  created_at: number;
  expires_at: number;
}

export interface JWTPayload {
  user_uuid: string;
  user_id: string;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    lockedUntil?: number;
  };
}

export interface AuthRequest {
  user_id: string;
  password: string;
}

export interface SignupRequest {
  user_id: string;
  nickname: string;
  password: string;
  wallet_address?: string;
}

export interface UpdateUserRequest {
  nickname?: string;
  password?: string;
}

export interface WalletConnectRequest {
  wallet_address: string;
  signature: string;
  nonce: string;
}

export interface Project {
  project_uuid: string;
  owner_user_uuid: string;
  name: string;
  category: string | null;
  budget: number | null;
  deadline: number | null;
  team_requirements: string | null;
  detailed_description: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface CreateProjectRequest {
  name: string;
  category?: string;
  budget?: number;
  deadline?: number;
  team_requirements?: string;
  detailed_description?: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  category?: string;
  budget?: number;
  deadline?: number;
  team_requirements?: string;
  detailed_description?: string;
  description?: string;
}

export interface RequestWithUser extends Request {
  user?: JWTPayload;
}
