import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SceneService } from '../../services/scene.service';
import { MapToken } from '../../models/map.models';

const PRESET_COLORS = [
  '#7E57C2', '#E53935', '#1E88E5', '#43A047',
  '#FB8C00', '#00ACC1', '#8E24AA', '#6D4C41',
];

@Component({
  selector: 'app-token-panel',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule,
            MatFormFieldModule, MatInputModule, MatTooltipModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Tokens</span>
        <button mat-icon-button (click)="toggleForm()" [matTooltip]="showForm() ? 'Cerrar' : 'Añadir token'">
          <mat-icon>{{ showForm() ? 'close' : 'add_circle' }}</mat-icon>
        </button>
      </div>

      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="token-form">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre del token</mat-label>
            <input matInput formControlName="label" placeholder="Aldric, Goblin 1..." />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>URL de imagen (opcional)</mat-label>
            <input matInput formControlName="imageUrl" placeholder="https://..." />
          </mat-form-field>
          <div class="color-row">
            <span class="color-label">Color</span>
            @for (c of colors; track c) {
              <div class="color-dot"
                   [style.background]="c"
                   [class.selected]="form.get('color')?.value === c"
                   (click)="form.get('color')!.setValue(c)"
                   [matTooltip]="c">
              </div>
            }
          </div>
          <div class="pos-row">
            <mat-form-field appearance="outline" style="width:80px">
              <mat-label>Col (X)</mat-label>
              <input matInput type="number" formControlName="x" min="0" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:80px">
              <mat-label>Fila (Y)</mat-label>
              <input matInput type="number" formControlName="y" min="0" />
            </mat-form-field>
          </div>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || !sceneId()">
            Colocar token
          </button>
          @if (!sceneId()) {
            <p class="hint">Activa una escena primero</p>
          }
        </form>
      }

      <div class="token-list">
        @for (token of tokens(); track token.id) {
          <div class="token-row">
            <div class="token-dot" [style.background]="token.color">
              {{ initials(token.label) }}
            </div>
            <span class="token-label">{{ token.label }}</span>
            <button mat-icon-button class="delete-btn"
                    (click)="deleteToken(token)" matTooltip="Eliminar">
              <mat-icon>remove_circle_outline</mat-icon>
            </button>
          </div>
        } @empty {
          @if (!showForm()) {
            <div class="empty-hint">Sin tokens en la escena activa</div>
          }
        }
      </div>
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
      font-size: 11px; font-weight: 600; color: #90a4ae;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .token-form { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .full { width: 100%; display: block; }
    .color-row { display: flex; align-items: center; gap: 6px; margin: 4px 0 12px; }
    .color-label { font-size: 12px; color: #90a4ae; margin-right: 4px; }
    .color-dot {
      width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
      border: 2px solid transparent; transition: border-color .15s;
    }
    .color-dot.selected { border-color: white; }
    .pos-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .hint { font-size: 11px; color: #ef5350; margin: 4px 0 0; }
    .token-list { flex: 1; overflow-y: auto; padding: 4px 0; }
    .token-row {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 8px; border-radius: 4px;
    }
    .token-row:hover { background: rgba(255,255,255,0.05); }
    .token-dot {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: bold; color: white;
    }
    .token-label { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .delete-btn { color: #ef5350; flex-shrink: 0; }
    .empty-hint { padding: 12px; font-size: 12px; color: #546e7a; text-align: center; }
  `],
})
export class TokenPanelComponent {
  campaignId = input.required<string>();
  sessionId  = input.required<string>();
  sceneId    = input<string | null>(null);
  tokens     = input<MapToken[]>([]);

  tokenAdded   = output<MapToken>();
  tokenDeleted = output<string>();

  private sceneService = inject(SceneService);
  private fb = inject(FormBuilder);

  readonly colors = PRESET_COLORS;
  showForm = signal(false);

  form = this.fb.group({
    label:    ['', [Validators.required, Validators.maxLength(100)]],
    imageUrl: [''],
    color:    [PRESET_COLORS[0]],
    x:        [0, [Validators.required, Validators.min(0)]],
    y:        [0, [Validators.required, Validators.min(0)]],
  });

  toggleForm() {
    this.showForm.update(v => !v);
    if (!this.showForm()) this.form.reset({ color: PRESET_COLORS[0], x: 0, y: 0 });
  }

  submit() {
    if (this.form.invalid || !this.sceneId()) return;
    const v = this.form.value;
    this.sceneService.addToken(this.campaignId(), this.sessionId(), this.sceneId()!, {
      label:    v.label!,
      imageUrl: v.imageUrl || null,
      color:    v.color ?? PRESET_COLORS[0],
      x: v.x!, y: v.y!,
      width: 1, height: 1,
    }).subscribe(token => {
      this.tokenAdded.emit(token);
      this.form.reset({ color: PRESET_COLORS[0], x: 0, y: 0 });
      this.showForm.set(false);
    });
  }

  deleteToken(token: MapToken) {
    if (!token.sceneId) return;
    this.sceneService.deleteToken(this.campaignId(), this.sessionId(), token.sceneId, token.id)
      .subscribe(() => this.tokenDeleted.emit(token.id));
  }

  initials(label: string): string {
    return label.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }
}
