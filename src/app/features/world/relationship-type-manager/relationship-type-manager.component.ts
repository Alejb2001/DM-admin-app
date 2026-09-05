import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorldService } from '../services/world.service';
import { RelationshipType, EntityType } from '../models/world.models';

@Component({
  selector: 'app-relationship-type-manager',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDividerModule],
  template: `
    <h2 mat-dialog-title>Tipos de relación</h2>
    <mat-dialog-content style="min-width:480px;min-height:300px">
      <!-- Existing types -->
      @for (rt of relTypes(); track rt.id) {
        <div class="rel-type-item">
          <div class="rel-labels">
            <span class="forward">{{ rt.labelForward }}</span>
            <mat-icon style="color:#bdbdbd;font-size:16px">sync_alt</mat-icon>
            <span class="inverse">{{ rt.labelInverse }}</span>
          </div>
          <button mat-icon-button color="warn" (click)="delete(rt)" style="flex-shrink:0">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      }

      @if (relTypes().length === 0 && !showForm()) {
        <p style="color:#9e9e9e;font-size:13px">No hay tipos de relación definidos.</p>
      }

      <mat-divider style="margin:12px 0" />

      <!-- New type form -->
      @if (showForm()) {
        <div class="new-form">
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Etiqueta directa (A → B)</mat-label>
            <input matInput [(ngModel)]="labelForward" placeholder="Ej: gobierna, pertenece a..." />
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Etiqueta inversa (B → A)</mat-label>
            <input matInput [(ngModel)]="labelInverse" placeholder="Ej: es gobernado por, contiene..." />
          </mat-form-field>
          <div style="display:flex;gap:8px">
            <button mat-raised-button color="primary" (click)="create()" [disabled]="saving() || !labelForward.trim() || !labelInverse.trim()">Crear</button>
            <button mat-button (click)="showForm.set(false)">Cancelar</button>
          </div>
        </div>
      } @else {
        <button mat-stroked-button (click)="showForm.set(true)">
          <mat-icon>add</mat-icon> Nuevo tipo de relación
        </button>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button (click)="dialogRef.close(true)">Cerrar</button>
    </mat-dialog-actions>
    <style>
      .rel-type-item { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f5f5f5; }
      .rel-labels { display:flex; align-items:center; gap:8px; flex:1; }
      .forward { font-weight:500; font-size:14px; }
      .inverse { font-size:13px; color:#9e9e9e; }
      .new-form { display:flex; flex-direction:column; gap:8px; }
    </style>
  `,
})
export class RelationshipTypeManagerComponent implements OnInit {
  private worldService = inject(WorldService);
  private snack = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<RelationshipTypeManagerComponent>);
  data = inject<{ campaignId: string }>(MAT_DIALOG_DATA);

  relTypes = signal<RelationshipType[]>([]);
  showForm = signal(false);
  saving = signal(false);
  labelForward = '';
  labelInverse = '';

  ngOnInit() { this.load(); }

  load() {
    this.worldService.getRelationshipTypes(this.data.campaignId).subscribe(t => this.relTypes.set(t));
  }

  create() {
    if (!this.labelForward.trim() || !this.labelInverse.trim()) return;
    this.saving.set(true);
    this.worldService.createRelationshipType(this.data.campaignId, {
      labelForward: this.labelForward.trim(),
      labelInverse: this.labelInverse.trim(),
    }).subscribe({
      next: () => {
        this.labelForward = '';
        this.labelInverse = '';
        this.showForm.set(false);
        this.saving.set(false);
        this.load();
        this.snack.open('Tipo creado', undefined, { duration: 2000 });
      },
      error: err => { this.saving.set(false); this.snack.open(err.error?.error ?? 'Error', 'Ok'); },
    });
  }

  delete(rt: RelationshipType) {
    if (!confirm(`¿Eliminar tipo "${rt.labelForward}"? Se eliminarán también las relaciones de este tipo.`)) return;
    this.worldService.deleteRelationshipType(this.data.campaignId, rt.id).subscribe({
      next: () => { this.load(); this.snack.open('Eliminado', undefined, { duration: 2000 }); },
      error: err => this.snack.open(err.error?.error ?? 'Error', 'Ok'),
    });
  }
}
