import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { ChatMessage, SessionPresenceEntry } from '../models/session.models';

@Injectable({ providedIn: 'root' })
export class SessionSignalRService {
  private auth = inject(AuthService);
  private connection: signalR.HubConnection | null = null;
  private currentSessionId: string | null = null;

  readonly messageReceived$ = new Subject<ChatMessage>();
  readonly presenceUpdated$ = new Subject<SessionPresenceEntry[]>();
  readonly sessionEnded$ = new Subject<void>();

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.signalrUrl}/session`, {
        accessTokenFactory: () => this.auth.getAccessToken() ?? '',
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(environment.production ? signalR.LogLevel.Error : signalR.LogLevel.Warning)
      .build();

    this.registerHandlers();

    try {
      await this.connection.start();
    } catch (err) {
      console.warn('[SessionSignalR] Connection failed:', err);
    }
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
    this.currentSessionId = null;
  }

  async joinSession(sessionId: string): Promise<void> {
    this.currentSessionId = sessionId;
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinSession', sessionId);
    }
  }

  async leaveSession(sessionId: string): Promise<void> {
    this.currentSessionId = null;
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveSession', sessionId).catch(() => {});
    }
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  private registerHandlers(): void {
    if (!this.connection) return;

    this.connection.on('MessageReceived', (msg: ChatMessage) => {
      this.messageReceived$.next(msg);
    });

    this.connection.on('PresenceUpdated', (entries: SessionPresenceEntry[]) => {
      this.presenceUpdated$.next(entries);
    });

    this.connection.on('SessionEnded', () => {
      this.sessionEnded$.next();
    });

    this.connection.onreconnected(async () => {
      if (this.currentSessionId) {
        await this.connection!.invoke('JoinSession', this.currentSessionId).catch(() => {});
      }
    });
  }
}
