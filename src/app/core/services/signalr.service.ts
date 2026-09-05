import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { WorldEntity, EntityPermission } from '../../features/world/models/world.models';

export interface PresenceEntry {
  userId: string;
  displayName: string;
}

export interface CampaignContext {
  campaignId: string;
  roleId: string | null;
  roleName: string | null;
  isDm: boolean;
}

// Re-export summary type for convenience
export type EntitySummaryEvent = {
  id: string;
  entityTypeId: string;
  entityTypeName: string;
  entityTypeIcon: string | null;
  entityTypeColor: string | null;
  name: string;
  slug: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private auth = inject(AuthService);
  private connection: signalR.HubConnection | null = null;

  // ── Event streams ──────────────────────────────────────────────────────────
  readonly entityCreated$ = new Subject<EntitySummaryEvent>();
  readonly entityUpdated$ = new Subject<WorldEntity>();
  readonly entityDeleted$ = new Subject<string>(); // entityId
  readonly permissionsChanged$ = new Subject<{ entityId: string; permissions: EntityPermission[] }>();
  readonly presenceUpdated$ = new Subject<PresenceEntry[]>();

  // ── Campaign context (set when joining a campaign) ─────────────────────────
  private _campaignContext: CampaignContext | null = null;
  get campaignContext(): CampaignContext | null { return this._campaignContext; }

  // ── Connection ─────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.signalrUrl}/campaign`, {
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
      console.warn('[SignalR] Connection failed:', err);
    }
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
    this._campaignContext = null;
  }

  // ── Campaign join/leave ────────────────────────────────────────────────────

  async joinCampaign(context: CampaignContext): Promise<void> {
    // Leave previous campaign if different
    if (this._campaignContext && this._campaignContext.campaignId !== context.campaignId) {
      await this.leaveCampaign();
    }

    this._campaignContext = context;

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinCampaign', context.campaignId);
    }
  }

  async leaveCampaign(): Promise<void> {
    const ctx = this._campaignContext;
    if (!ctx) return;
    this._campaignContext = null;
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveCampaign', ctx.campaignId).catch(() => {});
    }
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private registerHandlers(): void {
    if (!this.connection) return;

    this.connection.on('EntityCreated', (summary: EntitySummaryEvent) => {
      this.entityCreated$.next(summary);
    });

    this.connection.on('EntityUpdated', (entity: WorldEntity) => {
      this.entityUpdated$.next(entity);
    });

    this.connection.on('EntityDeleted', (entityId: string) => {
      this.entityDeleted$.next(entityId);
    });

    this.connection.on('PermissionsChanged', (entityId: string, permissions: EntityPermission[]) => {
      this.permissionsChanged$.next({ entityId, permissions });
    });

    this.connection.on('PresenceUpdated', (entries: PresenceEntry[]) => {
      this.presenceUpdated$.next(entries);
    });

    this.connection.onreconnected(async () => {
      const ctx = this._campaignContext;
      if (ctx) {
        await this.connection!.invoke('JoinCampaign', ctx.campaignId).catch(() => {});
      }
    });
  }
}
