import { Component, input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatMessage, SendMessageRequest } from '../models/session.models';
import { SessionSignalRService } from '../services/session-signalr.service';
import { SessionService } from '../services/session.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { DiceInputComponent } from '../dice-input/dice-input.component';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [ChatMessageComponent, DiceInputComponent],
  template: `
    <div class="chat-panel">
      <div class="messages-scroll" #scrollContainer>
        @for (msg of messages(); track msg.id) {
          <app-chat-message [message]="msg" />
        }
        @if (messages().length === 0) {
          <div class="empty-chat">El chat está vacío. ¡Sé el primero en escribir!</div>
        }
      </div>
      <app-dice-input [isDm]="isDm()" (messageSent)="onMessageSent($event)" />
    </div>
  `,
  styles: [`
    .chat-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #fafafa;
    }
    .messages-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .empty-chat {
      text-align: center;
      color: #bdbdbd;
      font-style: italic;
      margin-top: 24px;
    }
  `],
})
export class ChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLElement>;

  campaignId = input.required<string>();
  sessionId = input.required<string>();
  isDm = input(false);
  initialMessages = input<ChatMessage[]>([]);

  private signalR = inject(SessionSignalRService);
  private sessionService = inject(SessionService);
  private auth = inject(AuthService);

  messages = signal<ChatMessage[]>([]);
  private shouldScroll = false;
  private sub: Subscription | null = null;

  ngOnInit() {
    this.messages.set([...this.initialMessages()]);
    this.shouldScroll = true;

    this.sub = this.signalR.messageReceived$.subscribe(msg => {
      this.messages.update(msgs => [...msgs, msg]);
      this.shouldScroll = true;
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onMessageSent(req: SendMessageRequest) {
    this.sessionService.sendMessage(this.campaignId(), this.sessionId(), req).subscribe({
      error: err => console.warn('[ChatPanel] Error sending message:', err),
    });
  }

  private scrollToBottom() {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
