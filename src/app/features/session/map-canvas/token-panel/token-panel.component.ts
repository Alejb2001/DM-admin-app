import { Component, inject, input, output, signal, effect } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SceneService } from '../../services/scene.service';
import { MapToken } from '../../models/map.models';

const PRESET_COLORS = [
  '#7E57C2', '#E53935', '#1E88E5', '#43A047',
  '#FB8C00', '#00ACC1', '#8E24AA', '#6D4C41',
];

const BAR_COLORS = ['#4caf50', '#f44336', '#2196f3', '#ffeb3b', '#9c27b0', '#ff9800'];

@Component({
  selector: 'app-token-panel',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule,
            MatFormFieldModule, MatInputModule, MatTooltipModule, MatCheckboxModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">{{ selectedToken() ? 'Editar token' : 'Tokens' }}</span>
        @if (!selectedToken()) {
          <button mat-icon-button (click)="toggleForm()" [matTooltip]="showForm() ? 'Cerrar' : 'Añadir token'">
            <mat-icon>{{ showForm() ? 'close' : 'add_circle' }}</mat-icon>
          </button>
        }
      </div>

      <!-- CREATE FORM -->
      @if (!selectedToken() && showForm()) {
        <form [formGroup]="createForm" (ngSubmit)="submit()" class="token-form">
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
                   [class.selected]="createForm.get('color')?.value === c"
                   (click)="createForm.get('color')!.setValue(c)"
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
          <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || !sceneId()">
            Colocar token
          </button>
          @if (!sceneId()) {
            <p class="hint">Activa una escena primero</p>
          }
        </form>
      }

      <!-- EDIT FORM (when a token is selected) -->
      @if (selectedToken()) {
        <form [formGroup]="editForm" (ngSubmit)="saveToken()" class="token-form edit-form-scroll">

          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="label" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>URL de imagen</mat-label>
            <input matInput formControlName="imageUrl" placeholder="https://..." />
          </mat-form-field>

          <div class="color-row">
            <span class="color-label">Color</span>
            @for (c of colors; track c) {
              <div class="color-dot"
                   [style.background]="c"
                   [class.selected]="editForm.get('color')?.value === c"
                   (click)="editForm.get('color')!.setValue(c)">
              </div>
            }
          </div>

          <div class="pos-row">
            <mat-form-field appearance="outline" style="width:70px">
              <mat-label>Ancho</mat-label>
              <input matInput type="number" formControlName="width" min="1" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:70px">
              <mat-label>Alto</mat-label>
              <input matInput type="number" formControlName="height" min="1" />
            </mat-form-field>
          </div>

          <div class="toggle-row">
            <mat-checkbox formControlName="isVisible" color="primary">Visible</mat-checkbox>
            <mat-checkbox formControlName="isLocked" color="warn">Bloqueado</mat-checkbox>
          </div>

          <p class="section-label">Barras HP</p>
          <div class="bar-row">
            <mat-form-field appearance="outline" style="width:52px">
              <mat-label>Val 1</mat-label>
              <input matInput type="number" formControlName="bar1Value" min="0" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:52px">
              <mat-label>Máx 1</mat-label>
              <input matInput type="number" formControlName="bar1Max" min="1" />
            </mat-form-field>
            <div class="mini-colors">
              @for (c of barColors; track c) {
                <div class="color-dot small"
                     [style.background]="c"
                     [class.selected]="editForm.get('bar1Color')?.value === c"
                     (click)="editForm.get('bar1Color')!.setValue(c)">
                </div>
              }
            </div>
          </div>
          <div class="bar-row">
            <mat-form-field appearance="outline" style="width:52px">
              <mat-label>Val 2</mat-label>
              <input matInput type="number" formControlName="bar2Value" min="0" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:52px">
              <mat-label>Máx 2</mat-label>
              <input matInput type="number" formControlName="bar2Max" min="1" />
            </mat-form-field>
            <div class="mini-colors">
              @for (c of barColors; track c) {
                <div class="color-dot small"
                     [style.background]="c"
                     [class.selected]="editForm.get('bar2Color')?.value === c"
                     (click)="editForm.get('bar2Color')!.setValue(c)">
                </div>
              }
            </div>
          </div>

          <p class="section-label">Aura</p>
          <div class="pos-row">
            <mat-form-field appearance="outline" style="width:65px">
              <mat-label>Radio (c.)</mat-label>
              <input matInput type="number" formControlName="auraRadius" min="0" step="0.5" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:65px">
              <mat-label>Opacidad</mat-label>
              <input matInput type="number" formControlName="auraOpacity" min="0" max="1" step="0.1" />
            </mat-form-field>
          </div>
          <div class="color-row">
            <span class="color-label">Color aura</span>
            @for (c of colors; track c) {
              <div class="color-dot"
                   [style.background]="c"
                   [class.selected]="editForm.get('auraColor')?.value === c"
                   (click)="editForm.get('auraColor')!.setValue(c)">
              </div>
            }
          </div>

          <p class="section-label">Rotación</p>
          <mat-form-field appearance="outline" style="width:100px">
            <mat-label>Ángulo (°)</mat-label>
            <input matInput type="number" formControlName="rotation" min="0" max="360" />
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit" [disabled]="editForm.invalid" class="save-btn">
            <mat-icon>save</mat-icon> Guardar
          </button>
        </form>
      }

      <!-- TOKEN LIST (hidden while editing) -->
      @if (!selectedToken()) {
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
      }
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
    .edit-form-scroll { overflow-y: auto; flex: 1; }
    .full { width: 100%; display: block; }
    .color-row { display: flex; align-items: center; gap: 4px; margin: 4px 0 8px; flex-wrap: wrap; }
    .color-label { font-size: 11px; color: #90a4ae; margin-right: 2px; }
    .color-dot {
      width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
      border: 2px solid transparent; transition: border-color .15s; flex-shrink: 0;
    }
    .color-dot.small { width: 15px; height: 15px; }
    .color-dot.selected { border-color: white; }
    .pos-row { display: flex; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
    .bar-row { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; flex-wrap: wrap; }
    .mini-colors { display: flex; gap: 3px; flex-wrap: wrap; }
    .toggle-row { display: flex; gap: 12px; margin: 4px 0 8px; }
    .section-label {
      font-size: 10px; font-weight: 600; color: #607d8b;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin: 6px 0 4px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px;
    }
    .save-btn { width: 100%; margin-top: 8px; }
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
  campaignId    = input.required<string>();
  sessionId     = input.required<string>();
  sceneId       = input<string | null>(null);
  tokens        = input<MapToken[]>([]);
  selectedToken = input<MapToken | null>(null);

  tokenAdded   = output<MapToken>();
  tokenDeleted = output<string>();
  tokenUpdated = output<MapToken>();

  private sceneService = inject(SceneService);
  private fb = inject(FormBuilder);

  readonly colors    = PRESET_COLORS;
  readonly barColors = BAR_COLORS;
  showForm = signal(false);

  createForm = this.fb.group({
    label:    ['', [Validators.required, Validators.maxLength(100)]],
    imageUrl: [''],
    color:    [PRESET_COLORS[0]],
    x:        [0, [Validators.required, Validators.min(0)]],
    y:        [0, [Validators.required, Validators.min(0)]],
  });

  editForm = this.fb.group({
    label:      ['', [Validators.required, Validators.maxLength(100)]],
    imageUrl:   [''],
    color:      [PRESET_COLORS[0]],
    width:      [1, [Validators.required, Validators.min(1)]],
    height:     [1, [Validators.required, Validators.min(1)]],
    isVisible:  [true],
    isLocked:   [false],
    bar1Value:  [null as number | null],
    bar1Max:    [null as number | null],
    bar1Color:  [BAR_COLORS[0]],
    bar2Value:  [null as number | null],
    bar2Max:    [null as number | null],
    bar2Color:  [BAR_COLORS[2]],
    auraRadius: [null as number | null],
    auraColor:  [PRESET_COLORS[0]],
    auraOpacity:[0.3],
    rotation:   [0],
  });

  constructor() {
    effect(() => {
      const token = this.selectedToken();
      if (token) {
        this.editForm.patchValue({
          label:      token.label,
          imageUrl:   token.imageUrl ?? '',
          color:      token.color,
          width:      token.width,
          height:     token.height,
          isVisible:  token.isVisible,
          isLocked:   token.isLocked,
          bar1Value:  token.bar1Value,
          bar1Max:    token.bar1Max,
          bar1Color:  token.bar1Color ?? BAR_COLORS[0],
          bar2Value:  token.bar2Value,
          bar2Max:    token.bar2Max,
          bar2Color:  token.bar2Color ?? BAR_COLORS[2],
          auraRadius: token.auraRadius,
          auraColor:  token.auraColor ?? PRESET_COLORS[0],
          auraOpacity:token.auraOpacity ?? 0.3,
          rotation:   token.rotation ?? 0,
        });
        this.showForm.set(false);
      }
    });
  }

  toggleForm() {
    this.showForm.update(v => !v);
    if (!this.showForm()) this.createForm.reset({ color: PRESET_COLORS[0], x: 0, y: 0 });
  }

  submit() {
    if (this.createForm.invalid || !this.sceneId()) return;
    const v = this.createForm.value;
    this.sceneService.addToken(this.campaignId(), this.sessionId(), this.sceneId()!, {
      label:    v.label!,
      imageUrl: v.imageUrl || null,
      color:    v.color ?? PRESET_COLORS[0],
      x: v.x!, y: v.y!,
      width: 1, height: 1,
    }).subscribe(token => {
      this.tokenAdded.emit(token);
      this.createForm.reset({ color: PRESET_COLORS[0], x: 0, y: 0 });
      this.showForm.set(false);
    });
  }

  saveToken() {
    const token = this.selectedToken();
    if (!token || this.editForm.invalid) return;
    const v = this.editForm.value;
    this.sceneService.updateToken(
      this.campaignId(), this.sessionId(), token.sceneId, token.id, {
        label:      v.label!,
        imageUrl:   v.imageUrl || null,
        color:      v.color ?? token.color,
        width:      v.width ?? 1,
        height:     v.height ?? 1,
        isVisible:  v.isVisible ?? true,
        controlledBy: token.controlledBy,
        isLocked:   v.isLocked ?? false,
        bar1Value:  v.bar1Value ?? null,
        bar1Max:    v.bar1Max ?? null,
        bar1Color:  v.bar1Color || null,
        bar2Value:  v.bar2Value ?? null,
        bar2Max:    v.bar2Max ?? null,
        bar2Color:  v.bar2Color || null,
        auraRadius: v.auraRadius ?? null,
        auraColor:  v.auraColor || null,
        auraOpacity:v.auraOpacity ?? 0.3,
        rotation:   v.rotation ?? 0,
      }
    ).subscribe(updated => this.tokenUpdated.emit(updated));
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
