import {
  Component, inject, input, signal, computed,
  OnInit, OnDestroy, ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { SceneService } from '../services/scene.service';
import { SessionSignalRService } from '../services/session-signalr.service';
import { VttAdvancedService } from '../services/vtt-advanced.service';
import { SessionScene, MapToken } from '../models/map.models';
import { FogZone } from '../models/vtt-advanced.models';
import { KonvaStageComponent } from './konva-stage/konva-stage.component';
import { SceneSelectorComponent } from './scene-selector/scene-selector.component';
import { TokenPanelComponent } from './token-panel/token-panel.component';
import { FogToolbarComponent } from '../fog-of-war/fog-toolbar.component';
import { ConditionPickerComponent } from '../token-conditions/condition-picker.component';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [KonvaStageComponent, SceneSelectorComponent, TokenPanelComponent, FogToolbarComponent, ConditionPickerComponent],
  template: `
    <div class="map-layout">
      @if (isDm()) {
        <div class="dm-panel">
          <div class="dm-panel-top">
            <app-scene-selector
              [campaignId]="campaignId()"
              [sessionId]="sessionId()"
              [scenes]="scenes()"
              (sceneCreated)="onSceneCreated($event)"
              (sceneUpdated)="onSceneUpdated($event)"
              (sceneDeleted)="onSceneDeleted($event)"
              (sceneActivated)="onSceneActivated($event)"
            />
          </div>
          <div class="dm-panel-bottom">
            <app-token-panel
              [campaignId]="campaignId()"
              [sessionId]="sessionId()"
              [sceneId]="activeScene()?.id ?? null"
              [tokens]="tokens()"
              (tokenAdded)="onTokenAdded($event)"
              (tokenDeleted)="onTokenDeleted($event)"
            />
          </div>
          @if (activeScene()) {
            <div class="fog-panel">
              <app-fog-toolbar
                [fogEnabled]="activeScene()!.fogEnabled"
                [activeTool]="fogTool()"
                (toggleFog)="onToggleFog()"
                (setTool)="onSetFogTool($event)"
                (clearFog)="onClearFog()"
              />
            </div>
          }
        </div>
      }
      <div class="canvas-area">
        @if (activeScene()) {
          <app-konva-stage
            #stage
            [scene]="activeScene()"
            [tokens]="tokens()"
            [fogZones]="fogZones()"
            [currentUserId]="currentUserId()"
            [isDm]="isDm()"
            (tokenDropped)="onTokenDropped($event)"
            (fogZoneDrawn)="onFogZoneDrawn($event)"
          />
          @if (selectedToken() && isDm()) {
            <div class="condition-overlay">
              <app-condition-picker
                [activeConditions]="selectedToken()!.conditions"
                (addCond)="onAddCondition($event)"
                (removeCond)="onRemoveCondition($event)"
              />
            </div>
          }
        } @else {
          <div class="no-scene">
            @if (isDm()) {
              <p>Crea una escena en el panel izquierdo para comenzar</p>
            } @else {
              <p>El DM todavía no ha activado un mapa</p>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; width: 100%; height: 100%; overflow: hidden; }
    .map-layout { display: flex; width: 100%; height: 100%; }
    .dm-panel {
      width: 200px; flex-shrink: 0;
      background: #1a1a2e;
      border-right: 1px solid rgba(255,255,255,0.1);
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .dm-panel-top { flex: 1; overflow: hidden; display: flex; flex-direction: column; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .dm-panel-bottom { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    .fog-panel { border-top: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
    .canvas-area { flex: 1; overflow: hidden; background: #0d0d1a; position: relative; }
    .condition-overlay {
      position: absolute; bottom: 12px; right: 12px;
      border-radius: 8px; overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      z-index: 10;
    }
    .no-scene {
      height: 100%; display: flex; align-items: center; justify-content: center;
      color: #546e7a; text-align: center; padding: 24px;
    }
    .no-scene p { font-size: 14px; }
  `],
})
export class MapCanvasComponent implements OnInit, OnDestroy {
  campaignId    = input.required<string>();
  sessionId     = input.required<string>();
  isDm          = input<boolean>(false);
  currentUserId = input<string>('');

  @ViewChild('stage') stageRef?: KonvaStageComponent;

  scenes       = signal<SessionScene[]>([]);
  tokens       = signal<MapToken[]>([]);
  fogZones     = signal<FogZone[]>([]);
  activeScene  = computed(() => this.scenes().find(s => s.isActive) ?? null);
  selectedToken = signal<MapToken | null>(null);
  fogTool      = signal<'rect' | 'circle' | null>(null);

  private sceneService = inject(SceneService);
  private vtt          = inject(VttAdvancedService);
  private signalR      = inject(SessionSignalRService);
  private subs: Subscription[] = [];

  ngOnInit() {
    this.loadScenes();
    this.subscribeSignalR();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  private loadScenes() {
    this.sceneService.getScenes(this.campaignId(), this.sessionId()).subscribe(scenes => {
      this.scenes.set(scenes);
      const active = scenes.find(s => s.isActive);
      if (active) {
        this.loadTokens(active.id);
        this.loadFogZones(active.id);
      }
    });
  }

  private loadTokens(sceneId: string) {
    this.sceneService.getTokens(this.campaignId(), this.sessionId(), sceneId)
      .subscribe(tokens => this.tokens.set(tokens));
  }

  private loadFogZones(sceneId: string) {
    this.vtt.getFogZones(this.campaignId(), this.sessionId(), sceneId)
      .subscribe(zones => this.fogZones.set(zones));
  }

  // ── SignalR ────────────────────────────────────────────────────────────────

  private subscribeSignalR() {
    this.subs.push(
      this.signalR.sceneActivated$.subscribe(scene => {
        this.scenes.update(list => list.map(s => ({ ...s, isActive: s.id === scene.id })));
        this.loadTokens(scene.id);
      }),
      this.signalR.sceneUpdated$.subscribe(scene => {
        this.scenes.update(list => {
          const exists = list.find(s => s.id === scene.id);
          return exists
            ? list.map(s => s.id === scene.id ? scene : s)
            : [...list, scene];
        });
      }),
      this.signalR.tokenAdded$.subscribe(token => {
        if (token.sceneId === this.activeScene()?.id) {
          this.tokens.update(list => [...list, token]);
          this.stageRef?.addOrUpdateToken(token);
        }
      }),
      this.signalR.tokenMoved$.subscribe(ev => {
        this.tokens.update(list =>
          list.map(t => t.id === ev.tokenId ? { ...t, x: ev.x, y: ev.y } : t));
        this.stageRef?.moveToken(ev.tokenId, ev.x, ev.y);
      }),
      this.signalR.tokenUpdated$.subscribe(token => {
        this.tokens.update(list => list.map(t => t.id === token.id ? token : t));
        this.stageRef?.addOrUpdateToken(token);
      }),
      this.signalR.tokenRemoved$.subscribe(tokenId => {
        this.tokens.update(list => list.filter(t => t.id !== tokenId));
        this.stageRef?.removeToken(tokenId);
      }),

      // Fog events
      this.signalR.fogZoneAdded$.subscribe(zone => {
        if (zone.sceneId === this.activeScene()?.id) {
          this.fogZones.update(list => [...list, zone]);
          this.stageRef?.renderFog();
        }
      }),
      this.signalR.fogZoneRemoved$.subscribe(zoneId => {
        this.fogZones.update(list => list.filter(z => z.id !== zoneId));
        this.stageRef?.renderFog();
      }),
      this.signalR.fogCleared$.subscribe(sceneId => {
        if (sceneId === this.activeScene()?.id) {
          this.fogZones.set([]);
          this.stageRef?.renderFog();
        }
      }),
      this.signalR.fogToggled$.subscribe(ev => {
        this.scenes.update(list => list.map(s =>
          s.id === ev.sceneId ? { ...s, fogEnabled: ev.fogEnabled } : s));
        this.stageRef?.renderFog();
      }),

      // Condition events
      this.signalR.conditionAdded$.subscribe(ev => {
        this.tokens.update(list => list.map(t =>
          t.id === ev.tokenId ? { ...t, conditions: ev.conditions } : t));
        this.stageRef?.updateTokenConditions(ev.tokenId, ev.conditions);
      }),
      this.signalR.conditionRemoved$.subscribe(ev => {
        this.tokens.update(list => list.map(t =>
          t.id === ev.tokenId ? { ...t, conditions: ev.conditions } : t));
        this.stageRef?.updateTokenConditions(ev.tokenId, ev.conditions);
      }),
    );
  }

  // ── Scene events ───────────────────────────────────────────────────────────

  onSceneCreated(scene: SessionScene) {
    this.scenes.update(list => [...list, scene]);
  }

  onSceneUpdated(scene: SessionScene) {
    this.scenes.update(list => list.map(s => s.id === scene.id ? scene : s));
  }

  onSceneDeleted(sceneId: string) {
    this.scenes.update(list => list.filter(s => s.id !== sceneId));
    if (this.activeScene()?.id === sceneId) this.tokens.set([]);
  }

  onSceneActivated(scene: SessionScene) {
    this.scenes.update(list => list.map(s => ({ ...s, isActive: s.id === scene.id })));
    this.loadTokens(scene.id);
    this.loadFogZones(scene.id);
  }

  // ── Token events ───────────────────────────────────────────────────────────

  onTokenAdded(token: MapToken) {
    this.tokens.update(list => [...list, token]);
  }

  onTokenDeleted(tokenId: string) {
    this.tokens.update(list => list.filter(t => t.id !== tokenId));
  }

  // ── Fog events ──────────────────────────────────────────────────────────────

  onToggleFog() {
    const scene = this.activeScene();
    if (!scene) return;
    this.vtt.toggleFog(this.campaignId(), this.sessionId(), scene.id, !scene.fogEnabled)
      .subscribe(() => {
        this.scenes.update(list => list.map(s =>
          s.id === scene.id ? { ...s, fogEnabled: !scene.fogEnabled } : s));
        this.stageRef?.renderFog();
      });
  }

  onSetFogTool(tool: 'rect' | 'circle' | null) {
    this.fogTool.set(tool);
    if (this.stageRef) this.stageRef.fogDrawingTool = tool;
  }

  onClearFog() {
    const scene = this.activeScene();
    if (!scene) return;
    this.vtt.clearFog(this.campaignId(), this.sessionId(), scene.id).subscribe(() => {
      this.fogZones.set([]);
      this.stageRef?.renderFog();
    });
  }

  onFogZoneDrawn(event: { shape: string; x: number; y: number; width?: number; height?: number; radius?: number }) {
    const scene = this.activeScene();
    if (!scene) return;
    this.vtt.addFogZone(this.campaignId(), this.sessionId(), scene.id, event).subscribe(zone => {
      this.fogZones.update(list => [...list, zone]);
      this.stageRef?.renderFog();
    });
  }

  // ── Condition events ────────────────────────────────────────────────────────

  onAddCondition(condition: string) {
    const token = this.selectedToken();
    const scene = this.activeScene();
    if (!token || !scene) return;
    this.vtt.addCondition(this.campaignId(), this.sessionId(), scene.id, token.id, condition)
      .subscribe(conditions => {
        const updated = { ...token, conditions };
        this.tokens.update(list => list.map(t => t.id === token.id ? updated : t));
        this.selectedToken.set(updated);
        this.stageRef?.updateTokenConditions(token.id, conditions);
      });
  }

  onRemoveCondition(conditionId: string) {
    const token = this.selectedToken();
    const scene = this.activeScene();
    if (!token || !scene) return;
    this.vtt.removeCondition(this.campaignId(), this.sessionId(), scene.id, token.id, conditionId)
      .subscribe(conditions => {
        const updated = { ...token, conditions };
        this.tokens.update(list => list.map(t => t.id === token.id ? updated : t));
        this.selectedToken.set(updated);
        this.stageRef?.updateTokenConditions(token.id, conditions);
      });
  }

  // ── Token events ───────────────────────────────────────────────────────────

  onTokenDropped(event: { tokenId: string; sceneId: string; x: number; y: number }) {
    const active = this.activeScene();
    if (!active) return;

    this.sceneService.moveToken(
      this.campaignId(), this.sessionId(), event.sceneId, event.tokenId,
      { x: event.x, y: event.y }
    ).subscribe(token => {
      this.tokens.update(list => list.map(t => t.id === token.id ? token : t));
    });
  }
}
