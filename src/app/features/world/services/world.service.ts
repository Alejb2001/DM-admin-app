import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  EntitySummary, EntityType, EntityTypeWithFields, EntityTypeField,
  WorldEntity, EntityPermission,
  RelationshipType, EntityRelationship, GraphData, EntityChangeLog,
} from '../models/world.models';

@Injectable({ providedIn: 'root' })
export class WorldService {
  private http = inject(HttpClient);

  private base(campaignId: string) {
    return `${environment.apiUrl}/campaigns/${campaignId}/entities`;
  }

  private typeBase(campaignId: string) {
    return `${environment.apiUrl}/campaigns/${campaignId}/entity-types`;
  }

  private relBase(campaignId: string) {
    return `${environment.apiUrl}/campaigns/${campaignId}/relationship-types`;
  }

  // ── Entity Types (list for world) ──────────────────────────────────────────
  getTypes(campaignId: string) {
    return this.http.get<EntityType[]>(`${this.base(campaignId)}/types`);
  }

  // ── Entity Type Management (DM) ────────────────────────────────────────────
  getTypesWithFields(campaignId: string) {
    return this.http.get<EntityTypeWithFields[]>(this.typeBase(campaignId));
  }

  createEntityType(campaignId: string, data: { name: string; icon?: string; color?: string }) {
    return this.http.post<EntityTypeWithFields>(this.typeBase(campaignId), data);
  }

  updateEntityType(campaignId: string, typeId: string, data: { name: string; icon?: string; color?: string }) {
    return this.http.put<EntityTypeWithFields>(`${this.typeBase(campaignId)}/${typeId}`, data);
  }

  deleteEntityType(campaignId: string, typeId: string) {
    return this.http.delete<void>(`${this.typeBase(campaignId)}/${typeId}`);
  }

  // ── Entity Type Fields ─────────────────────────────────────────────────────
  addField(campaignId: string, typeId: string, data: { name: string; fieldType: string; isRequired: boolean; sortOrder: number }) {
    return this.http.post<EntityTypeField>(`${this.typeBase(campaignId)}/${typeId}/fields`, data);
  }

  updateField(campaignId: string, typeId: string, fieldId: string, data: { name: string; fieldType: string; isRequired: boolean; sortOrder: number }) {
    return this.http.put<EntityTypeField>(`${this.typeBase(campaignId)}/${typeId}/fields/${fieldId}`, data);
  }

  deleteField(campaignId: string, typeId: string, fieldId: string) {
    return this.http.delete<void>(`${this.typeBase(campaignId)}/${typeId}/fields/${fieldId}`);
  }

  // ── Entities ───────────────────────────────────────────────────────────────
  getAll(campaignId: string) {
    return this.http.get<EntitySummary[]>(this.base(campaignId));
  }

  getOne(campaignId: string, entityId: string) {
    return this.http.get<WorldEntity>(`${this.base(campaignId)}/${entityId}`);
  }

  create(campaignId: string, data: { entityTypeId: string; name: string }) {
    return this.http.post<WorldEntity>(this.base(campaignId), data);
  }

  update(campaignId: string, entityId: string, data: { name: string; customFields?: Record<string, unknown> | null; updatedAt: string }) {
    return this.http.put<WorldEntity>(`${this.base(campaignId)}/${entityId}`, data);
  }

  delete(campaignId: string, entityId: string) {
    return this.http.delete<void>(`${this.base(campaignId)}/${entityId}`);
  }

  search(campaignId: string, query: string) {
    const params = new HttpParams().set('q', query);
    return this.http.get<EntitySummary[]>(`${environment.apiUrl}/campaigns/${campaignId}/entities/search`, { params });
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  getPermissions(campaignId: string, entityId: string) {
    return this.http.get<EntityPermission[]>(`${this.base(campaignId)}/${entityId}/permissions`);
  }

  setPermission(campaignId: string, entityId: string, perm: { roleId: string; canView: boolean; canEdit: boolean }) {
    return this.http.put<EntityPermission[]>(`${this.base(campaignId)}/${entityId}/permissions`, perm);
  }

  // ── Relationship Types ─────────────────────────────────────────────────────
  getRelationshipTypes(campaignId: string) {
    return this.http.get<RelationshipType[]>(this.relBase(campaignId));
  }

  createRelationshipType(campaignId: string, data: { labelForward: string; labelInverse: string; sourceTypeId?: string | null; targetTypeId?: string | null }) {
    return this.http.post<RelationshipType>(this.relBase(campaignId), data);
  }

  updateRelationshipType(campaignId: string, typeId: string, data: { labelForward: string; labelInverse: string; sourceTypeId?: string | null; targetTypeId?: string | null }) {
    return this.http.put<RelationshipType>(`${this.relBase(campaignId)}/${typeId}`, data);
  }

  deleteRelationshipType(campaignId: string, typeId: string) {
    return this.http.delete<void>(`${this.relBase(campaignId)}/${typeId}`);
  }

  // ── Entity Relationships ───────────────────────────────────────────────────
  getEntityRelationships(campaignId: string, entityId: string) {
    return this.http.get<EntityRelationship[]>(`${this.base(campaignId)}/${entityId}/relationships`);
  }

  createEntityRelationship(campaignId: string, entityId: string, data: { targetEntityId: string; relationshipTypeId: string; notes?: string }) {
    return this.http.post<EntityRelationship>(`${this.base(campaignId)}/${entityId}/relationships`, data);
  }

  deleteEntityRelationship(campaignId: string, entityId: string, relationshipId: string) {
    return this.http.delete<void>(`${this.base(campaignId)}/${entityId}/relationships/${relationshipId}`);
  }

  // ── Graph ──────────────────────────────────────────────────────────────────
  getGraph(campaignId: string) {
    return this.http.get<GraphData>(`${environment.apiUrl}/campaigns/${campaignId}/graph`);
  }

  // ── History ────────────────────────────────────────────────────────────────
  getEntityHistory(campaignId: string, entityId: string) {
    return this.http.get<EntityChangeLog[]>(`${this.base(campaignId)}/${entityId}/history`);
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  exportCampaign(campaignId: string) {
    return this.http.get(`${environment.apiUrl}/campaigns/${campaignId}/export`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}
