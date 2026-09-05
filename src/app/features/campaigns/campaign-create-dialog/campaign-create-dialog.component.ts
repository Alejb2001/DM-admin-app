import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CampaignService } from '../services/campaign.service';

@Component({
  selector: 'app-campaign-create-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Nueva Campaña</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="createForm" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
          @if (form.get('name')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Descripción (opcional)</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" form="createForm" type="submit" [disabled]="loading">
        @if (loading) { <mat-spinner diameter="18" /> } @else { Crear }
      </button>
    </mat-dialog-actions>
    <style>.full { width: 100%; }</style>
  `,
})
export class CampaignCreateDialogComponent {
  private fb = inject(FormBuilder);
  private service = inject(CampaignService);
  private ref = inject(MatDialogRef<CampaignCreateDialogComponent>);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
  });
  loading = false;

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { name, description } = this.form.value;
    this.service.create({ name: name!, description: description ?? undefined }).subscribe({
      next: campaign => this.ref.close(campaign),
      error: () => { this.loading = false; },
    });
  }
}
