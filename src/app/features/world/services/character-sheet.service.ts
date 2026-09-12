import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CharacterResource } from '../models/character-sheet.models';

@Injectable({ providedIn: 'root' })
export class CharacterSheetService {
  private http = inject(HttpClient);

  private base(campaignId: string, entityId: string) {
    return `${environment.apiUrl}/campaigns/${campaignId}/entities/${entityId}/resources`;
  }

  getResources(campaignId: string, entityId: string) {
    return this.http.get<CharacterResource[]>(this.base(campaignId, entityId));
  }

  createResource(campaignId: string, entityId: string, data: {
    name: string; current: number; max: number; color: string; sortOrder: number;
  }) {
    return this.http.post<CharacterResource>(this.base(campaignId, entityId), data);
  }

  updateValue(campaignId: string, entityId: string, resourceId: string, current: number, sessionId?: string) {
    let params = new HttpParams();
    if (sessionId) params = params.set('sessionId', sessionId);
    return this.http.patch<CharacterResource>(
      `${this.base(campaignId, entityId)}/${resourceId}`,
      { current },
      { params }
    );
  }

  deleteResource(campaignId: string, entityId: string, resourceId: string) {
    return this.http.delete<void>(`${this.base(campaignId, entityId)}/${resourceId}`);
  }
}
