import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TokenConditionInfo } from '../models/map.models';

const CONDITION_LIST = [
  { name: 'Envenenado',   icon: 'science',      color: '#4caf50' },
  { name: 'Aturdido',     icon: 'rotate_right',  color: '#ff9800' },
  { name: 'Paralizado',   icon: 'pause_circle',  color: '#9c27b0' },
  { name: 'Asustado',     icon: 'warning',       color: '#f44336' },
  { name: 'Cegado',       icon: 'visibility_off',color: '#607d8b' },
  { name: 'Inconsciente', icon: 'bedtime',       color: '#212121' },
  { name: 'Concentrando', icon: 'psychology',    color: '#2196f3' },
  { name: 'Inmovilizado', icon: 'lock',          color: '#795548' },
];

@Component({
  selector: 'app-condition-picker',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatDividerModule],
  template: `
    <div class="picker">
      <p class="picker-title">Condiciones</p>
      <div class="condition-grid">
        @for (c of conditions; track c.name) {
          @if (hasCondition(c.name)) {
            <button mat-icon-button
                    [style.color]="c.color"
                    [matTooltip]="'Quitar ' + c.name"
                    (click)="removeConditionByName(c.name)">
              <mat-icon>{{ c.icon }}</mat-icon>
            </button>
          } @else {
            <button mat-icon-button
                    style="color: rgba(255,255,255,0.3)"
                    [matTooltip]="'Añadir ' + c.name"
                    (click)="addCond.emit(c.name)">
              <mat-icon>{{ c.icon }}</mat-icon>
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .picker { padding: 8px; background: #1a1a2e; min-width: 160px; }
    .picker-title { font-size: 11px; color: #9e9e9e; margin: 0 0 6px; text-transform: uppercase; letter-spacing: .5px; }
    .condition-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
  `],
})
export class ConditionPickerComponent {
  activeConditions = input<TokenConditionInfo[]>([]);

  addCond    = output<string>();
  removeCond = output<string>(); // conditionId

  readonly conditions = CONDITION_LIST;

  hasCondition(name: string): boolean {
    return this.activeConditions().some(c => c.condition.toLowerCase() === name.toLowerCase());
  }

  removeConditionByName(name: string) {
    const found = this.activeConditions().find(
      c => c.condition.toLowerCase() === name.toLowerCase());
    if (found) this.removeCond.emit(found.id);
  }
}
