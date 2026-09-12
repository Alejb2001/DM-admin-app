import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-fog-toolbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="fog-toolbar">
      <button mat-icon-button
              (click)="toggleFog.emit()"
              [matTooltip]="fogEnabled() ? 'Desactivar niebla' : 'Activar niebla'"
              [class.active]="fogEnabled()">
        <mat-icon>{{ fogEnabled() ? 'cloud' : 'cloud_off' }}</mat-icon>
      </button>

      @if (fogEnabled()) {
        <button mat-icon-button
                (click)="setTool.emit(activeTool() === 'rect' ? null : 'rect')"
                [class.active]="activeTool() === 'rect'"
                matTooltip="Revelar rectángulo">
          <mat-icon>crop_square</mat-icon>
        </button>

        <button mat-icon-button
                (click)="setTool.emit(activeTool() === 'circle' ? null : 'circle')"
                [class.active]="activeTool() === 'circle'"
                matTooltip="Revelar círculo">
          <mat-icon>radio_button_unchecked</mat-icon>
        </button>

        <button mat-icon-button
                (click)="clearFog.emit()"
                matTooltip="Limpiar revelaciones">
          <mat-icon>layers_clear</mat-icon>
        </button>
      }
    </div>
  `,
  styles: [`
    .fog-toolbar {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 4px;
    }
    button.active { color: #ffeb3b; }
    button { color: rgba(255,255,255,0.7); }
  `],
})
export class FogToolbarComponent {
  fogEnabled = input<boolean>(false);
  activeTool = input<'rect' | 'circle' | null>(null);

  toggleFog = output<void>();
  setTool   = output<'rect' | 'circle' | null>();
  clearFog  = output<void>();
}
