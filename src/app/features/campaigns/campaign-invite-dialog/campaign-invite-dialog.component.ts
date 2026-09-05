import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CampaignService } from '../services/campaign.service';
import { CampaignRole, Invitation } from '../models/campaign.models';

@Component({
  selector: 'app-campaign-invite-dialog',
  standalone: true,
  imports: [DatePipe, FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Invitar Jugadores</h2>
    <mat-dialog-content>
      @if (!invitation()) {
        <p>Genera un link de invitación. Opcionalmente envíalo por email.</p>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Rol al unirse</mat-label>
          <mat-select [(ngModel)]="selectedRoleId">
            @for (role of data.roles; track role.id) {
              <mat-option [value]="role.id">{{ role.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Email del jugador (opcional)</mat-label>
          <mat-icon matPrefix>email</mat-icon>
          <input matInput type="email" [(ngModel)]="recipientEmail" placeholder="jugador@ejemplo.com" />
        </mat-form-field>
        @if (recipientEmail) {
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Nombre del jugador (opcional)</mat-label>
            <input matInput [(ngModel)]="recipientName" placeholder="Nombre para el email" />
          </mat-form-field>
        }
        <button mat-raised-button color="primary" (click)="generate()" [disabled]="!selectedRoleId || loading">
          {{ recipientEmail ? 'Generar y enviar email' : 'Generar link' }}
        </button>
      } @else {
        <p>Comparte este link. Expira el {{ invitation()!.expiresAt | date:'shortDate' }}.
          @if (emailSent) { <strong> Email enviado.</strong> }
        </p>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Link de invitación</mat-label>
          <input matInput readonly [value]="inviteUrl()" #linkInput />
          <button mat-icon-button matSuffix (click)="copy(linkInput.value)">
            <mat-icon>content_copy</mat-icon>
          </button>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
})
export class CampaignInviteDialogComponent {
  data: { campaignId: string; roles: CampaignRole[] } = inject(MAT_DIALOG_DATA);
  private service = inject(CampaignService);
  private snack = inject(MatSnackBar);

  selectedRoleId = '';
  recipientEmail = '';
  recipientName = '';
  loading = false;
  emailSent = false;
  invitation = signal<Invitation | null>(null);

  inviteUrl() {
    return `${window.location.origin}/join?token=${this.invitation()!.token}`;
  }

  generate() {
    this.loading = true;
    this.service.createInvitation(
      this.data.campaignId,
      this.selectedRoleId,
      this.recipientEmail || undefined,
      this.recipientName || undefined,
    ).subscribe({
      next: inv => {
        this.invitation.set(inv);
        this.emailSent = !!this.recipientEmail;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  copy(url: string) {
    navigator.clipboard.writeText(url);
    this.snack.open('Link copiado', undefined, { duration: 2000 });
  }
}
