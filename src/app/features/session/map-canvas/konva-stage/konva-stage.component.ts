import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  Input, Output, EventEmitter, OnChanges, SimpleChanges,
} from '@angular/core';
import Konva from 'konva';
import { SessionScene, MapToken } from '../../models/map.models';

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
  @Input() currentUserId = '';
  @Input() isDm = false;

  @Output() tokenDropped = new EventEmitter<TokenDrop>();

  private _scene: SessionScene | null = null;
  private _tokens: MapToken[] = [];

  private stage: Konva.Stage | null = null;
  private backgroundLayer!: Konva.Layer;
  private gridLayer!: Konva.Layer;
  private tokenLayer!: Konva.Layer;
  private tokenMap = new Map<string, Konva.Group>();
  private resizeObserver!: ResizeObserver;

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

    this.stage.add(this.backgroundLayer);
    this.stage.add(this.gridLayer);
    this.stage.add(this.tokenLayer);

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(el);

    // Apply pending inputs
    if (this._scene) this.applyScene(this._scene);
    this.syncTokens(this._tokens);
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
  }
}
