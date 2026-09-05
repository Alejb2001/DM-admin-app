import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-campaigns-placeholder',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div style="padding: 32px; text-align: center;">
      <h2>Campañas — Fase 1</h2>
      <p>Hola, {{ authService.currentUser()?.displayName }}!</p>
      <p>Esta sección se implementará en la Fase 1.</p>
      <button mat-raised-button color="warn" (click)="authService.logout()">Cerrar sesión</button>
    </div>
  `,
})
export class CampaignsPlaceholderComponent {
  authService = inject(AuthService);
}
