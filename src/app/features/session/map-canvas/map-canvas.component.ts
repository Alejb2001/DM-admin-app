import {
  Component, inject, input, signal, computed,
  OnInit, OnDestroy, ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { SceneService } from '../services/scene.service';
import { SessionSignalRService } from '../services/session-signalr.service';
import { SessionScene, MapToken } from '../models/map.models';
import { KonvaStageComponent } from './konva-stage/konva-stage.component';
import { SceneSelectorComponent } from './scene-selector/scene-selector.component';
import { TokenPanelComponent } from './token-panel/token-panel.component';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [KonvaStageComponent, SceneSelectorComponent, TokenPanelComponent],
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
        </div>
      }
      <div class="canvas-area">
        @if (activeScene()) {
          <app-konva-stage
            #stage
            [scene]="activeScene()"
            [tokens]="tokens()"
            [currentUserId]="currentUserId()"
            [isDm]="isDm()"
            (tokenDropped)="onTokenDropped($event)"
          />
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
    .canvas-area { flex: 1; overflow: hidden; background: #0d0d1a; }
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

  scenes      = signal<SessionScene[]>([]);
  tokens      = signal<MapToken[]>([]);
  activeScene = computed(() => this.scenes().find(s => s.isActive) ?? null);

  private sceneService = inject(SceneService);
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
      if (active) this.loadTokens(active.id);
    });
  }

  private loadTokens(sceneId: string) {
    this.sceneService.getTokens(this.campaignId(), this.sessionId(), sceneId)
      .subscribe(tokens => this.tokens.set(tokens));
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
  }

  // ── Token events ───────────────────────────────────────────────────────────

  onTokenAdded(token: MapToken) {
    this.tokens.update(list => [...list, token]);
  }

  onTokenDeleted(tokenId: string) {
    this.tokens.update(list => list.filter(t => t.id !== tokenId));
  }

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
