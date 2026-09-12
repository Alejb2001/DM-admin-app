import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FogZone, InitiativeEntry } from '../models/vtt-advanced.models';
import { TokenConditionInfo } from '../models/map.models';

@Injectable({ providedIn: 'root' })
export class VttAdvancedService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private sessionBase(cid: string, sid: string) {
    return `${this.base}/campaigns/${cid}/sessions/${sid}`;
  }

  private sceneBase(cid: string, sid: string, sceneId: string) {
    return `${this.sessionBase(cid, sid)}/scenes/${sceneId}`;
  }

  // ── Fog ────────────────────────────────────────────────────────────────────

  getFogZones(cid: string, sid: string, sceneId: string) {
    return this.http.get<FogZone[]>(`${this.sceneBase(cid, sid, sceneId)}/fog`);
  }

  addFogZone(cid: string, sid: string, sceneId: string, dto: {
    shape: string; x: number; y: number;
    width?: number; height?: number; radius?: number;
  }) {
    return this.http.post<FogZone>(`${this.sceneBase(cid, sid, sceneId)}/fog/zones`, dto);
  }

  removeFogZone(cid: string, sid: string, sceneId: string, zoneId: string) {
    return this.http.delete(`${this.sceneBase(cid, sid, sceneId)}/fog/zones/${zoneId}`);
  }

  clearFog(cid: string, sid: string, sceneId: string) {
    return this.http.delete(`${this.sceneBase(cid, sid, sceneId)}/fog/zones`);
  }

  toggleFog(cid: string, sid: string, sceneId: string, fogEnabled: boolean) {
    return this.http.patch(`${this.sceneBase(cid, sid, sceneId)}/fog/toggle`, { fogEnabled });
  }

  // ── Initiative ─────────────────────────────────────────────────────────────

  getInitiative(cid: string, sid: string) {
    return this.http.get<InitiativeEntry[]>(`${this.sessionBase(cid, sid)}/initiative`);
  }

  addInitiativeEntry(cid: string, sid: string, dto: { tokenId?: string; name: string; initiative: number }) {
    return this.http.post<InitiativeEntry[]>(`${this.sessionBase(cid, sid)}/initiative`, dto);
  }

  reorderInitiative(cid: string, sid: string, orderedIds: string[]) {
    return this.http.patch<InitiativeEntry[]>(
      `${this.sessionBase(cid, sid)}/initiative/order`, { orderedIds });
  }

  setActiveEntry(cid: string, sid: string, entryId: string) {
    return this.http.post<InitiativeEntry[]>(
      `${this.sessionBase(cid, sid)}/initiative/${entryId}/activate`, {});
  }

  removeInitiativeEntry(cid: string, sid: string, entryId: string) {
    return this.http.delete<InitiativeEntry[]>(
      `${this.sessionBase(cid, sid)}/initiative/${entryId}`);
  }

  clearInitiative(cid: string, sid: string) {
    return this.http.delete(`${this.sessionBase(cid, sid)}/initiative`);
  }

  // ── Token Conditions ───────────────────────────────────────────────────────

  addCondition(cid: string, sid: string, sceneId: string, tokenId: string, condition: string) {
    return this.http.post<TokenConditionInfo[]>(
      `${this.sceneBase(cid, sid, sceneId)}/tokens/${tokenId}/conditions`,
      { condition });
  }

  removeCondition(cid: string, sid: string, sceneId: string, tokenId: string, conditionId: string) {
    return this.http.delete<TokenConditionInfo[]>(
      `${this.sceneBase(cid, sid, sceneId)}/tokens/${tokenId}/conditions/${conditionId}`);
  }
}
