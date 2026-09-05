import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CampaignService } from '../services/campaign.service';
import { Campaign } from '../models/campaign.models';
import { CampaignCreateDialogComponent } from '../campaign-create-dialog/campaign-create-dialog.component';
import { WelcomeDialogComponent } from '../welcome-dialog/welcome-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-campaign-list',
  standalone: true,
  imports: [RouterLink, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule, MatInputModule, MatFormFieldModule],
  templateUrl: './campaign-list.component.html',
})
export class CampaignListComponent implements OnInit {
  private campaignService = inject(CampaignService);
  private dialog = inject(MatDialog);
  auth = inject(AuthService);

  campaigns = signal<Campaign[]>([]);
  loading = signal(true);
  joinCodeInput = '';
  joining = signal(false);
  joinError = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.campaignService.getAll().subscribe({
      next: data => {
        this.campaigns.set(data);
        this.loading.set(false);
        if (data.length === 0 && !localStorage.getItem('dm_welcomed')) {
          localStorage.setItem('dm_welcomed', '1');
          this.dialog.open(WelcomeDialogComponent, { width: '480px' })
            .afterClosed().subscribe(() => this.openCreate());
        }
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.dialog.open(CampaignCreateDialogComponent, { width: '480px' })
      .afterClosed().subscribe(result => { if (result) this.load(); });
  }

  isOwner(c: Campaign) {
    return c.ownerId === this.auth.currentUser()?.id;
  }

  joinByCode() {
    const code = this.joinCodeInput.trim().toUpperCase();
    if (!code) return;
    this.joining.set(true);
    this.joinError.set(null);
    this.campaignService.joinByCode(code).subscribe({
      next: () => {
        this.joinCodeInput = '';
        this.joining.set(false);
        this.load();
      },
      error: err => {
        const msg = err.error?.error ?? 'No se pudo unir a la campaña.';
        this.joinError.set(msg);
        this.joining.set(false);
      },
    });
  }
}
