import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { WorldService } from '../services/world.service';
import { WorldEntity, EntityPermission, EntityRelationship, EntityChangeLog, FIELD_TYPE_LABELS } from '../models/world.models';
import { AuthService } from '../../../core/services/auth.service';
import { CampaignService } from '../../campaigns/services/campaign.service';
import { CampaignRole } from '../../campaigns/models/campaign.models';
import { SignalRService } from '../../../core/services/signalr.service';
import { AddRelationshipDialogComponent } from '../add-relationship-dialog/add-relationship-dialog.component';

@Component({
  selector: 'app-entity-detail',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe, MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatDividerModule,
    MatSlideToggleModule, MatFormFieldModule, MatInputModule, MatTooltipModule,
    MatCheckboxModule,
  ],
  templateUrl: './entity-detail.component.html',
})
export class EntityDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private worldService = inject(WorldService);
  private campaignService = inject(CampaignService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private signalR = inject(SignalRService);
  auth = inject(AuthService);

  campaignId = signal('');
  entity = signal<WorldEntity | null>(null);
  campaignRoles = signal<CampaignRole[]>([]);
  relationships = signal<EntityRelationship[]>([]);
  history = signal<EntityChangeLog[]>([]);
  loading = signal(true);
  editing = signal(false);
  saving = signal(false);
  historyVisible = signal(false);
  historyLoading = signal(false);
  externallyModified = signal(false); // Banner: another user edited while we were editing

  editName = '';
  editCustomFields: Record<string, unknown> = {};

  readonly fieldTypeLabels = FIELD_TYPE_LABELS;

  private subs: Subscription[] = [];

  ngOnInit() {
    const params = this.route.snapshot.params;
    const parentParams = this.route.parent?.snapshot.params ?? {};
    this.campaignId.set(parentParams['id'] ?? '');
    const entityId = params['entityId'];
    this.loadEntity(entityId);
    this.loadRoles();
    this.loadRelationships(entityId);
    this.subscribeToRealtime(entityId);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadEntity(entityId: string) {
    this.loading.set(true);
    this.worldService.getOne(this.campaignId(), entityId).subscribe({
      next: e => {
        this.entity.set(e);
        this.resetEdit(e);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadRoles() {
    this.campaignService.getDetail(this.campaignId()).subscribe(c => this.campaignRoles.set(c.roles));
  }

  loadRelationships(entityId: string) {
    this.worldService.getEntityRelationships(this.campaignId(), entityId).subscribe(r => this.relationships.set(r));
  }

  private subscribeToRealtime(entityId: string) {
    // EntityUpdated: if same entity, update or show conflict banner
    this.subs.push(
      this.signalR.entityUpdated$.subscribe(updated => {
        if (updated.id !== entityId) return;

        if (this.editing()) {
          // User was editing → show conflict banner
          this.externallyModified.set(true);
        } else {
          // Quietly apply the update
          this.entity.set(updated);
          this.resetEdit(updated);
        }
      })
    );

    // EntityDeleted: navigate away if this entity was deleted
    this.subs.push(
      this.signalR.entityDeleted$.subscribe(deletedId => {
        if (deletedId === entityId) {
          this.snack.open('Esta entidad fue eliminada.', 'Ok', { duration: 5000 });
          this.router.navigate(['../..'], { relativeTo: this.route });
        }
      })
    );

    // PermissionsChanged: reload permissions panel if same entity
    this.subs.push(
      this.signalR.permissionsChanged$.subscribe(({ entityId: changedId, permissions }) => {
        if (changedId !== entityId) return;
        this.entity.update(prev => prev ? { ...prev, permissions } : prev);
      })
    );
  }

  reloadAfterConflict() {
    const e = this.entity();
    if (!e) return;
    this.externallyModified.set(false);
    this.editing.set(false);
    this.loadEntity(e.id);
  }

  dismissConflict() {
    this.externallyModified.set(false);
  }

  private resetEdit(e: WorldEntity) {
    this.editName = e.name;
    this.editCustomFields = e.customFields ? { ...e.customFields as Record<string, unknown> } : {};
  }

  startEdit() {
    const e = this.entity();
    if (!e) return;
    this.resetEdit(e);
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
    this.externallyModified.set(false);
  }

  save() {
    const e = this.entity()!;
    this.saving.set(true);
    this.worldService.update(this.campaignId(), e.id, {
      name: this.editName,
      customFields: Object.keys(this.editCustomFields).length > 0 ? this.editCustomFields : null,
      updatedAt: e.updatedAt,
    }).subscribe({
      next: updated => {
        this.entity.set(updated);
        this.resetEdit(updated);
        this.editing.set(false);
        this.saving.set(false);
        this.externallyModified.set(false);
        this.snack.open('Guardado', undefined, { duration: 2000 });
      },
      error: err => {
        this.saving.set(false);
        if (err.status === 409)
          this.snack.open('Conflicto: otro usuario editó esta entidad. Recarga para ver la versión más reciente.', 'Recargar')
            .onAction().subscribe(() => this.reloadAfterConflict());
        else
          this.snack.open('Error al guardar', 'Ok');
      },
    });
  }

  getFieldValue(fieldId: string): unknown { return this.editCustomFields[fieldId] ?? ''; }

  setFieldValue(fieldId: string, value: unknown) {
    this.editCustomFields = { ...this.editCustomFields, [fieldId]: value };
  }

  getDisplayValue(fieldId: string): unknown {
    return (this.entity()?.customFields as Record<string, unknown> | null)?.[fieldId] ?? '—';
  }

  getFieldIcon(fieldType: string): string {
    const icons: Record<string, string> = {
      text: 'text_fields', number: 'numbers', date: 'calendar_today',
      boolean: 'toggle_on', reference: 'link', richtext: 'article', url: 'language',
    };
    return icons[fieldType] ?? 'label';
  }

  // ── Permissions ────────────────────────────────────────────────────────────

  getPermission(roleId: string): EntityPermission | undefined {
    return this.entity()?.permissions.find(p => p.roleId === roleId);
  }

  toggleView(role: CampaignRole) {
    const e = this.entity()!;
    const perm = this.getPermission(role.id);
    const canView = !perm?.canView;
    this.worldService.setPermission(this.campaignId(), e.id, {
      roleId: role.id, canView, canEdit: canView ? (perm?.canEdit ?? false) : false
    }).subscribe(perms => this.entity.update(prev => prev ? { ...prev, permissions: perms } : prev));
  }

  toggleEdit(role: CampaignRole) {
    const e = this.entity()!;
    const perm = this.getPermission(role.id);
    const canEdit = !perm?.canEdit;
    this.worldService.setPermission(this.campaignId(), e.id, {
      roleId: role.id, canView: true, canEdit
    }).subscribe(perms => this.entity.update(prev => prev ? { ...prev, permissions: perms } : prev));
  }

  // ── Relationships ──────────────────────────────────────────────────────────

  openAddRelationship() {
    const e = this.entity();
    if (!e) return;
    this.dialog.open(AddRelationshipDialogComponent, {
      width: '480px',
      data: { campaignId: this.campaignId(), currentEntityId: e.id },
    }).afterClosed().subscribe(result => {
      if (result) this.relationships.update(prev => [...prev, result]);
    });
  }

  // ── History ────────────────────────────────────────────────────────────────

  toggleHistory() {
    const nowVisible = !this.historyVisible();
    this.historyVisible.set(nowVisible);
    if (nowVisible && this.history().length === 0) {
      const e = this.entity();
      if (!e) return;
      this.historyLoading.set(true);
      this.worldService.getEntityHistory(this.campaignId(), e.id).subscribe({
        next: h => { this.history.set(h); this.historyLoading.set(false); },
        error: () => this.historyLoading.set(false),
      });
    }
  }

  historyFieldLabel(field: string | null): string {
    if (!field) return 'Entidad';
    if (field === 'name') return 'Nombre';
    if (field === 'customFields') return 'Campos';
    return field;
  }

  deleteRelationship(rel: EntityRelationship) {
    const e = this.entity();
    if (!e) return;
    if (!confirm('¿Eliminar esta relación?')) return;
    this.worldService.deleteEntityRelationship(this.campaignId(), e.id, rel.id).subscribe({
      next: () => this.relationships.update(prev => prev.filter(r => r.id !== rel.id)),
      error: err => this.snack.open(err.error?.error ?? 'Error al eliminar relación', 'Ok'),
    });
  }
}
