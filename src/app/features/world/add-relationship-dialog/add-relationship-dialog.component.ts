import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorldService } from '../services/world.service';
import { EntitySummary, RelationshipType } from '../models/world.models';

interface DialogData {
  campaignId: string;
  currentEntityId: string;
}

@Component({
  selector: 'app-add-relationship-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Agregar relación</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Tipo de relación</mat-label>
        <mat-select [(ngModel)]="selectedTypeId">
          @for (rt of relTypes(); track rt.id) {
            <mat-option [value]="rt.id">{{ rt.labelForward }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
        <mat-label>Entidad destino</mat-label>
        <mat-select [(ngModel)]="selectedEntityId">
          @for (e of otherEntities(); track e.id) {
            <mat-option [value]="e.id">{{ e.name }} <small style="color:#9e9e9e">({{ e.entityTypeName }})</small></mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
        <mat-label>Notas (opcional)</mat-label>
        <textarea matInput [(ngModel)]="notes" rows="2"></textarea>
      </mat-form-field>

      @if (relTypes().length === 0) {
        <p style="color:#e53935;font-size:13px">No hay tipos de relación definidos. Crea uno primero desde el gestor de tipos.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" (click)="save()"
        [disabled]="saving() || !selectedTypeId || !selectedEntityId">
        @if (saving()) { <mat-spinner diameter="18" /> } @else { Agregar }
      </button>
    </mat-dialog-actions>
  `,
})
export class AddRelationshipDialogComponent implements OnInit {
  private worldService = inject(WorldService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<AddRelationshipDialogComponent>);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  relTypes = signal<RelationshipType[]>([]);
  otherEntities = signal<EntitySummary[]>([]);
  selectedTypeId = '';
  selectedEntityId = '';
  notes = '';
  saving = signal(false);

  ngOnInit() {
    this.worldService.getRelationshipTypes(this.data.campaignId).subscribe(t => this.relTypes.set(t));
    this.worldService.getAll(this.data.campaignId).subscribe(entities =>
      this.otherEntities.set(entities.filter(e => e.id !== this.data.currentEntityId))
    );
  }

  save() {
    if (!this.selectedTypeId || !this.selectedEntityId) return;
    this.saving.set(true);
    this.worldService.createEntityRelationship(this.data.campaignId, this.data.currentEntityId, {
      targetEntityId: this.selectedEntityId,
      relationshipTypeId: this.selectedTypeId,
      notes: this.notes || undefined,
    }).subscribe({
      next: rel => this.dialogRef.close(rel),
      error: err => {
        this.saving.set(false);
        this.snack.open(err.error?.error ?? 'Error al agregar relación', 'Ok');
      },
    });
  }
}
