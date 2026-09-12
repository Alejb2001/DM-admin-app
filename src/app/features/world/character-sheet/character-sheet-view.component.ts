import { Component, inject, input, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CharacterSheetService } from '../services/character-sheet.service';
import { CharacterResource } from '../models/character-sheet.models';
import { ResourceBarComponent } from './resource-bar.component';

const RESOURCE_COLORS = [
  '#e53935', '#43a047', '#1e88e5', '#7e57c2',
  '#fb8c00', '#00acc1', '#f4511e', '#3949ab',
];

@Component({
  selector: 'app-character-sheet-view',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatTooltipModule,
    ResourceBarComponent,
  ],
  template: `
    <div class="sheet-view">
      <div class="section-header">
        <span class="section-label">Recursos</span>
        <button mat-icon-button (click)="toggleAddForm()"
                [matTooltip]="showAddForm() ? 'Cancelar' : 'Añadir recurso'">
          <mat-icon>{{ showAddForm() ? 'close' : 'add' }}</mat-icon>
        </button>
      </div>

      @if (showAddForm()) {
        <form [formGroup]="form" (ngSubmit)="addResource()" class="add-form">
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Nombre del recurso</mat-label>
            <input matInput formControlName="name" placeholder="HP, Mana, Stamina..." />
          </mat-form-field>
          <div class="row-2col">
            <mat-form-field appearance="outline" style="flex:1">
              <mat-label>Actual</mat-label>
              <input matInput type="number" formControlName="current" min="0" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="flex:1">
              <mat-label>Máximo</mat-label>
              <input matInput type="number" formControlName="max" min="1" />
            </mat-form-field>
          </div>
          <div class="color-row">
            <span class="color-label">Color</span>
            @for (c of colors; track c) {
              <div class="color-dot"
                   [style.background]="c"
                   [class.selected]="form.get('color')?.value === c"
                   (click)="form.get('color')!.setValue(c)">
              </div>
            }
          </div>
          <button mat-raised-button color="primary" type="submit"
                  [disabled]="form.invalid">Añadir</button>
        </form>
      }

      @if (resources().length === 0 && !showAddForm()) {
        <p class="empty-hint">Sin recursos. Añade HP, Mana, etc.</p>
      }

      @for (r of resources(); track r.id) {
        <div class="resource-row">
          <div class="bar-wrapper">
            <app-resource-bar [resource]="r" [editable]="true"
                              (valueChanged)="onValueChanged(r, $event)" />
          </div>
          <button mat-icon-button color="warn" (click)="deleteResource(r)" matTooltip="Eliminar">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .sheet-view { padding: 4px 0; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .section-label { font-weight: 600; font-size: 14px; color: #424242; }
    .add-form { display: flex; flex-direction: column; gap: 6px; padding: 12px; background: #f9f9f9; border-radius: 8px; margin-bottom: 12px; }
    .row-2col { display: flex; gap: 8px; }
    .color-row { display: flex; align-items: center; gap: 6px; }
    .color-label { font-size: 12px; color: #9e9e9e; }
    .color-dot { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: border-color .15s; }
    .color-dot.selected { border-color: #424242; }
    .resource-row { display: flex; align-items: flex-start; gap: 4px; margin-bottom: 8px; }
    .bar-wrapper { flex: 1; padding-top: 4px; }
    .empty-hint { color: #9e9e9e; font-size: 13px; padding: 4px 0; }
  `],
})
export class CharacterSheetViewComponent implements OnInit {
  campaignId = input.required<string>();
  entityId   = input.required<string>();

  private sheetService = inject(CharacterSheetService);
  private fb = inject(FormBuilder);

  resources   = signal<CharacterResource[]>([]);
  showAddForm = signal(false);

  readonly colors = RESOURCE_COLORS;

  form = this.fb.group({
    name:    ['', [Validators.required, Validators.maxLength(100)]],
    current: [10, [Validators.required, Validators.min(0)]],
    max:     [10, [Validators.required, Validators.min(1)]],
    color:   [RESOURCE_COLORS[0]],
  });

  ngOnInit() {
    this.sheetService.getResources(this.campaignId(), this.entityId())
      .subscribe(r => this.resources.set(r));
  }

  toggleAddForm() {
    this.showAddForm.update(v => !v);
    if (!this.showAddForm()) this.form.reset({ color: RESOURCE_COLORS[0], current: 10, max: 10 });
  }

  addResource() {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.sheetService.createResource(this.campaignId(), this.entityId(), {
      name: v.name!,
      current: v.current!,
      max: v.max!,
      color: v.color!,
      sortOrder: this.resources().length,
    }).subscribe(r => {
      this.resources.update(list => [...list, r]);
      this.toggleAddForm();
    });
  }

  onValueChanged(resource: CharacterResource, newValue: number) {
    this.sheetService.updateValue(this.campaignId(), this.entityId(), resource.id, newValue)
      .subscribe(updated => {
        this.resources.update(list => list.map(r => r.id === updated.id ? updated : r));
      });
  }

  deleteResource(resource: CharacterResource) {
    this.sheetService.deleteResource(this.campaignId(), this.entityId(), resource.id)
      .subscribe(() => {
        this.resources.update(list => list.filter(r => r.id !== resource.id));
      });
  }
}
