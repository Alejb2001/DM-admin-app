import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { WorldService } from '../services/world.service';
import { EntityType } from '../models/world.models';

@Component({
  selector: 'app-entity-create-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Nueva Entidad</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="entityForm" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Tipo de entidad</mat-label>
          <mat-select formControlName="entityTypeId">
            @for (t of data.types; track t.id) {
              <mat-option [value]="t.id">
                <mat-icon [style.color]="t.color || '#666'">{{ t.icon || 'label' }}</mat-icon>
                {{ t.name }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
          @if (form.get('name')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" form="entityForm" type="submit" [disabled]="loading">
        @if (loading) { <mat-spinner diameter="18" /> } @else { Crear }
      </button>
    </mat-dialog-actions>
    <style>.full { width: 100%; margin-bottom: 8px; }</style>
  `,
})
export class EntityCreateDialogComponent {
  data: { campaignId: string; types: EntityType[] } = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private service = inject(WorldService);
  private ref = inject(MatDialogRef<EntityCreateDialogComponent>);

  form = this.fb.group({
    entityTypeId: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(200)]],
  });
  loading = false;

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { entityTypeId, name } = this.form.value;
    this.service.create(this.data.campaignId, { entityTypeId: entityTypeId!, name: name! }).subscribe({
      next: entity => this.ref.close(entity),
      error: () => { this.loading = false; },
    });
  }
}
