import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SessionScene } from '../../models/map.models';

export interface SceneFormData {
  scene?: SessionScene;
}

export interface SceneFormResult {
  name: string;
  backgroundUrl: string | null;
  gridSize: number;
  gridEnabled: boolean;
}

@Component({
  selector: 'app-scene-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatButtonModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>{{ data.scene ? 'Editar escena' : 'Nueva escena' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="sceneForm" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
          @if (form.get('name')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>URL de imagen de fondo (opcional)</mat-label>
          <input matInput formControlName="backgroundUrl" placeholder="https://..." />
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:160px">
          <mat-label>Tamaño de celda (px)</mat-label>
          <input matInput type="number" formControlName="gridSize" min="20" max="200" />
        </mat-form-field>
        <div style="margin-top:12px">
          <mat-checkbox formControlName="gridEnabled">Mostrar grid</mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" form="sceneForm" type="submit">
        {{ data.scene ? 'Guardar' : 'Crear' }}
      </button>
    </mat-dialog-actions>
    <style>.full { width: 100%; display: block; margin-bottom: 4px; }</style>
  `,
})
export class SceneFormDialogComponent {
  data: SceneFormData = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<SceneFormDialogComponent>);

  form = this.fb.group({
    name:          [this.data.scene?.name ?? '',   [Validators.required, Validators.maxLength(200)]],
    backgroundUrl: [this.data.scene?.backgroundUrl ?? ''],
    gridSize:      [this.data.scene?.gridSize ?? 50, [Validators.required, Validators.min(20)]],
    gridEnabled:   [this.data.scene?.gridEnabled ?? true],
  });

  submit() {
    if (this.form.invalid) return;
    const v = this.form.value;
    const result: SceneFormResult = {
      name: v.name!,
      backgroundUrl: v.backgroundUrl || null,
      gridSize: v.gridSize!,
      gridEnabled: v.gridEnabled!,
    };
    this.ref.close(result);
  }
}
