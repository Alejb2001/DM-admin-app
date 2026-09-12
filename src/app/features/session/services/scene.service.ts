import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SessionScene, MapToken } from '../models/map.models';

@Injectable({ providedIn: 'root' })
export class SceneService {
  private http = inject(HttpClient);

  private base(campaignId: string, sessionId: string) {
    return `${environment.apiUrl}/campaigns/${campaignId}/sessions/${sessionId}/scenes`;
  }

  // ── Scenes ─────────────────────────────────────────────────────────────────

  getScenes(campaignId: string, sessionId: string): Observable<SessionScene[]> {
    return this.http.get<SessionScene[]>(this.base(campaignId, sessionId));
  }

  createScene(campaignId: string, sessionId: string, dto: {
    name: string; backgroundUrl?: string | null; gridSize: number; gridEnabled: boolean;
  }): Observable<SessionScene> {
    return this.http.post<SessionScene>(this.base(campaignId, sessionId), dto);
  }

  updateScene(campaignId: string, sessionId: string, sceneId: string, dto: {
    name: string; backgroundUrl?: string | null; gridSize: number; gridEnabled: boolean;
  }): Observable<SessionScene> {
    return this.http.put<SessionScene>(`${this.base(campaignId, sessionId)}/${sceneId}`, dto);
  }

  activateScene(campaignId: string, sessionId: string, sceneId: string): Observable<SessionScene> {
    return this.http.post<SessionScene>(`${this.base(campaignId, sessionId)}/${sceneId}/activate`, {});
  }

  deleteScene(campaignId: string, sessionId: string, sceneId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(campaignId, sessionId)}/${sceneId}`);
  }

  // ── Tokens ─────────────────────────────────────────────────────────────────

  getTokens(campaignId: string, sessionId: string, sceneId: string): Observable<MapToken[]> {
    return this.http.get<MapToken[]>(`${this.base(campaignId, sessionId)}/${sceneId}/tokens`);
  }

  addToken(campaignId: string, sessionId: string, sceneId: string, dto: {
    entityId?: string | null; label: string; imageUrl?: string | null;
    color: string; x: number; y: number; width: number; height: number;
    controlledBy?: string | null;
  }): Observable<MapToken> {
    return this.http.post<MapToken>(`${this.base(campaignId, sessionId)}/${sceneId}/tokens`, dto);
  }

  moveToken(campaignId: string, sessionId: string, sceneId: string, tokenId: string,
    dto: { x: number; y: number }): Observable<MapToken> {
    return this.http.patch<MapToken>(
      `${this.base(campaignId, sessionId)}/${sceneId}/tokens/${tokenId}/move`, dto);
  }

  updateToken(campaignId: string, sessionId: string, sceneId: string, tokenId: string, dto: {
    label: string; imageUrl?: string | null; color: string;
    width: number; height: number; isVisible: boolean; controlledBy?: string | null;
  }): Observable<MapToken> {
    return this.http.put<MapToken>(
      `${this.base(campaignId, sessionId)}/${sceneId}/tokens/${tokenId}`, dto);
  }

  deleteToken(campaignId: string, sessionId: string, sceneId: string, tokenId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base(campaignId, sessionId)}/${sceneId}/tokens/${tokenId}`);
  }
}
