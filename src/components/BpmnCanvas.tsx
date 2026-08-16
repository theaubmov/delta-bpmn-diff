import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type EventBus from 'diagram-js/lib/core/EventBus';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import type { ChangeKind } from '../types';

export interface BpmnCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  focus: (elementId: string) => void;
}

interface BpmnCanvasProps {
  xml: string;
  markers: Partial<Record<ChangeKind, string[]>>;
  onElementClick?: (elementId: string) => void;
}

const BpmnCanvas = forwardRef<BpmnCanvasHandle, BpmnCanvasProps>(function BpmnCanvas(
  { xml, markers, onElementClick }, ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<NavigatedViewer | null>(null);
  const clickHandlerRef = useRef(onElementClick);
  const [ state, setState ] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ error, setError ] = useState('');

  clickHandlerRef.current = onElementClick;

  useEffect(() => {
    if (!hostRef.current) return;

    let active = true;
    const viewer = new NavigatedViewer({ container: hostRef.current });
    viewerRef.current = viewer;

    const eventBus = viewer.get<EventBus>('eventBus');
    eventBus.on('element.click', (event: unknown) => {
      const element = (event as { element?: { id?: string } }).element;
      if (element?.id) clickHandlerRef.current?.(element.id);
    });

    setState('loading');
    setError('');

    viewer.importXML(xml).then(() => {
      if (!active) return;
      const canvas = viewer.get<Canvas>('canvas');
      canvas.zoom('fit-viewport');
      setState('ready');
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : 'This diagram could not be rendered.');
      setState('error');
    });

    return () => {
      active = false;
      viewer.destroy();
      if (viewerRef.current === viewer) viewerRef.current = null;
    };
  }, [ xml ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || state !== 'ready') return;

    const canvas = viewer.get<Canvas>('canvas');
    const registry = viewer.get<ElementRegistry>('elementRegistry');
    const kinds: ChangeKind[] = [ 'added', 'removed', 'changed', 'layout' ];

    registry.getAll().forEach((element) => {
      kinds.forEach((kind) => canvas.removeMarker(element.id, `diff-${kind}`));
    });

    Object.entries(markers).forEach(([ kind, ids ]) => {
      ids?.forEach((id) => {
        if (registry.get(id)) canvas.addMarker(id, `diff-${kind}`);
      });
    });
  }, [ markers, state ]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const canvas = viewerRef.current?.get<Canvas>('canvas');
      if (canvas) canvas.zoom(Math.min((canvas.zoom() || 1) * 1.2, 4));
    },
    zoomOut: () => {
      const canvas = viewerRef.current?.get<Canvas>('canvas');
      if (canvas) canvas.zoom(Math.max((canvas.zoom() || 1) / 1.2, 0.2));
    },
    reset: () => viewerRef.current?.get<Canvas>('canvas').zoom('fit-viewport'),
    focus: (elementId) => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      const registry = viewer.get<ElementRegistry>('elementRegistry');
      const canvas = viewer.get<Canvas>('canvas');
      if (!registry.get(elementId)) return;
      canvas.scrollToElement(elementId, 120);
      canvas.addMarker(elementId, 'diff-focus');
      window.setTimeout(() => canvas.removeMarker(elementId, 'diff-focus'), 1400);
    }
  }), []);

  return (
    <div className="diagram-surface">
      <div ref={hostRef} className="diagram-canvas" />
      {state === 'loading' && (
        <div className="canvas-state"><LoaderCircle className="spin" size={22} /><span>Rendering process…</span></div>
      )}
      {state === 'error' && (
        <div className="canvas-state canvas-state--error">
          <AlertTriangle size={23} />
          <strong>Unable to render diagram</strong>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

export default BpmnCanvas;
