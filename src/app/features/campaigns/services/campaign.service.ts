import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Campaign, CampaignDetail, Invitation } from '../models/campaign.models';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/campaigns`;

  getAll() {
    return this.http.get<Campaign[]>(this.base);
  }

  getDetail(id: string) {
    return this.http.get<CampaignDetail>(`${this.base}/${id}`);
  }

  create(data: { name: string; description?: string }) {
    return this.http.post<Campaign>(this.base, data);
  }

  update(id: string, data: { name: string; description?: string }) {
    return this.http.put<Campaign>(`${this.base}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  createInvitation(campaignId: string, roleId: string, email?: string, recipientName?: string, expiryHours = 168) {
    return this.http.post<Invitation>(
      `${this.base}/${campaignId}/invitations`,
      { roleId, expiryHours, email: email || null, recipientName: recipientName || null }
    );
  }

  join(token: string) {
    return this.http.post<Campaign>(`${this.base}/join`, { token });
  }

  updateMemberRole(campaignId: string, memberId: string, roleId: string) {
    return this.http.put<void>(
      `${this.base}/${campaignId}/members/${memberId}/role`,
      { roleId }
    );
  }

  removeMember(campaignId: string, memberId: string) {
    return this.http.delete<void>(`${this.base}/${campaignId}/members/${memberId}`);
  }

  leave(campaignId: string) {
    return this.http.post<void>(`${this.base}/${campaignId}/leave`, {});
  }
}
