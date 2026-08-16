import { BpmnModdle } from 'bpmn-moddle';
import diff from '../../lib/diff.js';
import type { BpmnElement, ChangeItem, ChangedEntry, DiffResult } from '../types';

const emptyDiff = (): DiffResult => ({
  _added: {},
  _removed: {},
  _changed: {},
  _layoutChanged: {}
});

export async function compareXml(beforeXml: string, afterXml: string): Promise<DiffResult> {
  const moddle = new BpmnModdle();
  const [ before, after ] = await Promise.all([
    moddle.fromXML(beforeXml),
    moddle.fromXML(afterXml)
  ]);

  return (diff(before.rootElement, after.rootElement) || emptyDiff()) as DiffResult;
}

export async function validateBpmnXml(xml: string): Promise<void> {
  if (!xml.trim()) {
    throw new Error('Paste a BPMN XML document before continuing.');
  }

  if (!/<(?:\w+:)?definitions\b/i.test(xml)) {
    throw new Error('The XML must contain a BPMN <definitions> element.');
  }

  try {
    const moddle = new BpmnModdle();
    const parsed = await moddle.fromXML(xml);
    if (!parsed.rootElement) {
      throw new Error('No BPMN definitions were found.');
    }
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : 'Unknown XML parsing error';
    throw new Error(`Invalid BPMN XML: ${detail}`);
  }
}

function humanType(element?: BpmnElement): string {
  return element?.$type?.replace(/^bpmn:/, '').replace(/([a-z])([A-Z])/g, '$1 $2') || 'BPMN element';
}

function displayName(id: string, element?: BpmnElement): string {
  const name = typeof element?.name === 'string' ? element.name.trim() : '';
  return name || id;
}

function changedDetails(change: ChangedEntry): string {
  const fields = Object.keys(change.attrs || {}).filter((field) => !field.startsWith('$'));

  if (!fields.length) {
    return 'Properties updated';
  }

  const shown = fields.slice(0, 3).map((field) => field.replace(/([a-z])([A-Z])/g, '$1 $2'));
  return `Updated ${shown.join(', ')}${fields.length > shown.length ? ` +${fields.length - shown.length}` : ''}`;
}

export function toChangeItems(result: DiffResult): ChangeItem[] {
  const items: ChangeItem[] = [];

  Object.entries(result._added).forEach(([ id, element ]) => items.push({
    id,
    name: displayName(id, element),
    type: humanType(element),
    kind: 'added',
    details: 'Added to the current version'
  }));

  Object.entries(result._removed).forEach(([ id, element ]) => items.push({
    id,
    name: displayName(id, element),
    type: humanType(element),
    kind: 'removed',
    details: 'Removed from the baseline'
  }));

  Object.entries(result._changed).forEach(([ id, change ]) => items.push({
    id,
    name: displayName(id, change.model),
    type: humanType(change.model),
    kind: 'changed',
    details: changedDetails(change)
  }));

  Object.entries(result._layoutChanged).forEach(([ id, element ]) => items.push({
    id,
    name: displayName(id, element),
    type: humanType(element),
    kind: 'layout',
    details: 'Position or waypoints changed'
  }));

  return items;
}

export function buildReport(result: DiffResult, beforeName: string, afterName: string) {
  const changes = toChangeItems(result);

  return {
    generatedAt: new Date().toISOString(),
    comparison: { before: beforeName, after: afterName },
    summary: {
      total: changes.length,
      added: changes.filter(({ kind }) => kind === 'added').length,
      removed: changes.filter(({ kind }) => kind === 'removed').length,
      changed: changes.filter(({ kind }) => kind === 'changed').length,
      layout: changes.filter(({ kind }) => kind === 'layout').length
    },
    changes
  };
}
