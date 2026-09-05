import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-welcome-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="welcome-wrap">
      <div class="icon-wrap">
        <mat-icon class="big-icon">shield</mat-icon>
      </div>
      <h2 mat-dialog-title>¡Bienvenido a DM Admin!</h2>
      <mat-dialog-content>
        <p>
          Tu herramienta para gestionar campañas de rol de mesa.<br>
          Crea entidades, define relaciones, controla lo que ven tus jugadores
          y colabora en tiempo real.
        </p>
        <div class="highlights">
          <div class="hl">
            <mat-icon>public</mat-icon>
            <span>Construye tu mundo</span>
          </div>
          <div class="hl">
            <mat-icon>hub</mat-icon>
            <span>Red de relaciones</span>
          </div>
          <div class="hl">
            <mat-icon>visibility</mat-icon>
            <span>Control de revelación</span>
          </div>
          <div class="hl">
            <mat-icon>bolt</mat-icon>
            <span>Tiempo real</span>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="dismiss()">Explorar primero</button>
        <button mat-raised-button color="primary" (click)="dismiss()">
          <mat-icon>add</mat-icon> Crear mi primera campaña
        </button>
      </mat-dialog-actions>
    </div>

    <style>
      .welcome-wrap { padding: 8px; text-align: center; }
      .icon-wrap { margin-bottom: 8px; }
      .big-icon { font-size: 56px; height: 56px; width: 56px; color: #7E57C2; }
      h2 { margin: 0 0 4px; font-size: 22px; }
      p { color: #616161; line-height: 1.6; }
      .highlights { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; text-align: left; }
      .hl { display: flex; align-items: center; gap: 10px; background: #f3e5f5; border-radius: 10px; padding: 10px 14px; font-size: 14px; font-weight: 500; }
      .hl mat-icon { color: #7E57C2; font-size: 20px; height: 20px; width: 20px; }
    </style>
  `,
})
export class WelcomeDialogComponent {
  private ref = inject(MatDialogRef<WelcomeDialogComponent>);

  dismiss() {
    this.ref.close();
  }
}
