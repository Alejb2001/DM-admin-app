import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SceneService } from '../../services/scene.service';
import { SessionScene } from '../../models/map.models';
import { SceneFormDialogComponent, SceneFormResult } from './scene-form-dialog.component';

@Component({
  selector: 'app-scene-selector',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatListModule, MatTooltipModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Escenas</span>
        <button mat-icon-button (click)="openCreateDialog()" matTooltip="Nueva escena">
          <mat-icon>add</mat-icon>
        </button>
      </div>
      <mat-nav-list dense class="scene-list">
        @for (scene of scenes(); track scene.id) {
          <mat-list-item
            [class.active]="scene.isActive"
            (click)="activate(scene)"
            [matTooltip]="scene.backgroundUrl ? scene.name : scene.name + ' (sin fondo)'">
            <span matListItemTitle class="scene-name">{{ scene.name }}</span>
            <div matListItemMeta class="scene-actions">
              <button mat-icon-button (click)="openEditDialog(scene, $event)"
                      matTooltip="Editar" size="small">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="confirmDelete(scene, $event)"
                      matTooltip="Eliminar" class="delete-btn" size="small">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </mat-list-item>
        } @empty {
          <div class="empty-hint">Sin escenas — crea la primera</div>
        }
      </mat-nav-list>
    </div>
  `,
  styles: [`
    .panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 4px 8px 4px 12px; border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    .panel-title {
      font-size: 11px; font-weight: 600; color: #90a4ae; text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .scene-list { flex: 1; overflow-y: auto; padding: 0; }
    mat-list-item { cursor: pointer; }
    mat-list-item:hover { background: rgba(255,255,255,0.05); }
    mat-list-item.active { background: rgba(124,77,255,0.2); border-left: 3px solid #7c4dff; }
    .scene-name { font-size: 13px; }
    .scene-actions { display: flex; gap: 0; }
    .delete-btn { color: #ef5350; }
    .empty-hint { padding: 16px 12px; font-size: 12px; color: #546e7a; }
  `],
})
export class SceneSelectorComponent {
  campaignId = input.required<string>();
  sessionId  = input.required<string>();
  scenes     = input<SessionScene[]>([]);

  sceneCreated   = output<SessionScene>();
  sceneUpdated   = output<SessionScene>();
  sceneDeleted   = output<string>();
  sceneActivated = output<SessionScene>();

  private sceneService = inject(SceneService);
  private dialog = inject(MatDialog);

  activate(scene: SessionScene) {
    if (scene.isActive) return;
    this.sceneService.activateScene(this.campaignId(), this.sessionId(), scene.id)
      .subscribe(s => this.sceneActivated.emit(s));
  }

  openCreateDialog() {
    const ref = this.dialog.open(SceneFormDialogComponent, { width: '420px', data: {} });
    ref.afterClosed().subscribe((result: SceneFormResult | undefined) => {
      if (!result) return;
      this.sceneService.createScene(this.campaignId(), this.sessionId(), {
        name: result.name,
        backgroundUrl: result.backgroundUrl,
        gridSize: result.gridSize,
        gridEnabled: result.gridEnabled,
      }).subscribe(s => this.sceneCreated.emit(s));
    });
  }

  openEditDialog(scene: SessionScene, event: Event) {
    event.stopPropagation();
    const ref = this.dialog.open(SceneFormDialogComponent, {
      width: '420px',
      data: { scene },
    });
    ref.afterClosed().subscribe((result: SceneFormResult | undefined) => {
      if (!result) return;
      this.sceneService.updateScene(this.campaignId(), this.sessionId(), scene.id, {
        name: result.name,
        backgroundUrl: result.backgroundUrl,
        gridSize: result.gridSize,
        gridEnabled: result.gridEnabled,
      }).subscribe(s => this.sceneUpdated.emit(s));
    });
  }

  confirmDelete(scene: SessionScene, event: Event) {
    event.stopPropagation();
    if (!confirm(`¿Eliminar la escena "${scene.name}"?`)) return;
    this.sceneService.deleteScene(this.campaignId(), this.sessionId(), scene.id)
      .subscribe(() => this.sceneDeleted.emit(scene.id));
  }
}
