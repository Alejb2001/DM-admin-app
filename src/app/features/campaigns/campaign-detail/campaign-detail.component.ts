import { Component, inject, signal, OnInit, OnDestroy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CampaignService } from '../services/campaign.service';
import { WorldService } from '../../world/services/world.service';
import { CampaignDetail, Member } from '../models/campaign.models';
import { AuthService } from '../../../core/services/auth.service';
import { SignalRService, PresenceEntry } from '../../../core/services/signalr.service';
import { CampaignInviteDialogComponent } from '../campaign-invite-dialog/campaign-invite-dialog.component';

@Component({
  selector: 'app-campaign-detail',
  standalone: true,
  imports: [
    RouterLink, DatePipe, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatChipsModule, MatMenuModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './campaign-detail.component.html',
})
export class CampaignDetailComponent implements OnInit, OnDestroy {
  id = input.required<string>();

  private service = inject(CampaignService);
  private worldService = inject(WorldService);
  private dialog = inject(MatDialog);
  private signalR = inject(SignalRService);
  auth = inject(AuthService);

  campaign = signal<CampaignDetail | null>(null);
  loading = signal(true);
  exporting = signal(false);
  presence = signal<PresenceEntry[]>([]);
  displayedColumns = ['avatar', 'name', 'role', 'joined', 'actions'];

  private subs: Subscription[] = [];

  ngOnInit() {
    this.load();
    this.subs.push(
      this.signalR.presenceUpdated$.subscribe(entries => this.presence.set(entries))
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.signalR.leaveCampaign();
  }

  load() {
    this.loading.set(true);
    this.service.getDetail(this.id()).subscribe({
      next: data => {
        this.campaign.set(data);
        this.loading.set(false);
        this.joinHub(data);
      },
      error: () => this.loading.set(false),
    });
  }

  private joinHub(campaign: CampaignDetail) {
    const user = this.auth.currentUser();
    if (!user) return;

    const isDm = campaign.ownerId === user.id;
    const member = campaign.members.find(m => m.userId === user.id);

    this.signalR.joinCampaign({
      campaignId: campaign.id,
      isDm,
      roleId: member?.roleId ?? null,
      roleName: member?.roleName ?? null,
    });
  }

  get isOwner() {
    return this.campaign()?.ownerId === this.auth.currentUser()?.id;
  }

  isOnline(userId: string): boolean {
    return this.presence().some(p => p.userId === userId);
  }

  openInvite() {
    const c = this.campaign()!;
    this.dialog.open(CampaignInviteDialogComponent, {
      width: '480px',
      data: { campaignId: c.id, roles: c.roles.filter(r => r.name !== 'Co-DM') },
    });
  }

  removeMember(member: Member) {
    this.service.removeMember(this.id(), member.userId).subscribe(() => this.load());
  }

  changeRole(member: Member, roleId: string) {
    this.service.updateMemberRole(this.id(), member.userId, roleId).subscribe(() => this.load());
  }

  codeCopied = signal(false);
  regenerating = signal(false);

  copyCode() {
    const code = this.campaign()?.joinCode;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    });
  }

  regenerateCode() {
    const id = this.id();
    this.regenerating.set(true);
    this.service.regenerateCode(id).subscribe({
      next: res => {
        this.campaign.update(c => c ? { ...c, joinCode: res.joinCode } : c);
        this.regenerating.set(false);
      },
      error: () => this.regenerating.set(false),
    });
  }

  exportCampaign() {
    const c = this.campaign();
    if (!c) return;
    this.exporting.set(true);
    this.worldService.exportCampaign(c.id).subscribe({
      next: response => {
        this.exporting.set(false);
        const blob = response.body!;
        const disposition = response.headers.get('content-disposition') ?? '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : `${c.name}-export.json`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.exporting.set(false),
    });
  }
}
