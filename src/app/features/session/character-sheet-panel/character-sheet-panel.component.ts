import { Component, inject, input, signal, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorldService } from '../../world/services/world.service';
import { CharacterSheetService } from '../../world/services/character-sheet.service';
import { SessionSignalRService } from '../services/session-signalr.service';
import { EntitySummary } from '../../world/models/world.models';
import { CharacterResource } from '../../world/models/character-sheet.models';
import { ResourceBarComponent } from '../../world/character-sheet/resource-bar.component';

interface CharacterEntry {
  entity: EntitySummary;
  resources: CharacterResource[];
}

@Component({
  selector: 'app-character-sheet-panel',
  standalone: true,
  imports: [MatProgressSpinnerModule, ResourceBarComponent],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span class="title">Fichas de personaje</span>
      </div>

      @if (loading()) {
        <div class="loading"><mat-spinner diameter="28" /></div>
      } @else if (characters().length === 0) {
        <div class="empty">Sin personajes en esta campaña.</div>
      } @else {
        <div class="characters-list">
          @for (char of characters(); track char.entity.id) {
            <div class="character-card">
              <div class="char-name">{{ char.entity.name }}</div>
              @if (char.resources.length === 0) {
                <p class="no-resources">Sin recursos configurados</p>
              } @else {
                @for (r of char.resources; track r.id) {
                  <app-resource-bar
                    [resource]="r"
                    [editable]="true"
                    (valueChanged)="onResourceChanged(char.entity.id, r, $event)"
                  />
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: white; }
    .panel-header {
      padding: 8px 12px; border-bottom: 1px solid #e0e0e0; flex-shrink: 0;
    }
    .title { font-weight: 600; font-size: 13px; color: #616161; text-transform: uppercase; letter-spacing: 0.5px; }
    .loading { display: flex; justify-content: center; padding: 24px; }
    .empty { padding: 16px; font-size: 13px; color: #9e9e9e; text-align: center; }
    .characters-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
    .character-card { padding: 10px; border-radius: 8px; border: 1px solid #e0e0e0; display: flex; flex-direction: column; gap: 6px; }
    .char-name { font-weight: 600; font-size: 14px; color: #212121; }
    .no-resources { font-size: 12px; color: #bdbdbd; margin: 0; }
  `],
})
export class CharacterSheetPanelComponent implements OnInit, OnDestroy {
  campaignId = input.required<string>();
  sessionId  = input.required<string>();

  private worldService  = inject(WorldService);
  private sheetService  = inject(CharacterSheetService);
  private signalR       = inject(SessionSignalRService);

  loading    = signal(true);
  characters = signal<CharacterEntry[]>([]);

  private sub?: Subscription;

  ngOnInit() {
    this.loadCharacters();
    this.sub = this.signalR.resourceUpdated$.subscribe(resource => {
      this.characters.update(list =>
        list.map(c => c.entity.id === resource.entityId
          ? { ...c, resources: c.resources.map(r => r.id === resource.id ? resource : r) }
          : c));
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private loadCharacters() {
    this.worldService.getAll(this.campaignId()).subscribe(entities => {
      const personajes = entities.filter(e => e.entityTypeName === 'Personaje');
      if (personajes.length === 0) {
        this.characters.set([]);
        this.loading.set(false);
        return;
      }

      const result: CharacterEntry[] = personajes.map(e => ({ entity: e, resources: [] }));
      let remaining = personajes.length;

      personajes.forEach((e, i) => {
        this.sheetService.getResources(this.campaignId(), e.id)
          .pipe(catchError(() => of([])))
          .subscribe(resources => {
            result[i].resources = resources;
            remaining--;
            if (remaining === 0) {
              this.characters.set([...result]);
              this.loading.set(false);
            }
          });
      });
    });
  }

  onResourceChanged(entityId: string, resource: CharacterResource, newValue: number) {
    this.sheetService.updateValue(
      this.campaignId(), entityId, resource.id, newValue, this.sessionId()
    ).subscribe(updated => {
      this.characters.update(list =>
        list.map(c => c.entity.id === entityId
          ? { ...c, resources: c.resources.map(r => r.id === updated.id ? updated : r) }
          : c));
    });
  }
}
