import {
  Component, inject, input, signal, OnInit, OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VttAdvancedService } from '../services/vtt-advanced.service';
import { SessionSignalRService } from '../services/session-signalr.service';
import { InitiativeEntry } from '../models/vtt-advanced.models';

@Component({
  selector: 'app-initiative-tracker',
  standalone: true,
  imports: [
    FormsModule, CdkDropList, CdkDrag,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatTooltipModule,
  ],
  template: `
    <div class="tracker">
      <div class="tracker-header">
        <span class="tracker-title">Iniciativa</span>
        @if (isDm()) {
          <button mat-icon-button (click)="showAddForm.set(!showAddForm())" matTooltip="Agregar">
            <mat-icon>add</mat-icon>
          </button>
          <button mat-icon-button color="warn" (click)="clearAll()" matTooltip="Limpiar">
            <mat-icon>delete_sweep</mat-icon>
          </button>
        }
      </div>

      @if (showAddForm() && isDm()) {
        <div class="add-form">
          <input placeholder="Nombre" [(ngModel)]="newName" class="mini-input" />
          <input type="number" placeholder="Init" [(ngModel)]="newInitiative" class="mini-input mini-num" />
          <button mat-icon-button color="primary" (click)="addEntry()" [disabled]="!newName.trim()">
            <mat-icon>check</mat-icon>
          </button>
        </div>
      }

      <div cdkDropList (cdkDropListDropped)="onDrop($event)" class="entry-list">
        @for (entry of entries(); track entry.id) {
          <div cdkDrag class="entry-item" [class.active]="entry.isActive">
            @if (isDm()) {
              <mat-icon cdkDragHandle class="drag-handle">drag_indicator</mat-icon>
            }
            <span class="initiative-num">{{ entry.initiative }}</span>
            <span class="entry-name">{{ entry.name }}</span>
            @if (isDm()) {
              <button mat-icon-button class="small-btn"
                      (click)="setActive(entry)"
                      matTooltip="Turno activo">
                <mat-icon>play_circle</mat-icon>
              </button>
              <button mat-icon-button class="small-btn" color="warn"
                      (click)="removeEntry(entry)"
                      matTooltip="Eliminar">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
        }
        @if (entries().length === 0) {
          <p class="empty-hint">Sin entradas</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .tracker { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .tracker-header {
      display: flex; align-items: center; gap: 4px;
      padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;
    }
    .tracker-title { flex: 1; font-size: 12px; font-weight: 600; color: #90caf9; text-transform: uppercase; letter-spacing: .5px; }
    .tracker-header button { color: rgba(255,255,255,0.7); width: 28px; height: 28px; }
    .add-form {
      display: flex; gap: 4px; align-items: center;
      padding: 6px 8px; background: rgba(255,255,255,0.05); flex-shrink: 0;
    }
    .mini-input {
      background: rgba(255,255,255,0.1); border: none; border-radius: 4px;
      color: white; padding: 4px 6px; font-size: 12px; outline: none;
      flex: 1;
    }
    .mini-num { width: 48px; flex: unset; }
    .entry-list { flex: 1; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 2px; }
    .entry-item {
      display: flex; align-items: center; gap: 4px;
      padding: 6px 8px; border-radius: 6px;
      background: rgba(255,255,255,0.05);
      border: 1px solid transparent;
      cursor: default; user-select: none;
    }
    .entry-item.active {
      background: rgba(255,235,59,0.15);
      border-color: #ffeb3b;
    }
    .drag-handle { color: rgba(255,255,255,0.3); cursor: grab; font-size: 16px; width: 16px; height: 16px; }
    .initiative-num {
      font-weight: 700; color: #ffeb3b; font-size: 14px; min-width: 24px; text-align: center;
    }
    .entry-name { flex: 1; font-size: 13px; color: rgba(255,255,255,0.87); }
    .small-btn { width: 24px; height: 24px; color: rgba(255,255,255,0.5); }
    .empty-hint { font-size: 12px; color: rgba(255,255,255,0.3); text-align: center; padding: 12px; margin: 0; }
    .cdk-drag-preview {
      background: #1e1e3a; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      opacity: 0.9;
    }
    .cdk-drag-placeholder { opacity: 0.3; }
  `],
})
export class InitiativeTrackerComponent implements OnInit, OnDestroy {
  campaignId = input.required<string>();
  sessionId  = input.required<string>();
  isDm       = input<boolean>(false);

  entries = signal<InitiativeEntry[]>([]);
  showAddForm = signal(false);
  newName = '';
  newInitiative = 10;

  private vtt    = inject(VttAdvancedService);
  private signalR = inject(SessionSignalRService);
  private subs: Subscription[] = [];

  ngOnInit() {
    this.vtt.getInitiative(this.campaignId(), this.sessionId())
      .subscribe(list => this.entries.set(list));

    this.subs.push(
      this.signalR.initiativeUpdated$.subscribe(list => this.entries.set(list)),
      this.signalR.initiativeTurnChanged$.subscribe(list => this.entries.set(list)),
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  addEntry() {
    if (!this.newName.trim()) return;
    this.vtt.addInitiativeEntry(this.campaignId(), this.sessionId(), {
      name: this.newName.trim(),
      initiative: this.newInitiative,
    }).subscribe(list => {
      this.entries.set(list);
      this.newName = '';
      this.newInitiative = 10;
      this.showAddForm.set(false);
    });
  }

  onDrop(event: CdkDragDrop<InitiativeEntry[]>) {
    if (!this.isDm()) return;
    const list = [...this.entries()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.entries.set(list);
    this.vtt.reorderInitiative(this.campaignId(), this.sessionId(), list.map(e => e.id))
      .subscribe(updated => this.entries.set(updated));
  }

  setActive(entry: InitiativeEntry) {
    this.vtt.setActiveEntry(this.campaignId(), this.sessionId(), entry.id)
      .subscribe(list => this.entries.set(list));
  }

  removeEntry(entry: InitiativeEntry) {
    this.vtt.removeInitiativeEntry(this.campaignId(), this.sessionId(), entry.id)
      .subscribe(list => this.entries.set(list));
  }

  clearAll() {
    if (!confirm('¿Limpiar toda la iniciativa?')) return;
    this.vtt.clearInitiative(this.campaignId(), this.sessionId())
      .subscribe(() => this.entries.set([]));
  }
}
