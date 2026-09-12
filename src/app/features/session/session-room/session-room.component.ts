import { Component, inject, signal, OnInit, OnDestroy, input } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { SessionService } from '../services/session.service';
import { SessionSignalRService } from '../services/session-signalr.service';
import { AuthService } from '../../../core/services/auth.service';
import { GameSession, ChatMessage, SessionPresenceEntry } from '../models/session.models';
import { SessionHeaderComponent } from '../session-header/session-header.component';
import { ChatPanelComponent } from '../chat-panel/chat-panel.component';
import { MapCanvasComponent } from '../map-canvas/map-canvas.component';
import { CharacterSheetPanelComponent } from '../character-sheet-panel/character-sheet-panel.component';

@Component({
  selector: 'app-session-room',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatButtonModule, SessionHeaderComponent, ChatPanelComponent, MapCanvasComponent, CharacterSheetPanelComponent],
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
            <app-map-canvas
              [campaignId]="id()"
              [sessionId]="sid()"
              [isDm]="isDm"
              [currentUserId]="currentUserId"
            />
          </div>
          <div class="chat-area">
            <div class="panel-tabs">
              <button [class.active]="rightTab() === 'chat'" (click)="rightTab.set('chat')">Chat</button>
              <button [class.active]="rightTab() === 'fichas'" (click)="rightTab.set('fichas')">Fichas</button>
            </div>
            @if (rightTab() === 'chat') {
              <app-chat-panel
                [campaignId]="id()"
                [sessionId]="sid()"
                [isDm]="isDm"
                [initialMessages]="initialMessages()"
              />
            } @else {
              <app-character-sheet-panel
                [campaignId]="id()"
                [sessionId]="sid()"
              />
            }
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
      overflow: hidden;
    }
    .chat-area {
      flex: 35;
      border-left: 1px solid #37474f;
      display: flex;
      flex-direction: column;
      background: white;
      overflow: hidden;
    }
    .panel-tabs {
      display: flex;
      flex-shrink: 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .panel-tabs button {
      flex: 1;
      padding: 8px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #757575;
      border-bottom: 2px solid transparent;
      transition: color .15s, border-color .15s;
    }
    .panel-tabs button.active {
      color: #7b1fa2;
      border-bottom-color: #7b1fa2;
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
  currentUserId = '';
  rightTab = signal<'chat' | 'fichas'>('chat');

  private subs: Subscription[] = [];

  async ngOnInit() {
    this.sessionService.getSessionDetail(this.id(), this.sid()).subscribe({
      next: detail => {
        this.session.set(detail.session);
        this.initialMessages.set(detail.recentMessages);

        const user = this.auth.currentUser();
        if (user) {
          this.isDm = detail.session.createdById === user.id;
          this.currentUserId = user.id;
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
