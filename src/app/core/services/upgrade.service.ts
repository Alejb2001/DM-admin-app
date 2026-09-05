import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LimitError } from '../../features/campaigns/models/campaign.models';

@Injectable({ providedIn: 'root' })
export class UpgradeService {
  private dialog = inject(MatDialog);

  handleLimitReached(error: LimitError) {
    import('../../core/components/upgrade-dialog/upgrade-dialog.component').then(m => {
      this.dialog.open(m.UpgradeDialogComponent, { data: error, width: '420px' });
    });
  }
}
