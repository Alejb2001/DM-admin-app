import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-start-session-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Iniciar sesión de juego</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="sessionForm" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Nombre de la sesión</mat-label>
          <input matInput formControlName="name" placeholder="Ej: Sesión 12 — El castillo de Ironhold" />
          @if (form.get('name')?.hasError('required')) {
            <mat-error>El nombre es obligatorio</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" form="sessionForm" type="submit">
        Iniciar
      </button>
    </mat-dialog-actions>
  `,
})
export class StartSessionDialogComponent {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<StartSessionDialogComponent>);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
  });

  submit() {
    if (this.form.invalid) return;
    this.ref.close(this.form.value.name!);
  }
}
