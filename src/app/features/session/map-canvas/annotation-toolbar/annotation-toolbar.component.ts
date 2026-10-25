import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AnnotationType } from '../../models/map.models';

export type AnnotationTool = AnnotationType | 'erase';

@Component({
  selector: 'app-annotation-toolbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="ann-toolbar">
      <div class="section-label">Dibujo</div>

      <!-- Tool buttons -->
      <div class="tool-row">
        @for (tool of tools; track tool.id) {
          <button mat-icon-button
                  [class.active]="activeTool() === tool.id"
                  (click)="setTool(tool.id)"
                  [matTooltip]="tool.label"
                  class="tool-btn">
            <mat-icon>{{ tool.icon }}</mat-icon>
          </button>
        }
      </div>

      <!-- Color palette -->
      @if (activeTool() && activeTool() !== 'erase') {
        <div class="color-row">
          @for (c of colors; track c) {
            <button class="color-dot"
                    [class.selected]="activeColor() === c"
                    [style.background]="c"
                    (click)="colorChange.emit(c)"
                    [matTooltip]="c">
            </button>
          }
        </div>

        <!-- Stroke width -->
        <div class="width-row">
          @for (w of widths; track w.px) {
            <button mat-button
                    [class.active]="activeStroke() === w.px"
                    (click)="strokeChange.emit(w.px)"
                    class="width-btn">
              <span [style.height.px]="w.px" class="width-line"></span>
            </button>
          }
        </div>

        <!-- Fill opacity (for rect/circle) -->
        @if (activeTool() === 'rect' || activeTool() === 'circle') {
          <div class="fill-row">
            <span class="fill-label">Relleno:</span>
            @for (op of fillOps; track op.v) {
              <button mat-button
                      [class.active]="activeFill() === op.v"
                      (click)="fillChange.emit(op.v)"
                      class="fill-btn">
                {{ op.label }}
              </button>
            }
          </div>
        }
      }

      <!-- Clear all -->
      @if (activeTool()) {
        <button mat-button color="warn" (click)="clearAll.emit()" class="clear-btn" matTooltip="Borrar todas las anotaciones">
          <mat-icon>delete_sweep</mat-icon> Limpiar
        </button>
      }
    </div>
  `,
  styles: [`
    .ann-toolbar {
      padding: 8px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .section-label {
      font-size: 10px; color: rgba(255,255,255,0.4);
      text-transform: uppercase; letter-spacing: 1px;
      padding: 0 4px;
    }
    .tool-row {
      display: flex; flex-wrap: wrap; gap: 2px;
    }
    .tool-btn {
      width: 32px; height: 32px;
      color: rgba(255,255,255,0.6) !important;
    }
    .tool-btn.active {
      color: #ff9800 !important;
      background: rgba(255,152,0,0.15) !important;
      border-radius: 4px;
    }
    .color-row {
      display: flex; flex-wrap: wrap; gap: 5px; padding: 2px 4px;
    }
    .color-dot {
      width: 18px; height: 18px;
      border-radius: 50%; border: 2px solid transparent; cursor: pointer;
      padding: 0; flex-shrink: 0;
    }
    .color-dot.selected {
      border-color: #fff;
    }
    .width-row {
      display: flex; gap: 4px; padding: 2px 4px; align-items: center;
    }
    .width-btn {
      min-width: 28px !important; padding: 4px !important;
      display: flex; align-items: center; justify-content: center;
    }
    .width-btn.active { background: rgba(255,152,0,0.15) !important; }
    .width-line {
      display: block; width: 20px; background: rgba(255,255,255,0.7);
      border-radius: 2px;
    }
    .fill-row {
      display: flex; align-items: center; gap: 4px; padding: 0 4px;
    }
    .fill-label { font-size: 10px; color: rgba(255,255,255,0.5); }
    .fill-btn { min-width: 32px !important; padding: 2px 4px !important; font-size: 10px !important; }
    .fill-btn.active { background: rgba(255,152,0,0.15) !important; }
    .clear-btn { font-size: 11px !important; width: 100%; justify-content: flex-start; }
  `],
})
export class AnnotationToolbarComponent {
  activeTool  = input<AnnotationTool | null>(null);
  activeColor = input<string>('#ef5350');
  activeStroke = input<number>(2);
  activeFill  = input<number>(0);

  toolChange   = output<AnnotationTool | null>();
  colorChange  = output<string>();
  strokeChange = output<number>();
  fillChange   = output<number>();
  clearAll     = output<void>();

  readonly tools: { id: AnnotationTool; icon: string; label: string }[] = [
    { id: 'pen',    icon: 'draw',         label: 'Pluma libre' },
    { id: 'line',   icon: 'remove',       label: 'Línea' },
    { id: 'arrow',  icon: 'arrow_forward',label: 'Flecha' },
    { id: 'rect',   icon: 'crop_square',  label: 'Rectángulo' },
    { id: 'circle', icon: 'circle',       label: 'Círculo' },
    { id: 'text',   icon: 'text_fields',  label: 'Texto' },
    { id: 'erase',  icon: 'auto_fix_normal', label: 'Goma (clic en anotación)' },
  ];

  readonly colors = [
    '#ef5350', '#ff9800', '#ffeb3b', '#66bb6a',
    '#42a5f5', '#ab47bc', '#ffffff', '#212121',
  ];

  readonly widths = [
    { px: 2, label: 'Fino' },
    { px: 4, label: 'Medio' },
    { px: 8, label: 'Grueso' },
  ];

  readonly fillOps = [
    { v: 0,   label: 'Sin' },
    { v: 0.2, label: '20%' },
    { v: 0.5, label: '50%' },
  ];

  setTool(tool: AnnotationTool) {
    this.toolChange.emit(this.activeTool() === tool ? null : tool);
  }
}
