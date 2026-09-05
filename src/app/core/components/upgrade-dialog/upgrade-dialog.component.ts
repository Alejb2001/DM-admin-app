import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LimitError } from '../../../features/campaigns/models/campaign.models';
import { SubscriptionService } from '../../services/subscription.service';

const limitLabels: Record<string, string> = {
  campaigns: 'campañas',
  entitiesPerCampaign: 'entidades por campaña',
  customEntityTypes: 'tipos de entidad personalizados',
  playersPerCampaign: 'jugadores por campaña',
};

const tierLabels: Record<string, string> = {
  pro: 'Pro (~$6/mes)',
  master: 'Master (~$12/mes)',
};

@Component({
  selector: 'app-upgrade-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="upgrade-header">
      <mat-icon color="warn">lock</mat-icon>
      <h2 mat-dialog-title>Límite alcanzado</h2>
    </div>
    <mat-dialog-content>
      <p>
        Alcanzaste el límite de <strong>{{ limitLabel }}</strong> en tu plan actual
        (<strong>{{ data.current }}/{{ data.max }}</strong>).
      </p>
      <p>
        Actualiza a <strong>{{ tierLabel }}</strong> para continuar sin restricciones.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Ahora no</button>
      <button mat-raised-button color="primary" (click)="upgrade()" [disabled]="loading()">
        @if (loading()) { <mat-spinner diameter="18" /> } @else { Actualizar a {{ tierLabel }} }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .upgrade-header { display: flex; align-items: center; gap: 8px; padding: 16px 24px 0; }
    h2[mat-dialog-title] { margin: 0; }
  `]
})
export class UpgradeDialogComponent {
  data: LimitError = inject(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<UpgradeDialogComponent>);
  private subscriptionService = inject(SubscriptionService);

  loading = signal(false);

  get limitLabel() { return limitLabels[this.data.limit] ?? this.data.limit; }
  get tierLabel() { return tierLabels[this.data.requiredTier] ?? this.data.requiredTier; }

  close() { this.ref.close(); }

  upgrade() {
    this.loading.set(true);
    this.subscriptionService.createCheckoutSession(this.data.requiredTier).subscribe({
      next: ({ url }) => { window.location.href = url; },
      error: () => this.loading.set(false),
    });
  }
}
