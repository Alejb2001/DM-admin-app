import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SendMessageRequest } from '../models/session.models';

const ROLL_RE = /^\/r(?:oll)?\s+\d+[dD](4|6|8|10|12|20|100)/i;

@Component({
  selector: 'app-dice-input',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatTooltipModule],
  template: `
    <div class="dice-input-container">
      @if (isDm()) {
        <button
          mat-icon-button
          [class.narration-active]="isNarrationMode()"
          (click)="toggleNarration()"
          matTooltip="Modo narración (solo DM)"
        >
          <mat-icon>auto_stories</mat-icon>
        </button>
      }
      <mat-form-field appearance="outline" class="input-field">
        <input
          matInput
          [(ngModel)]="inputText"
          (ngModelChange)="onInputChange($event)"
          (keydown.enter)="submit()"
          [placeholder]="placeholder()"
          autocomplete="off"
        />
        @if (parseError()) {
          <mat-error>{{ parseError() }}</mat-error>
        }
      </mat-form-field>
      <button mat-icon-button color="primary" (click)="submit()" [disabled]="!inputText.trim()" matTooltip="Enviar">
        <mat-icon>send</mat-icon>
      </button>
    </div>
    <div class="dice-hint">
      <span>Comandos: <code>/roll 2d6</code> · <code>/roll 1d20+5</code> · <code>/roll 2d20 ventaja</code> · <code>/roll secreto 1d20</code></span>
    </div>
  `,
  styles: [`
    .dice-input-container {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px;
      border-top: 1px solid #e0e0e0;
    }
    .input-field { flex: 1; }
    .narration-active { color: #7c4dff !important; }
    .dice-hint {
      padding: 0 8px 6px;
      font-size: 11px;
      color: #9e9e9e;
    }
    code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; }
  `],
})
export class DiceInputComponent {
  isDm = input(false);
  messageSent = output<SendMessageRequest>();

  inputText = '';
  isNarrationMode = signal(false);
  parseError = signal<string | null>(null);

  placeholder() {
    if (this.isNarrationMode()) return 'Escribe la narración del DM...';
    return 'Escribe un mensaje o /roll 2d6...';
  }

  toggleNarration() {
    this.isNarrationMode.update(v => !v);
  }

  onInputChange(value: string) {
    if (value.match(/^\/r(?:oll)?\b/i) && !ROLL_RE.test(value)) {
      this.parseError.set('Ejemplo: /roll 2d6, /roll 1d20+5, /roll 2d20 ventaja');
    } else {
      this.parseError.set(null);
    }
  }

  submit() {
    const text = this.inputText.trim();
    if (!text) return;

    let req: SendMessageRequest;

    if (this.isNarrationMode()) {
      req = { type: 'narration', content: text, isSecret: false };
    } else if (/^\/r(?:oll)?\s+secreto\b/i.test(text)) {
      req = { type: 'secret_roll', content: text, isSecret: true };
    } else if (/^\/r(?:oll)?\b/i.test(text)) {
      req = { type: 'roll', content: text, isSecret: false };
    } else {
      req = { type: 'chat', content: text, isSecret: false };
    }

    this.messageSent.emit(req);
    this.inputText = '';
    this.parseError.set(null);
  }
}
