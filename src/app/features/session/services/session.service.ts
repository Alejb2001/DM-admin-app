import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ChatMessage, GameSession, GameSessionDetail, SendMessageRequest } from '../models/session.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);

  private base(campaignId: string) {
    return `${environment.apiUrl}/campaigns/${campaignId}/sessions`;
  }

  createSession(campaignId: string, name: string): Observable<GameSession> {
    return this.http.post<GameSession>(this.base(campaignId), { name });
  }

  endSession(campaignId: string, sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.base(campaignId)}/${sessionId}/end`, {});
  }

  getSessions(campaignId: string): Observable<GameSession[]> {
    return this.http.get<GameSession[]>(this.base(campaignId));
  }

  getSessionDetail(campaignId: string, sessionId: string): Observable<GameSessionDetail> {
    return this.http.get<GameSessionDetail>(`${this.base(campaignId)}/${sessionId}`);
  }

  getMessages(campaignId: string, sessionId: string, page = 1, pageSize = 50): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(
      `${this.base(campaignId)}/${sessionId}/messages`,
      { params: { page, pageSize } }
    );
  }

  sendMessage(campaignId: string, sessionId: string, dto: SendMessageRequest): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base(campaignId)}/${sessionId}/messages`, dto);
  }
}
