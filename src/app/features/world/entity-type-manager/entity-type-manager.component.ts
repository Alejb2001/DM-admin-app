import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { WorldService } from '../services/world.service';
import { EntityTypeWithFields, EntityTypeField, FIELD_TYPE_LABELS, FIELD_TYPES, MAT_ICONS_SUGGESTIONS } from '../models/world.models';

@Component({
  selector: 'app-entity-type-manager',
  standalone: true,
  imports: [
    FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatDividerModule, MatTooltipModule, MatChipsModule,
  ],
  templateUrl: './entity-type-manager.component.html',
})
export class EntityTypeManagerComponent implements OnInit {
  private worldService = inject(WorldService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<EntityTypeManagerComponent>);
  data = inject<{ campaignId: string }>(MAT_DIALOG_DATA);

  types = signal<EntityTypeWithFields[]>([]);
  selectedType = signal<EntityTypeWithFields | null>(null);
  loading = signal(true);
  saving = signal(false);

  // New type form
  newTypeName = '';
  newTypeIcon = 'label';
  newTypeColor = '#607D8B';
  showNewTypeForm = signal(false);

  // Edit type form
  editTypeName = '';
  editTypeIcon = '';
  editTypeColor = '';
  editingType = signal(false);

  // New field form
  newFieldName = '';
  newFieldType: string = 'text';
  newFieldRequired = false;
  showNewFieldForm = signal(false);

  readonly fieldTypeLabels = FIELD_TYPE_LABELS;
  readonly fieldTypes = FIELD_TYPES;
  readonly iconSuggestions = MAT_ICONS_SUGGESTIONS;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.worldService.getTypesWithFields(this.data.campaignId).subscribe({
      next: types => {
        this.types.set(types);
        // Re-select current type if still exists
        const sel = this.selectedType();
        if (sel) {
          const updated = types.find(t => t.id === sel.id);
          this.selectedType.set(updated ?? null);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectType(type: EntityTypeWithFields) {
    this.selectedType.set(type);
    this.editTypeName = type.name;
    this.editTypeIcon = type.icon ?? 'label';
    this.editTypeColor = type.color ?? '#607D8B';
    this.editingType.set(false);
    this.showNewFieldForm.set(false);
  }

  // ── Type CRUD ─────────────────────────────────────────────────────────────

  createType() {
    if (!this.newTypeName.trim()) return;
    this.saving.set(true);
    this.worldService.createEntityType(this.data.campaignId, {
      name: this.newTypeName.trim(),
      icon: this.newTypeIcon,
      color: this.newTypeColor,
    }).subscribe({
      next: newType => {
        this.showNewTypeForm.set(false);
        this.newTypeName = '';
        this.saving.set(false);
        this.load();
        this.snack.open('Tipo creado', undefined, { duration: 2000 });
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err.error?.error ?? 'Error al crear tipo', 'Ok');
      },
    });
  }

  saveTypeEdit() {
    const type = this.selectedType();
    if (!type || !this.editTypeName.trim()) return;
    this.saving.set(true);
    this.worldService.updateEntityType(this.data.campaignId, type.id, {
      name: this.editTypeName.trim(),
      icon: this.editTypeIcon,
      color: this.editTypeColor,
    }).subscribe({
      next: () => {
        this.editingType.set(false);
        this.saving.set(false);
        this.load();
        this.snack.open('Guardado', undefined, { duration: 2000 });
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err.error?.error ?? 'Error al guardar', 'Ok');
      },
    });
  }

  deleteType() {
    const type = this.selectedType();
    if (!type) return;
    if (!confirm(`¿Eliminar tipo "${type.name}"? Se eliminará solo si no tiene entidades.`)) return;
    this.worldService.deleteEntityType(this.data.campaignId, type.id).subscribe({
      next: () => {
        this.selectedType.set(null);
        this.load();
        this.snack.open('Tipo eliminado', undefined, { duration: 2000 });
      },
      error: err => this.snack.open(err.error?.error ?? 'Error al eliminar', 'Ok'),
    });
  }

  // ── Field CRUD ────────────────────────────────────────────────────────────

  addField() {
    const type = this.selectedType();
    if (!type || !this.newFieldName.trim()) return;
    this.saving.set(true);
    this.worldService.addField(this.data.campaignId, type.id, {
      name: this.newFieldName.trim(),
      fieldType: this.newFieldType,
      isRequired: this.newFieldRequired,
      sortOrder: type.fields.length,
    }).subscribe({
      next: () => {
        this.newFieldName = '';
        this.newFieldType = 'text';
        this.newFieldRequired = false;
        this.showNewFieldForm.set(false);
        this.saving.set(false);
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err.error?.error ?? 'Error al agregar campo', 'Ok');
      },
    });
  }

  deleteField(field: EntityTypeField) {
    const type = this.selectedType();
    if (!type) return;
    if (!confirm(`¿Eliminar campo "${field.name}"?`)) return;
    this.worldService.deleteField(this.data.campaignId, type.id, field.id).subscribe({
      next: () => this.load(),
      error: err => this.snack.open(err.error?.error ?? 'Error al eliminar campo', 'Ok'),
    });
  }

  getFieldIcon(fieldType: string): string {
    const icons: Record<string, string> = {
      text: 'text_fields', number: 'numbers', date: 'calendar_today',
      boolean: 'toggle_on', reference: 'link', richtext: 'article', url: 'language',
    };
    return icons[fieldType] ?? 'label';
  }

  close() { this.dialogRef.close(true); }
}
