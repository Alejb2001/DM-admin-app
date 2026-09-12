export interface SessionScene {
  id: string;
  sessionId: string;
  name: string;
  backgroundUrl: string | null;
  gridSize: number;
  gridEnabled: boolean;
  isActive: boolean;
  fogEnabled: boolean;
}

export interface TokenConditionInfo {
  id: string;
  condition: string;
}

export interface MapToken {
  id: string;
  sceneId: string;
  entityId: string | null;
  label: string;
  imageUrl: string | null;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isVisible: boolean;
  controlledBy: string | null;
  conditions: TokenConditionInfo[];
}

export interface TokenMovedEvent {
  tokenId: string;
  x: number;
  y: number;
}
