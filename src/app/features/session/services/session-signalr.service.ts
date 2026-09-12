import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { ChatMessage, SessionPresenceEntry } from '../models/session.models';
import { SessionScene, MapToken, TokenMovedEvent } from '../models/map.models';
import { CharacterResource } from '../../world/models/character-sheet.models';
import { FogZone, FogToggledEvent, InitiativeEntry, ConditionChangedEvent } from '../models/vtt-advanced.models';

@Injectable({ providedIn: 'root' })
export class SessionSignalRService {
  private auth = inject(AuthService);
  private connection: signalR.HubConnection | null = null;
  private currentSessionId: string | null = null;

  readonly messageReceived$ = new Subject<ChatMessage>();
  readonly presenceUpdated$ = new Subject<SessionPresenceEntry[]>();
  readonly sessionEnded$ = new Subject<void>();

  // Map events
  readonly sceneActivated$ = new Subject<SessionScene>();
  readonly sceneUpdated$   = new Subject<SessionScene>();
  readonly tokenAdded$     = new Subject<MapToken>();
  readonly tokenMoved$     = new Subject<TokenMovedEvent>();
  readonly tokenUpdated$   = new Subject<MapToken>();
  readonly tokenRemoved$   = new Subject<string>();

  // Sheet events
  readonly resourceUpdated$ = new Subject<CharacterResource>();

  // Fog events
  readonly fogZoneAdded$   = new Subject<FogZone>();
  readonly fogZoneRemoved$ = new Subject<string>();
  readonly fogCleared$     = new Subject<string>(); // sceneId
  readonly fogToggled$     = new Subject<FogToggledEvent>();

  // Combat events
  readonly initiativeUpdated$     = new Subject<InitiativeEntry[]>();
  readonly initiativeTurnChanged$ = new Subject<InitiativeEntry[]>();
  readonly conditionAdded$        = new Subject<ConditionChangedEvent>();
  readonly conditionRemoved$      = new Subject<ConditionChangedEvent>();

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

    this.connection.on('SceneActivated',   (scene: SessionScene)      => this.sceneActivated$.next(scene));
    this.connection.on('SceneUpdated',     (scene: SessionScene)      => this.sceneUpdated$.next(scene));
    this.connection.on('TokenAdded',       (token: MapToken)          => this.tokenAdded$.next(token));
    this.connection.on('TokenMoved',       (ev: TokenMovedEvent)      => this.tokenMoved$.next(ev));
    this.connection.on('TokenUpdated',     (token: MapToken)          => this.tokenUpdated$.next(token));
    this.connection.on('TokenRemoved',     (tokenId: string)          => this.tokenRemoved$.next(tokenId));
    this.connection.on('ResourceUpdated',  (r: CharacterResource)     => this.resourceUpdated$.next(r));

    this.connection.on('FogZoneAdded',   (z: FogZone)              => this.fogZoneAdded$.next(z));
    this.connection.on('FogZoneRemoved', (id: string)              => this.fogZoneRemoved$.next(id));
    this.connection.on('FogCleared',     (sceneId: string)         => this.fogCleared$.next(sceneId));
    this.connection.on('FogToggled',     (ev: FogToggledEvent)     => this.fogToggled$.next(ev));

    this.connection.on('InitiativeUpdated',     (list: InitiativeEntry[])  => this.initiativeUpdated$.next(list));
    this.connection.on('InitiativeTurnChanged', (list: InitiativeEntry[])  => this.initiativeTurnChanged$.next(list));
    this.connection.on('ConditionAdded',   (ev: ConditionChangedEvent) => this.conditionAdded$.next(ev));
    this.connection.on('ConditionRemoved', (ev: ConditionChangedEvent) => this.conditionRemoved$.next(ev));

    this.connection.onreconnected(async () => {
      if (this.currentSessionId) {
        await this.connection!.invoke('JoinSession', this.currentSessionId).catch(() => {});
      }
    });
  }
}
