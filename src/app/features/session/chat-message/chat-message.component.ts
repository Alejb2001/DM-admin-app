import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ChatMessage } from '../models/session.models';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [DatePipe, MatIconModule, MatChipsModule],
  template: `
    @switch (message().type) {
      @case ('system') {
        <div class="msg-system">{{ message().content }}</div>
      }
      @case ('narration') {
        <div class="msg-narration">
          <mat-icon class="narr-icon">auto_stories</mat-icon>
          <em>{{ message().content }}</em>
        </div>
      }
      @case ('roll') {
        <div class="msg-roll">
          <div class="roll-header">
            <mat-icon>casino</mat-icon>
            <span class="roll-author">{{ message().userDisplayName }}</span>
            @if (message().diceResult?.label) {
              <span class="roll-label">— {{ message().diceResult!.label }}</span>
            }
          </div>
          @if (message().diceResult; as r) {
            <div class="roll-breakdown">
              <span class="roll-dice">{{ r.formula }}</span>
              <span class="roll-rolls">[{{ r.rolls.join(', ') }}]</span>
              @if (r.advantage) { <span class="roll-adv">{{ r.advantage }}</span> }
              @if (r.modifier !== 0) {
                <span class="roll-mod">{{ r.modifier > 0 ? '+' : '' }}{{ r.modifier }}</span>
              }
            </div>
            <div class="roll-total">{{ r.total }}</div>
          }
        </div>
      }
      @case ('secret_roll') {
        <div class="msg-roll msg-secret">
          <div class="roll-header">
            <mat-icon>casino</mat-icon>
            <span class="roll-author">{{ message().userDisplayName }}</span>
            @if (message().diceResult?.label) {
              <span class="roll-label">— {{ message().diceResult!.label }}</span>
            }
            <mat-chip class="secret-chip">Secreto</mat-chip>
          </div>
          @if (message().diceResult; as r) {
            <div class="roll-breakdown">
              <span class="roll-dice">{{ r.formula }}</span>
              <span class="roll-rolls">[{{ r.rolls.join(', ') }}]</span>
              @if (r.advantage) { <span class="roll-adv">{{ r.advantage }}</span> }
              @if (r.modifier !== 0) {
                <span class="roll-mod">{{ r.modifier > 0 ? '+' : '' }}{{ r.modifier }}</span>
              }
            </div>
            <div class="roll-total">{{ r.total }}</div>
          }
        </div>
      }
      @default {
        <!-- chat -->
        <div class="msg-chat">
          <span class="chat-author">{{ message().userDisplayName }}</span>
          <span class="chat-content">{{ message().content }}</span>
          <span class="chat-time">{{ message().createdAt | date:'HH:mm' }}</span>
        </div>
      }
    }
  `,
  styles: [`
    .msg-system {
      text-align: center;
      color: #9e9e9e;
      font-size: 12px;
      padding: 4px 0;
      font-style: italic;
    }
    .msg-narration {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: #1a1a2e;
      color: #e0e0e0;
      border-left: 3px solid #7c4dff;
      padding: 10px 12px;
      border-radius: 4px;
      font-style: italic;
      margin: 4px 0;
    }
    .narr-icon { color: #7c4dff; font-size: 18px; height: 18px; width: 18px; flex-shrink: 0; margin-top: 2px; }
    .msg-chat {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 4px 0;
    }
    .chat-author { font-weight: 600; font-size: 13px; color: #512da8; flex-shrink: 0; }
    .chat-content { font-size: 14px; flex: 1; }
    .chat-time { font-size: 11px; color: #bdbdbd; flex-shrink: 0; }
    .msg-roll {
      background: #f3e5f5;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 4px 0;
      border-left: 4px solid #9c27b0;
    }
    .msg-secret { border-left-color: #f44336; background: #fce4ec; }
    .roll-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 13px;
    }
    .roll-author { font-weight: 600; }
    .roll-label { color: #616161; }
    .secret-chip { background: #f44336 !important; color: white !important; font-size: 11px; height: 20px; }
    .roll-breakdown {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #616161;
      margin-bottom: 4px;
    }
    .roll-rolls { background: #e1bee7; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .roll-adv { color: #1565c0; font-style: italic; }
    .roll-mod { font-family: monospace; }
    .roll-total {
      font-size: 28px;
      font-weight: 700;
      color: #4a148c;
      line-height: 1;
    }
  `],
})
export class ChatMessageComponent {
  message = input.required<ChatMessage>();
}
