import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { inject } from '@angular/core';
import { GameSession, SessionPresenceEntry } from '../models/session.models';

@Component({
  selector: 'app-session-header',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule],
  template: `
    <header class="session-header">
      <div class="header-left">
        <mat-icon class="header-icon">videogame_asset</mat-icon>
        <div>
          <div class="session-name">{{ session().name }}</div>
          <div class="session-status">Sesión activa</div>
        </div>
      </div>

      <div class="presence-list">
        @for (p of presence(); track p.userId) {
          <div class="presence-pill" [matTooltip]="p.displayName">
            <span class="presence-dot"></span>
            {{ p.displayName }}
          </div>
        }
      </div>

      @if (isDm()) {
        <button mat-stroked-button color="warn" (click)="confirmEnd()">
          <mat-icon>stop_circle</mat-icon>
          Cerrar sesión
        </button>
      }
    </header>
  `,
  styles: [`
    .session-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      background: #1a237e;
      color: white;
      flex-wrap: wrap;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .header-icon { color: #7c4dff; }
    .session-name { font-weight: 600; font-size: 16px; }
    .session-status { font-size: 12px; color: #9fa8da; }
    .presence-list { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
    .presence-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      background: rgba(255,255,255,0.15);
      padding: 3px 8px;
      border-radius: 12px;
      cursor: default;
    }
    .presence-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #69f0ae;
      flex-shrink: 0;
    }
  `],
})
export class SessionHeaderComponent {
  private dialog = inject(MatDialog);

  session = input.required<GameSession>();
  presence = input<SessionPresenceEntry[]>([]);
  isDm = input(false);

  endSession = output<void>();

  confirmEnd() {
    const ok = confirm(`¿Cerrar la sesión "${this.session().name}"? Todos los conectados serán redirigidos.`);
    if (ok) this.endSession.emit();
  }
}
