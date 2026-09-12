import { Component, inject, signal, OnInit, OnDestroy, input } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SessionService } from '../services/session.service';
import { SessionSignalRService } from '../services/session-signalr.service';
import { AuthService } from '../../../core/services/auth.service';
import { GameSession, ChatMessage, SessionPresenceEntry } from '../models/session.models';
import { SessionHeaderComponent } from '../session-header/session-header.component';
import { ChatPanelComponent } from '../chat-panel/chat-panel.component';

@Component({
  selector: 'app-session-room',
  standalone: true,
  imports: [MatProgressSpinnerModule, SessionHeaderComponent, ChatPanelComponent],
  template: `
    @if (loading()) {
      <div class="loading-overlay"><mat-spinner /></div>
    } @else if (session()) {
      <div class="session-layout">
        <app-session-header
          [session]="session()!"
          [presence]="presence()"
          [isDm]="isDm"
          (endSession)="endSession()"
        />
        <div class="session-body">
          <div class="main-area">
            <div class="map-placeholder">
              <span class="placeholder-icon">🗺️</span>
              <p>El mapa virtual estará disponible en el Subsistema 2.</p>
              <p class="placeholder-sub">Por ahora usa el chat para narrar la sesión.</p>
            </div>
          </div>
          <div class="chat-area">
            <app-chat-panel
              [campaignId]="id()"
              [sessionId]="sid()"
              [isDm]="isDm"
              [initialMessages]="initialMessages()"
            />
          </div>
        </div>
      </div>
    } @else {
      <div class="loading-overlay">
        <p>Sesión no encontrada.</p>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: #121212;
      display: flex;
      flex-direction: column;
    }
    .loading-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: white;
    }
    .session-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    .session-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .main-area {
      flex: 65;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a2e;
      color: #616161;
    }
    .map-placeholder {
      text-align: center;
      color: #546e7a;
    }
    .placeholder-icon { font-size: 48px; display: block; margin-bottom: 16px; }
    .placeholder-sub { font-size: 13px; color: #455a64; }
    .chat-area {
      flex: 35;
      border-left: 1px solid #37474f;
      display: flex;
      flex-direction: column;
      background: white;
      overflow: hidden;
    }
  `],
})
export class SessionRoomComponent implements OnInit, OnDestroy {
  id = input.required<string>();  // campaignId from route
  sid = input.required<string>(); // sessionId from route

  private sessionService = inject(SessionService);
  private signalR = inject(SessionSignalRService);
  private auth = inject(AuthService);
  private router = inject(Router);

  session = signal<GameSession | null>(null);
  initialMessages = signal<ChatMessage[]>([]);
  presence = signal<SessionPresenceEntry[]>([]);
  loading = signal(true);
  isDm = false;

  private subs: Subscription[] = [];

  async ngOnInit() {
    this.sessionService.getSessionDetail(this.id(), this.sid()).subscribe({
      next: detail => {
        this.session.set(detail.session);
        this.initialMessages.set(detail.recentMessages);

        const user = this.auth.currentUser();
        if (user) {
          this.isDm = detail.session.createdById === user.id;
        }

        this.loading.set(false);
        this.connectSignalR();
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  async ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    await this.signalR.leaveSession(this.sid());
    await this.signalR.disconnect();
  }

  endSession() {
    this.sessionService.endSession(this.id(), this.sid()).subscribe();
    // Navigation happens via SignalR SessionEnded event
  }

  private async connectSignalR() {
    await this.signalR.connect();
    await this.signalR.joinSession(this.sid());

    this.subs.push(
      this.signalR.presenceUpdated$.subscribe(p => this.presence.set(p)),
      this.signalR.sessionEnded$.subscribe(() => {
        this.router.navigate(['/campaigns', this.id(), 'sessions']);
      }),
    );
  }
}
