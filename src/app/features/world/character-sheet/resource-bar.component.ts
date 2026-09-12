import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CharacterResource } from '../models/character-sheet.models';

@Component({
  selector: 'app-resource-bar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="resource-bar">
      <div class="resource-header">
        <span class="resource-name">{{ resource().name }}</span>
        <span class="resource-value">{{ resource().current }} / {{ resource().max }}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill"
             [style.width.%]="fillPercent()"
             [style.background]="resource().color">
        </div>
      </div>
      @if (editable()) {
        <div class="resource-controls">
          <button mat-icon-button (click)="change(-1)"
                  [disabled]="resource().current <= 0" matTooltip="-1">
            <mat-icon>remove</mat-icon>
          </button>
          <button mat-icon-button (click)="change(+1)"
                  [disabled]="resource().current >= resource().max" matTooltip="+1">
            <mat-icon>add</mat-icon>
          </button>
          <button mat-icon-button (click)="change(-5)"
                  [disabled]="resource().current <= 0" matTooltip="-5">
            <mat-icon>remove_circle</mat-icon>
          </button>
          <button mat-icon-button (click)="change(+5)"
                  [disabled]="resource().current >= resource().max" matTooltip="+5">
            <mat-icon>add_circle</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .resource-bar { display: flex; flex-direction: column; gap: 4px; }
    .resource-header { display: flex; justify-content: space-between; align-items: center; }
    .resource-name { font-size: 13px; font-weight: 600; color: #37474f; }
    .resource-value { font-size: 12px; color: #78909c; font-family: monospace; }
    .bar-track { height: 10px; background: #eceff1; border-radius: 5px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 5px; transition: width 0.3s ease; min-width: 2px; }
    .resource-controls { display: flex; gap: 0; margin-top: -4px; }
  `],
})
export class ResourceBarComponent {
  resource = input.required<CharacterResource>();
  editable = input(false);

  valueChanged = output<number>();

  fillPercent(): number {
    const r = this.resource();
    if (r.max <= 0) return 0;
    return Math.min(100, Math.max(0, (r.current / r.max) * 100));
  }

  change(delta: number) {
    const r = this.resource();
    this.valueChanged.emit(Math.max(0, Math.min(r.max, r.current + delta)));
  }
}
