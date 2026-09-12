import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  Input, Output, EventEmitter, OnChanges, SimpleChanges,
} from '@angular/core';
import Konva from 'konva';
import { SessionScene, MapToken } from '../../models/map.models';
import { FogZone } from '../../models/vtt-advanced.models';

interface TokenDrop {
  tokenId: string;
  sceneId: string;
  x: number;
  y: number;
}

@Component({
  selector: 'app-konva-stage',
  standalone: true,
  template: `<div #stageContainer class="stage-host"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .stage-host { width: 100%; height: 100%; }
  `],
})
export class KonvaStageComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('stageContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() set scene(value: SessionScene | null) {
    this._scene = value;
    if (this.stage) this.applyScene(value);
  }
  @Input() set tokens(value: MapToken[]) {
    this._tokens = value;
    if (this.stage) this.syncTokens(value);
  }
  @Input() set fogZones(value: FogZone[]) {
    this._fogZones = value;
    if (this.stage) this.renderFog();
  }
  @Input() currentUserId = '';
  @Input() isDm = false;

  @Output() tokenDropped  = new EventEmitter<TokenDrop>();
  @Output() fogZoneDrawn  = new EventEmitter<{ shape: string; x: number; y: number; width?: number; height?: number; radius?: number }>();
  @Output() tokenSelected = new EventEmitter<MapToken | null>();

  private _scene: SessionScene | null = null;
  private _tokens: MapToken[] = [];
  private _fogZones: FogZone[] = [];

  private stage: Konva.Stage | null = null;
  private backgroundLayer!: Konva.Layer;
  private gridLayer!: Konva.Layer;
  private tokenLayer!: Konva.Layer;
  private fogLayer!: Konva.Layer;
  private tokenMap = new Map<string, Konva.Group>();
  private resizeObserver!: ResizeObserver;

  // Fog drawing state
  fogDrawingTool: 'rect' | 'circle' | null = null;
  private fogDrawing = false;
  private fogStartPos: { x: number; y: number } | null = null;
  private fogPreview: Konva.Shape | null = null;

  ngAfterViewInit() {
    const el = this.containerRef.nativeElement;
    this.stage = new Konva.Stage({
      container: el,
      width: el.clientWidth || 800,
      height: el.clientHeight || 600,
    });

    this.backgroundLayer = new Konva.Layer();
    this.gridLayer = new Konva.Layer();
    this.tokenLayer = new Konva.Layer();
    this.fogLayer = new Konva.Layer();

    this.stage.add(this.backgroundLayer);
    this.stage.add(this.gridLayer);
    this.stage.add(this.tokenLayer);
    this.stage.add(this.fogLayer);

    this.setupFogDrawing();

    // Click on empty stage deselects token
    this.stage.on('click', (e) => {
      if (e.target === this.stage) this.tokenSelected.emit(null);
    });

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(el);

    // Apply pending inputs
    if (this._scene) this.applyScene(this._scene);
    this.syncTokens(this._tokens);
    this.renderFog();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.stage) return;
    if (changes['currentUserId'] || changes['isDm']) {
      // Re-render tokens when role/user changes (draggability may change)
      this.syncTokens(this._tokens);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.stage?.destroy();
  }

  // ── Public API (called by parent for real-time updates) ─────────────────────

  addOrUpdateToken(token: MapToken) {
    if (this.tokenMap.has(token.id)) {
      this.removeTokenFromStage(token.id);
    }
    this.renderToken(token);
    this.tokenLayer.draw();
  }

  moveToken(tokenId: string, x: number, y: number) {
    const group = this.tokenMap.get(tokenId);
    if (!group || !this._scene) return;
    const gs = this._scene.gridSize;
    group.to({ x: x * gs, y: y * gs, duration: 0.15 });
    // Update our local copy
    const token = this._tokens.find(t => t.id === tokenId);
    if (token) { token.x = x; token.y = y; }
  }

  removeToken(tokenId: string) {
    this.removeTokenFromStage(tokenId);
    this.tokenLayer.draw();
  }

  updateTokenConditions(tokenId: string, conditions: { id: string; condition: string }[]) {
    const token = this._tokens.find(t => t.id === tokenId);
    if (token) {
      token.conditions = conditions;
      this.addOrUpdateToken(token);
    }
  }

  // ── Fog ─────────────────────────────────────────────────────────────────────

  renderFog() {
    if (!this.fogLayer || !this._scene) return;

    this.fogLayer.destroyChildren();

    if (!this._scene.fogEnabled) {
      this.fogLayer.draw();
      return;
    }

    const w = this.stage!.width();
    const h = this.stage!.height();
    const opacity = this.isDm ? 0.5 : 1;

    // Full fog cover
    const fogRect = new Konva.Rect({
      x: 0, y: 0, width: w, height: h,
      fill: '#000000',
      opacity,
    });
    this.fogLayer.add(fogRect);

    // Revealed zones use destination-out compositing
    for (const zone of this._fogZones) {
      if (zone.shape === 'circle' && zone.radius != null) {
        const hole = new Konva.Circle({
          x: zone.x, y: zone.y,
          radius: zone.radius,
          fill: 'rgba(0,0,0,1)',
          globalCompositeOperation: 'destination-out' as any,
        });
        this.fogLayer.add(hole);
      } else if (zone.width != null && zone.height != null) {
        const hole = new Konva.Rect({
          x: zone.x, y: zone.y,
          width: zone.width, height: zone.height,
          fill: 'rgba(0,0,0,1)',
          globalCompositeOperation: 'destination-out' as any,
        });
        this.fogLayer.add(hole);
      }
    }

    this.fogLayer.draw();
  }

  private setupFogDrawing() {
    if (!this.stage) return;

    this.stage.on('mousedown touchstart', (e) => {
      if (!this.fogDrawingTool || !this.isDm) return;
      this.fogDrawing = true;
      const pos = this.stage!.getPointerPosition()!;
      this.fogStartPos = { x: pos.x, y: pos.y };
    });

    this.stage.on('mousemove touchmove', () => {
      if (!this.fogDrawing || !this.fogStartPos) return;
      const pos = this.stage!.getPointerPosition()!;

      if (this.fogPreview) {
        this.fogPreview.destroy();
        this.fogPreview = null;
      }

      if (this.fogDrawingTool === 'rect') {
        const x = Math.min(pos.x, this.fogStartPos.x);
        const y = Math.min(pos.y, this.fogStartPos.y);
        const w = Math.abs(pos.x - this.fogStartPos.x);
        const h = Math.abs(pos.y - this.fogStartPos.y);
        this.fogPreview = new Konva.Rect({
          x, y, width: w, height: h,
          stroke: '#ffeb3b', strokeWidth: 2, dash: [6, 3],
        });
      } else {
        const dx = pos.x - this.fogStartPos.x;
        const dy = pos.y - this.fogStartPos.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        this.fogPreview = new Konva.Circle({
          x: this.fogStartPos.x, y: this.fogStartPos.y,
          radius,
          stroke: '#ffeb3b', strokeWidth: 2, dash: [6, 3],
        });
      }
      this.fogLayer.add(this.fogPreview);
      this.fogLayer.draw();
    });

    this.stage.on('mouseup touchend', () => {
      if (!this.fogDrawing || !this.fogStartPos) return;
      const pos = this.stage!.getPointerPosition()!;
      this.fogDrawing = false;

      if (this.fogPreview) {
        this.fogPreview.destroy();
        this.fogPreview = null;
        this.fogLayer.draw();
      }

      if (this.fogDrawingTool === 'rect') {
        const x = Math.min(pos.x, this.fogStartPos.x);
        const y = Math.min(pos.y, this.fogStartPos.y);
        const width = Math.abs(pos.x - this.fogStartPos.x);
        const height = Math.abs(pos.y - this.fogStartPos.y);
        if (width > 5 && height > 5) {
          this.fogZoneDrawn.emit({ shape: 'rect', x, y, width, height });
        }
      } else {
        const dx = pos.x - this.fogStartPos.x;
        const dy = pos.y - this.fogStartPos.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        if (radius > 5) {
          this.fogZoneDrawn.emit({ shape: 'circle', x: this.fogStartPos.x, y: this.fogStartPos.y, radius });
        }
      }

      this.fogStartPos = null;
    });
  }

  // ── Scene ──────────────────────────────────────────────────────────────────

  private applyScene(scene: SessionScene | null) {
    this.backgroundLayer.destroyChildren();
    this.gridLayer.destroyChildren();

    if (!scene) {
      this.backgroundLayer.draw();
      this.gridLayer.draw();
      return;
    }

    if (scene.backgroundUrl) {
      this.loadBackground(scene.backgroundUrl);
    }

    if (scene.gridEnabled) {
      this.drawGrid(scene.gridSize);
    }
  }

  private loadBackground(url: string) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const stageW = this.stage!.width();
      const scale = stageW / img.width;
      const imgH = img.height * scale;

      // Resize stage height to match image proportions
      if (imgH > 200) this.stage!.height(imgH);

      const konvaImg = new Konva.Image({
        image: img,
        x: 0, y: 0,
        width: stageW,
        height: imgH,
      });
      this.backgroundLayer.destroyChildren();
      this.backgroundLayer.add(konvaImg);
      this.backgroundLayer.draw();

      // Redraw grid on top with new height
      if (this._scene?.gridEnabled) {
        this.drawGrid(this._scene.gridSize);
      }
    };
    img.src = url;
  }

  private drawGrid(gridSize: number) {
    this.gridLayer.destroyChildren();
    const w = this.stage!.width();
    const h = this.stage!.height();
    const stroke = 'rgba(255,255,255,0.15)';

    for (let x = 0; x <= w; x += gridSize) {
      this.gridLayer.add(new Konva.Line({ points: [x, 0, x, h], stroke, strokeWidth: 1 }));
    }
    for (let y = 0; y <= h; y += gridSize) {
      this.gridLayer.add(new Konva.Line({ points: [0, y, w, y], stroke, strokeWidth: 1 }));
    }
    this.gridLayer.draw();
  }

  // ── Tokens ─────────────────────────────────────────────────────────────────

  private syncTokens(tokens: MapToken[]) {
    // Remove tokens that no longer exist
    for (const [id] of this.tokenMap) {
      if (!tokens.find(t => t.id === id)) this.removeTokenFromStage(id);
    }
    // Add/update all current tokens
    for (const token of tokens) {
      if (this.tokenMap.has(token.id)) this.removeTokenFromStage(token.id);
      this.renderToken(token);
    }
    this.tokenLayer.draw();
  }

  private renderToken(token: MapToken) {
    // Non-DM players don't see invisible tokens
    if (!token.isVisible && !this.isDm) return;

    const gridSize = this._scene?.gridSize ?? 50;
    const canDrag = this.isDm || token.controlledBy === this.currentUserId;
    const tokenPx = token.width * gridSize;

    const group = new Konva.Group({
      x: token.x * gridSize,
      y: token.y * gridSize,
      draggable: canDrag,
      opacity: !token.isVisible && this.isDm ? 0.4 : 1,
      name: `token-${token.id}`,
    });

    if (token.imageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const konvaImg = new Konva.Image({
          image: img,
          x: 0, y: 0,
          width: tokenPx, height: tokenPx,
          clipFunc: (ctx: CanvasRenderingContext2D) => {
            ctx.arc(tokenPx / 2, tokenPx / 2, tokenPx / 2, 0, Math.PI * 2, false);
          },
        });
        group.add(konvaImg);
        this.tokenLayer.draw();
      };
      img.src = token.imageUrl;
    } else {
      group.add(new Konva.Circle({
        x: tokenPx / 2, y: tokenPx / 2,
        radius: tokenPx / 2,
        fill: token.color,
        stroke: 'rgba(255,255,255,0.6)',
        strokeWidth: 2,
      }));
      group.add(new Konva.Text({
        x: 0, y: tokenPx / 2 - 7,
        width: tokenPx,
        text: this.initials(token.label),
        fontSize: Math.max(10, tokenPx * 0.3),
        fill: 'white',
        align: 'center',
        fontStyle: 'bold',
      }));
    }

    // Label below token
    group.add(new Konva.Text({
      x: -tokenPx * 0.5,
      y: tokenPx + 3,
      width: tokenPx * 2,
      text: token.label,
      fontSize: 11,
      fill: 'white',
      align: 'center',
      shadowColor: 'black',
      shadowBlur: 3,
      shadowOpacity: 0.8,
    }));

    // Condition badges
    if (token.conditions?.length) {
      const badgeSize = Math.max(10, tokenPx * 0.25);
      token.conditions.forEach((cond, i) => {
        const badgeX = i * (badgeSize + 2);
        group.add(new Konva.Circle({
          x: badgeX + badgeSize / 2,
          y: tokenPx + 16 + badgeSize / 2,
          radius: badgeSize / 2,
          fill: this.conditionColor(cond.condition),
          stroke: '#fff',
          strokeWidth: 1,
        }));
        group.add(new Konva.Text({
          x: badgeX,
          y: tokenPx + 16 + badgeSize / 2 - 5,
          width: badgeSize,
          text: cond.condition.slice(0, 1).toUpperCase(),
          fontSize: Math.max(8, badgeSize * 0.6),
          fill: 'white',
          align: 'center',
          fontStyle: 'bold',
        }));
      });
    }

    // Right-click or Ctrl+click selects token (DM only)
    group.on('contextmenu click', (e) => {
      if (!this.isDm) return;
      if (e.type === 'click' && !e.evt.ctrlKey) return;
      e.evt.preventDefault();
      this.tokenSelected.emit(token);
    });

    if (canDrag) {
      group.on('dragend', () => {
        const pos = group.position();
        const gs = this._scene?.gridSize ?? 50;
        const cellX = Math.round(pos.x / gs);
        const cellY = Math.round(pos.y / gs);
        // Snap to grid
        group.position({ x: cellX * gs, y: cellY * gs });
        this.tokenLayer.draw();
        this.tokenDropped.emit({ tokenId: token.id, sceneId: token.sceneId, x: cellX, y: cellY });
      });
    }

    this.tokenMap.set(token.id, group);
    this.tokenLayer.add(group);
  }

  private removeTokenFromStage(tokenId: string) {
    const group = this.tokenMap.get(tokenId);
    if (group) {
      group.destroy();
      this.tokenMap.delete(tokenId);
    }
  }

  private initials(label: string): string {
    return label.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  private conditionColor(condition: string): string {
    const map: Record<string, string> = {
      envenenado: '#4caf50', aturdido: '#ff9800', paralizado: '#9c27b0',
      asustado: '#f44336', cegado: '#607d8b', inconsciente: '#212121',
    };
    return map[condition.toLowerCase()] ?? '#e91e63';
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  private onResize() {
    const el = this.containerRef.nativeElement;
    const w = el.clientWidth;
    if (!w || !this.stage) return;

    this.stage.width(w);
    if (this._scene?.backgroundUrl) {
      this.loadBackground(this._scene.backgroundUrl);
    } else if (this._scene?.gridEnabled) {
      this.drawGrid(this._scene.gridSize);
    }
    this.renderFog();
  }
}
