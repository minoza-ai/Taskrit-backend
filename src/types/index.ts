import { Request } from 'express';

export interface User {
  user_uuid: string;
  user_id: string;
  nickname: string;
  password: string;
  profile_image_url?: string;
  profile_bio: string;
  capabilities: string[];
  wallet_address: string | null;
  otp_enabled: boolean;
  otp_secret: string | null;
  otp_pending_secret: string | null;
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
  profile_bio?: string;
  wallet_address?: string;
}

export interface UpdateUserRequest {
  nickname?: string;
  password?: string;
  profile_bio?: string;
  capabilities?: string[];
}

export interface WalletConnectRequest {
  wallet_address: string;
  signature: string;
  nonce: string;
  message?: string;
  signature_encoding?: 'base58' | 'base64' | 'hex';
  otp_code?: string;
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

export type ProjectSubmissionStatus = 'submitted' | 'approved' | 'rejected';

export interface ProjectSubmission {
  submission_uuid: string;
  project_uuid: string;
  submitter_user_uuid: string;
  title: string;
  description: string | null;
  artifact_url: string | null;
  status: ProjectSubmissionStatus;
  settlement_amount: number | null;
  settlement_signature: string | null;
  created_at: number;
  updated_at: number;
  settled_at: number | null;
}

export interface CreateProjectSubmissionRequest {
  title: string;
  description?: string;
  artifact_url?: string;
}

export interface ApproveProjectSubmissionRequest {
  settlement_amount?: number;
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

export interface TeamingMatchSuggestRequest {
  request: string;
  requiredDate?: number;
  requiredElo?: number;
  requiredCost?: number;
  requireHuman?: boolean;
  maxCost?: number;
}

export interface TeamingMatchCandidate {
  accountId: string;
  accountType: string;
  displayName?: string;
  abilityText: string;
  similarity: number;
  score: number;
  linkedAssetId?: string | null;
}

export interface TeamingMatchResult {
  taskId: string;
  requiredAbility: string;
  candidates: TeamingMatchCandidate[];
}

export interface RequestWithUser extends Request {
  user?: JWTPayload;
}
