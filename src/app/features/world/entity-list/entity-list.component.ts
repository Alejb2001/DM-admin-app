import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { WorldService } from '../services/world.service';
import { EntitySummary, EntityType } from '../models/world.models';
import { AuthService } from '../../../core/services/auth.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { EntityCreateDialogComponent } from '../entity-create-dialog/entity-create-dialog.component';
import { EntityTypeManagerComponent } from '../entity-type-manager/entity-type-manager.component';
import { RelationshipTypeManagerComponent } from '../relationship-type-manager/relationship-type-manager.component';

@Component({
  selector: 'app-entity-list',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule,
  ],
  templateUrl: './entity-list.component.html',
})
export class EntityListComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private worldService = inject(WorldService);
  private dialog = inject(MatDialog);
  private signalR = inject(SignalRService);
  auth = inject(AuthService);

  campaignId = signal('');
  entities = signal<EntitySummary[]>([]);
  types = signal<EntityType[]>([]);
  selectedTypeId = signal<string | null>(null);
  loading = signal(true);
  searchQuery = signal('');
  searching = signal(false);
  searchResults = signal<EntitySummary[] | null>(null);

  filtered = computed(() => {
    const results = this.searchResults();
    if (results !== null) return results;
    const sel = this.selectedTypeId();
    return sel ? this.entities().filter(e => e.entityTypeId === sel) : this.entities();
  });

  private subs: Subscription[] = [];

  ngOnInit() {
    const id = this.route.parent?.snapshot.params['id'] ?? '';
    this.campaignId.set(id);
    this.load();
    this.subscribeToRealtime();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  load() {
    const id = this.campaignId();
    this.loading.set(true);
    this.worldService.getTypes(id).subscribe(t => this.types.set(t));
    this.worldService.getAll(id).subscribe({
      next: data => { this.entities.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private subscribeToRealtime() {
    const ctx = this.signalR.campaignContext;

    // EntityCreated: only show immediately to DM/Co-DM (entity starts private)
    this.subs.push(
      this.signalR.entityCreated$.subscribe(summary => {
        if (!ctx) return;
        if (ctx.isDm || ctx.roleName === 'Co-DM') {
          this.entities.update(prev =>
            prev.some(e => e.id === summary.id) ? prev : [summary as EntitySummary, ...prev]
          );
        }
      })
    );

    // EntityUpdated: update name/type in list
    this.subs.push(
      this.signalR.entityUpdated$.subscribe(updated => {
        this.entities.update(prev =>
          prev.map(e => e.id === updated.id
            ? { ...e, name: updated.name, updatedAt: updated.updatedAt, entityTypeName: updated.entityTypeName }
            : e
          )
        );
      })
    );

    // EntityDeleted: remove from list
    this.subs.push(
      this.signalR.entityDeleted$.subscribe(entityId => {
        this.entities.update(prev => prev.filter(e => e.id !== entityId));
      })
    );

    // PermissionsChanged: reload list so players see newly revealed/hidden entities
    this.subs.push(
      this.signalR.permissionsChanged$.subscribe(({ entityId, permissions }) => {
        if (!ctx || ctx.isDm || ctx.roleName === 'Co-DM') return;

        const myPerm = permissions.find(p =>
          p.roleId === ctx.roleId
        );

        const isInList = this.entities().some(e => e.id === entityId);

        if (myPerm?.canView && !isInList) {
          // Entity was just revealed to me → fetch and add
          this.worldService.getOne(this.campaignId(), entityId).subscribe({
            next: entity => {
              const summary: EntitySummary = {
                id: entity.id,
                entityTypeId: entity.entityTypeId,
                entityTypeName: entity.entityTypeName,
                entityTypeIcon: entity.entityTypeIcon,
                entityTypeColor: entity.entityTypeColor,
                name: entity.name,
                slug: entity.slug,
                updatedAt: entity.updatedAt,
              };
              this.entities.update(prev => [...prev, summary]);
            },
            error: () => {},
          });
        } else if (!myPerm?.canView && isInList) {
          // Entity was hidden from me → remove
          this.entities.update(prev => prev.filter(e => e.id !== entityId));
        }
      })
    );
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    if (!query.trim()) {
      this.searchResults.set(null);
      return;
    }
    this.searching.set(true);
    this.worldService.search(this.campaignId(), query.trim()).subscribe({
      next: results => { this.searchResults.set(results); this.searching.set(false); },
      error: () => { this.searchResults.set([]); this.searching.set(false); },
    });
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchResults.set(null);
  }

  openCreate() {
    this.dialog.open(EntityCreateDialogComponent, {
      width: '480px',
      data: { campaignId: this.campaignId(), types: this.types() },
    }).afterClosed().subscribe(result => { if (result) this.load(); });
  }

  openTypeManager() {
    this.dialog.open(EntityTypeManagerComponent, {
      width: '760px',
      maxHeight: '90vh',
      data: { campaignId: this.campaignId() },
    }).afterClosed().subscribe(changed => { if (changed) this.load(); });
  }

  openRelationshipTypeManager() {
    this.dialog.open(RelationshipTypeManagerComponent, {
      width: '540px',
      data: { campaignId: this.campaignId() },
    });
  }

  filterByType(typeId: string | null) {
    this.selectedTypeId.set(typeId);
    this.clearSearch();
  }

  goToGraph() {
    this.router.navigate(['graph'], { relativeTo: this.route });
  }
}
