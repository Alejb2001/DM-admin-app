export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  userRole: string;
}

export interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  members: Member[];
  roles: CampaignRole[];
}

export interface Member {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  roleId: string;
  roleName: string;
  joinedAt: string;
}

export interface CampaignRole {
  id: string;
  name: string;
  isSystemDefault: boolean;
}

export interface Invitation {
  id: string;
  token: string;
  roleName: string;
  expiresAt: string;
}

export interface LimitError {
  error: string;
  limit: string;
  current: number;
  max: number;
  requiredTier: string;
}
