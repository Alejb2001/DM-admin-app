import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SignalRService } from '../../core/services/signalr.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, UpperCasePipe, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private subscriptionService = inject(SubscriptionService);
  private signalR = inject(SignalRService);

  ngOnInit() {
    // Connect SignalR when the shell loads (user is authenticated at this point)
    this.signalR.connect();
  }

  ngOnDestroy() {
    this.signalR.disconnect();
  }

  get hasPaidPlan() {
    const tier = this.auth.currentUser()?.subscriptionTier;
    return tier === 'pro' || tier === 'master';
  }

  openPortal() {
    this.subscriptionService.createPortalSession().subscribe({
      next: ({ url }) => { window.location.href = url; },
    });
  }
}
