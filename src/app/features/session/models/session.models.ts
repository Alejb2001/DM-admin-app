export interface GameSession {
  id: string;
  name: string;
  createdBy: string;
  createdById: string;
  startedAt: string;
  endedAt: string | null;
  status: 'active' | 'ended';
}

export type ChatMessageType = 'chat' | 'narration' | 'roll' | 'secret_roll' | 'system';

export interface DiceResult {
  formula: string;
  label: string | null;
  modifier: number;
  advantage: 'ventaja' | 'desventaja' | null;
  rolls: number[];
  kept: number[];
  total: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userDisplayName: string;
  type: ChatMessageType;
  content: string;
  diceResult: DiceResult | null;
  isSecret: boolean;
  createdAt: string;
}

export interface GameSessionDetail {
  session: GameSession;
  recentMessages: ChatMessage[];
}

export interface SendMessageRequest {
  type: ChatMessageType;
  content: string;
  isSecret: boolean;
}

export interface SessionPresenceEntry {
  userId: string;
  displayName: string;
}
