export type ChangeKind = 'added' | 'removed' | 'changed' | 'layout';

export interface BpmnFile {
  name: string;
  xml: string;
  size: number;
  modified: number;
}

export interface ChangedEntry {
  model?: BpmnElement;
  attrs?: Record<string, {
    oldValue?: unknown;
    newValue?: unknown;
  }>;
}

export interface BpmnElement {
  id?: string;
  name?: string;
  $type?: string;
  [key: string]: unknown;
}

export interface DiffResult {
  _added: Record<string, BpmnElement>;
  _removed: Record<string, BpmnElement>;
  _changed: Record<string, ChangedEntry>;
  _layoutChanged: Record<string, BpmnElement>;
}

export interface ChangeItem {
  id: string;
  name: string;
  type: string;
  kind: ChangeKind;
  details: string;
}
