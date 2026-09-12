export interface FogZone {
  id: string;
  sceneId: string;
  shape: 'rect' | 'circle';
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  radius: number | null;
}

export interface FogToggledEvent {
  sceneId: string;
  fogEnabled: boolean;
}

export interface InitiativeEntry {
  id: string;
  sessionId: string;
  tokenId: string | null;
  name: string;
  initiative: number;
  sortOrder: number;
  isActive: boolean;
}

export interface ConditionChangedEvent {
  tokenId: string;
  conditions: { id: string; condition: string }[];
}
