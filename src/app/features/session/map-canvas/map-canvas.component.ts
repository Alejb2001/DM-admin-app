import {
  Component, inject, input, signal, computed,
  OnInit, OnDestroy, ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SceneService } from '../services/scene.service';
import { SessionSignalRService } from '../services/session-signalr.service';
import { VttAdvancedService } from '../services/vtt-advanced.service';
import { SessionScene, MapToken, SceneAnnotation } from '../models/map.models';
import { FogZone } from '../models/vtt-advanced.models';
import { KonvaStageComponent } from './konva-stage/konva-stage.component';
import { SceneSelectorComponent } from './scene-selector/scene-selector.component';
import { TokenPanelComponent } from './token-panel/token-panel.component';
import { FogToolbarComponent } from '../fog-of-war/fog-toolbar.component';
import { ConditionPickerComponent } from '../token-conditions/condition-picker.component';
import { AnnotationToolbarComponent, AnnotationTool } from './annotation-toolbar/annotation-toolbar.component';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [KonvaStageComponent, SceneSelectorComponent, TokenPanelComponent, FogToolbarComponent,
    ConditionPickerComponent, AnnotationToolbarComponent,
    MatButtonModule, MatIconModule, MatTooltipModule],
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
              [selectedToken]="selectedToken()"
              (tokenAdded)="onTokenAdded($event)"
              (tokenDeleted)="onTokenDeleted($event)"
              (tokenUpdated)="onTokenUpdated($event)"
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
            <div class="ann-panel">
              <app-annotation-toolbar
                [activeTool]="annotationTool()"
                [activeColor]="annotationColor()"
                [activeStroke]="annotationStroke()"
                [activeFill]="annotationFill()"
                (toolChange)="onSetAnnotationTool($event)"
                (colorChange)="onAnnotationColor($event)"
                (strokeChange)="onAnnotationStroke($event)"
                (fillChange)="onAnnotationFill($event)"
                (clearAll)="onClearAnnotations()"
              />
            </div>
          }
        </div>
      }
      <div class="canvas-area">
        <!-- Floating view controls -->
        <div class="view-controls">
          <button mat-mini-fab
                  (click)="togglePanMode()"
                  [class.active]="panMode()"
                  [matTooltip]="panMode() ? 'Modo mover activo (click para desactivar)' : 'Modo mover (arrastra el mapa)'"
                  color="default" class="view-btn">
            <mat-icon>pan_tool</mat-icon>
          </button>
          <button mat-mini-fab
                  (click)="resetView()"
                  matTooltip="Restablecer vista"
                  color="default" class="view-btn">
            <mat-icon>fit_screen</mat-icon>
          </button>
          @if (isDm()) {
            <button mat-mini-fab
                    (click)="sendPingCenter()"
                    matTooltip="Ping en el centro del mapa (o doble-clic en el mapa)"
                    color="default" class="view-btn">
              <mat-icon>location_on</mat-icon>
            </button>
          }
        </div>

        @if (activeScene()) {
          <app-konva-stage
            #stage
            [scene]="activeScene()"
            [tokens]="tokens()"
            [fogZones]="fogZones()"
            [annotations]="annotations()"
            [panMode]="panMode()"
            [currentUserId]="currentUserId()"
            [isDm]="isDm()"
            (tokenDropped)="onTokenDropped($event)"
            (fogZoneDrawn)="onFogZoneDrawn($event)"
            (tokenSelected)="selectedToken.set($event)"
            (mapDblClick)="onMapDblClick($event)"
            (annotationDrawn)="onAnnotationDrawn($event)"
            (annotationErased)="onAnnotationErased($event)"
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
    .ann-panel { border-top: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; overflow-y: auto; }
    .canvas-area { flex: 1; overflow: hidden; background: #0d0d1a; position: relative; }
    .view-controls {
      position: absolute; top: 8px; right: 8px;
      display: flex; flex-direction: column; gap: 6px;
      z-index: 20;
    }
    .view-btn { background: rgba(30,30,50,0.85) !important; color: rgba(255,255,255,0.8) !important; }
    .view-btn.active { color: #ff5722 !important; }
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

  scenes        = signal<SessionScene[]>([]);
  tokens        = signal<MapToken[]>([]);
  fogZones      = signal<FogZone[]>([]);
  annotations   = signal<SceneAnnotation[]>([]);
  activeScene   = computed(() => this.scenes().find(s => s.isActive) ?? null);
  selectedToken = signal<MapToken | null>(null);
  fogTool       = signal<'rect' | 'circle' | null>(null);
  panMode       = signal(false);
  annotationTool   = signal<AnnotationTool | null>(null);
  annotationColor  = signal('#ef5350');
  annotationStroke = signal(2);
  annotationFill   = signal(0);

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
        this.loadAnnotations(active.id);
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

  private loadAnnotations(sceneId: string) {
    this.sceneService.getAnnotations(this.campaignId(), this.sessionId(), sceneId)
      .subscribe(list => this.annotations.set(list));
  }

  // ── SignalR ────────────────────────────────────────────────────────────────

  private subscribeSignalR() {
    this.subs.push(
      this.signalR.ping$.subscribe(ev => {
        this.stageRef?.showPing(ev.x, ev.y);
      }),
      this.signalR.sceneActivated$.subscribe(scene => {
        this.scenes.update(list => list.map(s => ({ ...s, isActive: s.id === scene.id })));
        this.loadTokens(scene.id);
        this.loadAnnotations(scene.id);
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

      // Annotation events
      this.signalR.annotationAdded$.subscribe(ann => {
        if (ann.sceneId === this.activeScene()?.id) {
          this.annotations.update(list => [...list, ann]);
          this.stageRef?.addAnnotation(ann);
        }
      }),
      this.signalR.annotationRemoved$.subscribe(id => {
        this.annotations.update(list => list.filter(a => a.id !== id));
        this.stageRef?.removeAnnotation(id);
      }),
      this.signalR.annotationsCleared$.subscribe(sceneId => {
        if (sceneId === this.activeScene()?.id) {
          this.annotations.set([]);
          this.stageRef?.renderAnnotations();
        }
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
    this.loadAnnotations(scene.id);
  }

  // ── Token events ───────────────────────────────────────────────────────────

  onTokenAdded(token: MapToken) {
    this.tokens.update(list => [...list, token]);
  }

  onTokenDeleted(tokenId: string) {
    this.tokens.update(list => list.filter(t => t.id !== tokenId));
  }

  onTokenUpdated(token: MapToken) {
    this.tokens.update(list => list.map(t => t.id === token.id ? token : t));
    this.selectedToken.set(token);
    this.stageRef?.addOrUpdateToken(token);
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
    if (tool) {
      this.annotationTool.set(null);
      if (this.stageRef) this.stageRef.annotationTool = null;
    }
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

  // ── Annotation events ────────────────────────────────────────────────────────

  onSetAnnotationTool(tool: AnnotationTool | null) {
    this.annotationTool.set(tool);
    if (this.stageRef) this.stageRef.annotationTool = tool;
    // Deactivate fog tool when annotation tool activates
    if (tool) {
      this.fogTool.set(null);
      if (this.stageRef) this.stageRef.fogDrawingTool = null;
    }
  }

  onAnnotationColor(color: string) {
    this.annotationColor.set(color);
    if (this.stageRef) this.stageRef.annotationColor = color;
  }

  onAnnotationStroke(px: number) {
    this.annotationStroke.set(px);
    if (this.stageRef) this.stageRef.annotationStrokeWidth = px;
  }

  onAnnotationFill(opacity: number) {
    this.annotationFill.set(opacity);
    if (this.stageRef) this.stageRef.annotationFillOpacity = opacity;
  }

  onAnnotationDrawn(payload: { type: string; points: number[]; color: string; strokeWidth: number;
      fillColor: string | null; fillOpacity: number; text: string | null; fontSize: number }) {
    const scene = this.activeScene();
    if (!scene) return;
    this.sceneService.addAnnotation(this.campaignId(), this.sessionId(), scene.id, payload)
      .subscribe(ann => {
        this.annotations.update(list => [...list, ann]);
        this.stageRef?.addAnnotation(ann);
      });
  }

  onAnnotationErased(annotationId: string) {
    const scene = this.activeScene();
    if (!scene) return;
    this.sceneService.deleteAnnotation(this.campaignId(), this.sessionId(), scene.id, annotationId)
      .subscribe(() => {
        this.annotations.update(list => list.filter(a => a.id !== annotationId));
        this.stageRef?.removeAnnotation(annotationId);
      });
  }

  onClearAnnotations() {
    const scene = this.activeScene();
    if (!scene) return;
    this.sceneService.clearAnnotations(this.campaignId(), this.sessionId(), scene.id)
      .subscribe(() => {
        this.annotations.set([]);
        this.stageRef?.renderAnnotations();
      });
  }

  // ── View controls ──────────────────────────────────────────────────────────

  togglePanMode() {
    this.panMode.update(v => !v);
    // Deactivate drawing tools when entering pan mode
    if (this.panMode()) {
      this.fogTool.set(null);
      if (this.stageRef) this.stageRef.fogDrawingTool = null;
      this.annotationTool.set(null);
      if (this.stageRef) this.stageRef.annotationTool = null;
    }
  }

  resetView() {
    this.stageRef?.resetView();
  }

  onMapDblClick(pos: { x: number; y: number }) {
    if (!this.isDm()) return;
    this.signalR.sendPing(this.sessionId(), pos.x, pos.y);
  }

  sendPingCenter() {
    // Ping at the center of the active scene (0,0 in stage coords)
    this.signalR.sendPing(this.sessionId(), 0, 0);
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
