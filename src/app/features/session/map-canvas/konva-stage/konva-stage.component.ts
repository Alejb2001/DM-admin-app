import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  Input, Output, EventEmitter, OnChanges, SimpleChanges,
} from '@angular/core';
import Konva from 'konva';
import { SessionScene, MapToken, SceneAnnotation, AnnotationType } from '../../models/map.models';
import { FogZone } from '../../models/vtt-advanced.models';

interface AnnotationDrawPayload {
  type: AnnotationType;
  points: number[];
  color: string;
  strokeWidth: number;
  fillColor: string | null;
  fillOpacity: number;
  text: string | null;
  fontSize: number;
}

interface TokenDrop {
  tokenId: string;
  sceneId: string;
  x: number;
  y: number;
}

interface Point { x: number; y: number; }

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
  @Input() set annotations(value: SceneAnnotation[]) {
    this._annotations = value;
    if (this.stage) this.renderAnnotations();
  }
  @Input() set panMode(value: boolean) {
    this._panMode = value;
    if (this.stage) this.applyPanMode(value);
  }
  @Input() currentUserId = '';
  @Input() isDm = false;

  @Output() tokenDropped      = new EventEmitter<TokenDrop>();
  @Output() fogZoneDrawn      = new EventEmitter<{ shape: string; x: number; y: number; width?: number; height?: number; radius?: number }>();
  @Output() tokenSelected     = new EventEmitter<MapToken | null>();
  @Output() mapDblClick       = new EventEmitter<Point>();
  @Output() annotationDrawn   = new EventEmitter<AnnotationDrawPayload>();
  @Output() annotationErased  = new EventEmitter<string>();

  private _scene: SessionScene | null = null;
  private _tokens: MapToken[] = [];
  private _fogZones: FogZone[] = [];
  private _annotations: SceneAnnotation[] = [];
  private _panMode = false;

  private stage: Konva.Stage | null = null;
  private backgroundLayer!: Konva.Layer;
  private gridLayer!: Konva.Layer;
  private tokenLayer!: Konva.Layer;
  private fogLayer!: Konva.Layer;
  private annotationLayer!: Konva.Layer;
  private uiLayer!: Konva.Layer;
  private tokenMap = new Map<string, Konva.Group>();
  private annotationMap = new Map<string, Konva.Shape | Konva.Line | Konva.Text | Konva.Arrow>();
  private resizeObserver!: ResizeObserver;

  // Fog drawing state
  fogDrawingTool: 'rect' | 'circle' | null = null;
  private fogDrawing = false;
  private fogStartPos: { x: number; y: number } | null = null;
  private fogPreview: Konva.Shape | null = null;

  // Annotation drawing state
  annotationTool: AnnotationType | 'erase' | null = null;
  annotationColor = '#ef5350';
  annotationStrokeWidth = 2;
  annotationFillColor: string | null = null;
  annotationFillOpacity = 0;
  annotationFontSize = 16;
  private annotDrawing = false;
  private annotStartPos: { x: number; y: number } | null = null;
  private annotPenPoints: number[] = [];
  private annotPreview: Konva.Shape | Konva.Line | Konva.Arrow | null = null;

  // Pan state (middle-mouse drag)
  private isPanning = false;
  private panLastPos = { x: 0, y: 0 };

  // Touch zoom state
  private lastPinchDist = 0;

  // Cleanup references for window listeners
  private onWindowMouseMove!: (e: MouseEvent) => void;
  private onWindowMouseUp!: (e: MouseEvent) => void;

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
    this.annotationLayer = new Konva.Layer();
    this.uiLayer = new Konva.Layer();

    this.stage.add(this.backgroundLayer);
    this.stage.add(this.gridLayer);
    this.stage.add(this.tokenLayer);
    this.stage.add(this.fogLayer);
    this.stage.add(this.annotationLayer);
    this.stage.add(this.uiLayer);

    this.setupFogDrawing();
    this.setupAnnotationDrawing();
    this.setupZoomPan();

    // Click on empty stage deselects token
    this.stage.on('click', (e) => {
      if (e.target === this.stage) this.tokenSelected.emit(null);
    });

    // Double-click on empty stage emits position (for ping)
    this.stage.on('dblclick', (e) => {
      if (e.target !== this.stage) return;
      const pos = this.stage!.getRelativePointerPosition()!;
      this.mapDblClick.emit(pos);
    });

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(el);

    // Apply pending inputs
    if (this._scene) this.applyScene(this._scene);
    this.syncTokens(this._tokens);
    this.renderFog();
    this.renderAnnotations();
    this.applyPanMode(this._panMode);
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
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
    this.stage?.destroy();
  }

  // ── Zoom / Pan ───────────────────────────────────────────────────────────────

  private setupZoomPan() {
    const stage = this.stage!;
    const SCALE_BY = 1.1;
    const MIN_SCALE = 0.15;
    const MAX_SCALE = 8;

    // Mouse-wheel zoom centered on pointer
    stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition()!;
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE,
        oldScale * (direction > 0 ? SCALE_BY : 1 / SCALE_BY)));
      stage.scale({ x: newScale, y: newScale });
      stage.position({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    });

    // Middle-mouse-button drag to pan (always available regardless of panMode)
    const el = this.containerRef.nativeElement;
    el.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      this.isPanning = true;
      this.panLastPos = { x: e.clientX, y: e.clientY };
      el.style.cursor = 'grabbing';
    });
    this.onWindowMouseMove = (e: MouseEvent) => {
      if (!this.isPanning) return;
      const dx = e.clientX - this.panLastPos.x;
      const dy = e.clientY - this.panLastPos.y;
      stage.position({ x: stage.x() + dx, y: stage.y() + dy });
      this.panLastPos = { x: e.clientX, y: e.clientY };
    };
    this.onWindowMouseUp = (e: MouseEvent) => {
      if (e.button !== 1) return;
      this.isPanning = false;
      el.style.cursor = '';
    };
    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);

    // Pinch-to-zoom on touch devices
    stage.on('touchmove', (e) => {
      const touches = e.evt.touches;
      if (touches.length !== 2) return;
      e.evt.preventDefault();
      const dist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
      if (this.lastPinchDist > 0) {
        const oldScale = stage.scaleX();
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE,
          oldScale * (dist / this.lastPinchDist)));
        stage.scale({ x: newScale, y: newScale });
      }
      this.lastPinchDist = dist;
    });
    stage.on('touchend', () => { this.lastPinchDist = 0; });
  }

  private applyPanMode(enabled: boolean) {
    if (!this.stage) return;
    this.stage.draggable(enabled);
    this.stage.container().style.cursor = enabled ? 'grab' : '';
    // Toggle token draggability
    for (const token of this._tokens) {
      const canDrag = !enabled && !token.isLocked && (this.isDm || token.controlledBy === this.currentUserId);
      this.tokenMap.get(token.id)?.draggable(canDrag);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  resetView() {
    if (!this.stage) return;
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
  }

  showPing(x: number, y: number) {
    if (!this.stage) return;
    const circle = new Konva.Circle({
      x, y, radius: 8, fill: 'transparent',
      stroke: '#ff5722', strokeWidth: 3, opacity: 1,
      listening: false,
    });
    this.uiLayer.add(circle);
    this.uiLayer.draw();

    const anim = new Konva.Tween({
      node: circle,
      duration: 1.2,
      radius: 80,
      opacity: 0,
      easing: Konva.Easings.EaseOut,
      onFinish: () => { circle.destroy(); this.uiLayer.draw(); },
    });
    anim.play();
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

  // ── Annotations ─────────────────────────────────────────────────────────────

  renderAnnotations() {
    if (!this.annotationLayer) return;
    this.annotationLayer.destroyChildren();
    this.annotationMap.clear();
    for (const ann of this._annotations) {
      this.renderOneAnnotation(ann);
    }
    this.annotationLayer.draw();
  }

  addAnnotation(ann: SceneAnnotation) {
    this.renderOneAnnotation(ann);
    this.annotationLayer.draw();
  }

  removeAnnotation(id: string) {
    const shape = this.annotationMap.get(id);
    if (shape) { shape.destroy(); this.annotationMap.delete(id); }
    this.annotationLayer.draw();
  }

  private renderOneAnnotation(ann: SceneAnnotation) {
    const pts = ann.points;
    const commonAttrs = {
      stroke: ann.color,
      strokeWidth: ann.strokeWidth,
      listening: true,
      name: `ann-${ann.id}`,
    };
    const fillAttrs = {
      fill: ann.fillColor ?? ann.color,
      fillOpacity: ann.fillOpacity,
      closed: false,
    };

    let shape: Konva.Shape | Konva.Line | Konva.Arrow | Konva.Text | null = null;

    switch (ann.type) {
      case 'pen':
        shape = new Konva.Line({ ...commonAttrs, points: pts, tension: 0.4, lineCap: 'round' });
        break;
      case 'line':
        shape = new Konva.Line({ ...commonAttrs, points: pts, lineCap: 'round' });
        break;
      case 'arrow':
        shape = new Konva.Arrow({
          ...commonAttrs,
          points: pts,
          pointerLength: Math.max(8, ann.strokeWidth * 3),
          pointerWidth: Math.max(6, ann.strokeWidth * 2),
          fill: ann.color,
        });
        break;
      case 'rect':
        if (pts.length >= 4) {
          shape = new Konva.Rect({
            ...commonAttrs,
            x: pts[0], y: pts[1], width: pts[2], height: pts[3],
            fill: ann.fillOpacity > 0 ? ann.fillColor ?? ann.color : 'transparent',
            opacity: ann.fillOpacity > 0 ? ann.fillOpacity : 1,
          });
        }
        break;
      case 'circle':
        if (pts.length >= 3) {
          shape = new Konva.Circle({
            ...commonAttrs,
            x: pts[0], y: pts[1], radius: pts[2],
            fill: ann.fillOpacity > 0 ? ann.fillColor ?? ann.color : 'transparent',
            opacity: ann.fillOpacity > 0 ? ann.fillOpacity : 1,
          });
        }
        break;
      case 'text':
        if (pts.length >= 2) {
          shape = new Konva.Text({
            x: pts[0], y: pts[1],
            text: ann.text ?? '',
            fontSize: ann.fontSize,
            fill: ann.color,
            listening: true,
            name: `ann-${ann.id}`,
          });
        }
        break;
    }

    if (!shape) return;

    const node = shape as unknown as Konva.Node;
    node.on('click', () => {
      if (this.annotationTool === 'erase') {
        this.annotationErased.emit(ann.id);
      }
    });

    // Highlight on hover in erase mode
    node.on('mouseenter', () => {
      if (this.annotationTool === 'erase') {
        (shape as any).opacity(0.5);
        this.annotationLayer.draw();
        this.stage!.container().style.cursor = 'crosshair';
      }
    });
    node.on('mouseleave', () => {
      (shape as any).opacity(1);
      this.annotationLayer.draw();
      if (this.annotationTool === 'erase') this.stage!.container().style.cursor = '';
    });

    this.annotationMap.set(ann.id, shape as any);
    this.annotationLayer.add(shape as any);
  }

  private setupAnnotationDrawing() {
    if (!this.stage) return;

    this.stage.on('mousedown touchstart', (e) => {
      if (!this.annotationTool || this.annotationTool === 'erase' || !this.isDm) return;
      if (e.evt.button === 1) return; // middle mouse reserved for pan
      this.annotDrawing = true;
      const pos = this.stage!.getRelativePointerPosition()!;
      this.annotStartPos = { x: pos.x, y: pos.y };
      this.annotPenPoints = [pos.x, pos.y];

      if (this.annotationTool === 'text') {
        this.annotDrawing = false;
        const text = window.prompt('Texto de la anotación:');
        if (text) {
          this.annotationDrawn.emit({
            type: 'text', points: [pos.x, pos.y], color: this.annotationColor,
            strokeWidth: this.annotationStrokeWidth, fillColor: null, fillOpacity: 0,
            text, fontSize: this.annotationFontSize,
          });
        }
      }
    });

    this.stage.on('mousemove touchmove', () => {
      if (!this.annotDrawing || !this.annotStartPos || this.annotationTool === 'erase') return;
      const pos = this.stage!.getRelativePointerPosition()!;

      if (this.annotPreview) {
        this.annotPreview.destroy();
        this.annotPreview = null;
      }

      const color = this.annotationColor;
      const sw = this.annotationStrokeWidth;

      switch (this.annotationTool) {
        case 'pen':
          this.annotPenPoints.push(pos.x, pos.y);
          this.annotPreview = new Konva.Line({
            points: [...this.annotPenPoints],
            stroke: color, strokeWidth: sw, tension: 0.4, lineCap: 'round', listening: false,
          });
          break;
        case 'line':
          this.annotPreview = new Konva.Line({
            points: [this.annotStartPos.x, this.annotStartPos.y, pos.x, pos.y],
            stroke: color, strokeWidth: sw, lineCap: 'round', listening: false,
          });
          break;
        case 'arrow':
          this.annotPreview = new Konva.Arrow({
            points: [this.annotStartPos.x, this.annotStartPos.y, pos.x, pos.y],
            stroke: color, strokeWidth: sw, fill: color,
            pointerLength: Math.max(8, sw * 3), pointerWidth: Math.max(6, sw * 2), listening: false,
          });
          break;
        case 'rect': {
          const x = Math.min(pos.x, this.annotStartPos.x);
          const y = Math.min(pos.y, this.annotStartPos.y);
          const w = Math.abs(pos.x - this.annotStartPos.x);
          const h = Math.abs(pos.y - this.annotStartPos.y);
          this.annotPreview = new Konva.Rect({
            x, y, width: w, height: h,
            stroke: color, strokeWidth: sw,
            fill: this.annotationFillOpacity > 0 ? (this.annotationFillColor ?? color) : 'transparent',
            opacity: this.annotationFillOpacity > 0 ? this.annotationFillOpacity : 1,
            listening: false,
          });
          break;
        }
        case 'circle': {
          const dx = pos.x - this.annotStartPos.x;
          const dy = pos.y - this.annotStartPos.y;
          const r = Math.sqrt(dx * dx + dy * dy);
          this.annotPreview = new Konva.Circle({
            x: this.annotStartPos.x, y: this.annotStartPos.y, radius: r,
            stroke: color, strokeWidth: sw,
            fill: this.annotationFillOpacity > 0 ? (this.annotationFillColor ?? color) : 'transparent',
            opacity: this.annotationFillOpacity > 0 ? this.annotationFillOpacity : 1,
            listening: false,
          });
          break;
        }
      }

      if (this.annotPreview) {
        this.annotationLayer.add(this.annotPreview);
        this.annotationLayer.draw();
      }
    });

    this.stage.on('mouseup touchend', () => {
      if (!this.annotDrawing || !this.annotStartPos) return;
      const pos = this.stage!.getRelativePointerPosition()!;
      this.annotDrawing = false;

      if (this.annotPreview) {
        this.annotPreview.destroy();
        this.annotPreview = null;
        this.annotationLayer.draw();
      }

      const color = this.annotationColor;
      const sw = this.annotationStrokeWidth;
      const type = this.annotationTool as AnnotationType;
      let pts: number[] = [];

      switch (type) {
        case 'pen':
          pts = this.annotPenPoints;
          break;
        case 'line':
          pts = [this.annotStartPos.x, this.annotStartPos.y, pos.x, pos.y];
          break;
        case 'arrow':
          pts = [this.annotStartPos.x, this.annotStartPos.y, pos.x, pos.y];
          break;
        case 'rect': {
          const x = Math.min(pos.x, this.annotStartPos.x);
          const y = Math.min(pos.y, this.annotStartPos.y);
          const w = Math.abs(pos.x - this.annotStartPos.x);
          const h = Math.abs(pos.y - this.annotStartPos.y);
          pts = [x, y, w, h];
          break;
        }
        case 'circle': {
          const dx = pos.x - this.annotStartPos.x;
          const dy = pos.y - this.annotStartPos.y;
          pts = [this.annotStartPos.x, this.annotStartPos.y, Math.sqrt(dx * dx + dy * dy)];
          break;
        }
      }

      const minDist = type === 'pen' ? 5 : 10;
      const totalDist = pts.length >= 4
        ? Math.hypot(pts[pts.length - 2] - pts[0], pts[pts.length - 1] - pts[1])
        : pts.length;
      if (totalDist < minDist && type !== 'pen') {
        this.annotStartPos = null;
        this.annotPenPoints = [];
        return;
      }

      this.annotationDrawn.emit({
        type, points: pts, color, strokeWidth: sw,
        fillColor: this.annotationFillColor, fillOpacity: this.annotationFillOpacity,
        text: null, fontSize: this.annotationFontSize,
      });

      this.annotStartPos = null;
      this.annotPenPoints = [];
    });
  }

  private setupFogDrawing() {
    if (!this.stage) return;

    this.stage.on('mousedown touchstart', (e) => {
      if (!this.fogDrawingTool || !this.isDm) return;
      this.fogDrawing = true;
      const pos = this.stage!.getRelativePointerPosition()!;
      this.fogStartPos = { x: pos.x, y: pos.y };
    });

    this.stage.on('mousemove touchmove', () => {
      if (!this.fogDrawing || !this.fogStartPos) return;
      const pos = this.stage!.getRelativePointerPosition()!;

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
      const pos = this.stage!.getRelativePointerPosition()!;
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
    const isLocked = token.isLocked;
    const canDrag = !this._panMode && !isLocked && (this.isDm || token.controlledBy === this.currentUserId);
    const tokenPx = token.width * gridSize;

    const group = new Konva.Group({
      x: token.x * gridSize,
      y: token.y * gridSize,
      draggable: canDrag,
      rotation: token.rotation ?? 0,
      opacity: !token.isVisible && this.isDm ? 0.4 : 1,
      name: `token-${token.id}`,
    });

    // Aura (drawn first so it sits behind everything)
    if (token.auraRadius && token.auraRadius > 0) {
      group.add(new Konva.Circle({
        x: tokenPx / 2, y: tokenPx / 2,
        radius: tokenPx / 2 + token.auraRadius * gridSize,
        fill: token.auraColor ?? '#ffffff',
        opacity: token.auraOpacity ?? 0.3,
        listening: false,
      }));
    }

    // Helper: overlays drawn on top of the token body
    const addOverlays = () => {
      // HP Bar 1 (closest to token)
      if (token.bar1Value != null && token.bar1Max != null && token.bar1Max > 0) {
        this.addHpBar(group, tokenPx, -9, token.bar1Value, token.bar1Max, token.bar1Color ?? '#4caf50');
      }
      // HP Bar 2
      if (token.bar2Value != null && token.bar2Max != null && token.bar2Max > 0) {
        this.addHpBar(group, tokenPx, -16, token.bar2Value, token.bar2Max, token.bar2Color ?? '#2196f3');
      }
      // Lock indicator
      if (isLocked) {
        group.add(new Konva.Text({
          x: tokenPx - 14, y: tokenPx - 14,
          text: '\uD83D\uDD12', fontSize: 12, listening: false,
        }));
      }
      // Label below token
      group.add(new Konva.Text({
        x: -tokenPx * 0.5, y: tokenPx + 3,
        width: tokenPx * 2, text: token.label,
        fontSize: 11, fill: 'white', align: 'center',
        shadowColor: 'black', shadowBlur: 3, shadowOpacity: 0.8,
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
            stroke: '#fff', strokeWidth: 1,
          }));
          group.add(new Konva.Text({
            x: badgeX, y: tokenPx + 16 + badgeSize / 2 - 5,
            width: badgeSize,
            text: cond.condition.slice(0, 1).toUpperCase(),
            fontSize: Math.max(8, badgeSize * 0.6),
            fill: 'white', align: 'center', fontStyle: 'bold',
          }));
        });
      }
    };

    if (token.imageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        group.add(new Konva.Image({
          image: img, x: 0, y: 0, width: tokenPx, height: tokenPx,
          clipFunc: (ctx: CanvasRenderingContext2D) => {
            ctx.arc(tokenPx / 2, tokenPx / 2, tokenPx / 2, 0, Math.PI * 2, false);
          },
        }));
        addOverlays();
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
        fill: 'white', align: 'center', fontStyle: 'bold',
      }));
      addOverlays();
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
        group.position({ x: cellX * gs, y: cellY * gs });
        this.tokenLayer.draw();
        this.tokenDropped.emit({ tokenId: token.id, sceneId: token.sceneId, x: cellX, y: cellY });
      });
    }

    this.tokenMap.set(token.id, group);
    this.tokenLayer.add(group);
  }

  private addHpBar(group: Konva.Group, tokenPx: number, offsetY: number,
                   value: number, max: number, color: string) {
    const pct = Math.max(0, Math.min(1, value / max));
    group.add(new Konva.Rect({
      x: 0, y: offsetY, width: tokenPx, height: 5,
      fill: 'rgba(0,0,0,0.6)', cornerRadius: 2, listening: false,
    }));
    if (pct > 0) {
      group.add(new Konva.Rect({
        x: 0, y: offsetY, width: tokenPx * pct, height: 5,
        fill: color, cornerRadius: 2, listening: false,
      }));
    }
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
