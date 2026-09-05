export interface EntityTypeField {
  id: string;
  name: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'reference' | 'richtext' | 'url';
  isRequired: boolean;
  sortOrder: number;
}

export interface EntityType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isSystemDefault: boolean;
  campaignId: string | null;
}

export interface EntityTypeWithFields extends EntityType {
  fields: EntityTypeField[];
}

export interface EntitySummary {
  id: string;
  entityTypeId: string;
  entityTypeName: string;
  entityTypeIcon: string | null;
  entityTypeColor: string | null;
  name: string;
  slug: string;
  updatedAt: string;
}

export interface WorldEntity {
  id: string;
  campaignId: string;
  entityTypeId: string;
  entityTypeName: string;
  entityTypeIcon: string | null;
  entityTypeColor: string | null;
  entityTypeFields: EntityTypeField[];
  name: string;
  slug: string;
  createdBy: string;
  customFields: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  permissions: EntityPermission[];
}

export interface EntityPermission {
  roleId: string;
  roleName: string;
  canView: boolean;
  canEdit: boolean;
}

export interface RelationshipType {
  id: string;
  campaignId: string;
  labelForward: string;
  labelInverse: string;
  sourceTypeId: string | null;
  targetTypeId: string | null;
}

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  sourceEntityName: string;
  targetEntityId: string;
  targetEntityName: string;
  targetEntityTypeName: string;
  targetEntityTypeIcon: string | null;
  targetEntityTypeColor: string | null;
  relationshipTypeId: string;
  labelForward: string;
  labelInverse: string;
  notes: string | null;
}

export interface GraphNode {
  id: string;
  name: string;
  entityTypeName: string;
  icon: string | null;
  color: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface EntityChangeLog {
  id: string;
  userId: string;
  userDisplayName: string;
  changedAt: string;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
}

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Fecha',
  boolean: 'Sí/No',
  reference: 'Referencia',
  richtext: 'Texto enriquecido',
  url: 'URL',
};

export const FIELD_TYPES = ['text', 'number', 'date', 'boolean', 'reference', 'richtext', 'url'] as const;

export const MAT_ICONS_SUGGESTIONS = [
  'person', 'place', 'groups', 'inventory_2', 'event', 'castle', 'local_fire_department',
  'auto_awesome', 'shield', 'star', 'pets', 'sailing', 'map', 'temple_hindu', 'museum',
  'landscape', 'forest', 'anchor', 'flag', 'spa', 'diamond', 'bolt', 'water_drop',
];
