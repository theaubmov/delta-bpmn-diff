import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import {
  ArrowLeftRight,
  ChevronRight,
  CircleDot,
  Download,
  FileDiff,
  Focus,
  GitFork,
  GitCompareArrows,
  ImageDown,
  LoaderCircle,
  Maximize2,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import FileDropzone from './components/FileDropzone';
import BpmnCanvas, { type BpmnCanvasHandle } from './components/BpmnCanvas';
import { buildReport, compareXml, toChangeItems } from './lib/comparison';
import type { BpmnFile, ChangeItem, ChangeKind, DiffResult } from './types';
import { PROJECT_REPOSITORY_URL } from './config';
import demoBeforeXml from '../test/fixtures/pizza-collaboration/old.bpmn?raw';
import demoAfterXml from '../test/fixtures/pizza-collaboration/new.bpmn?raw';

const XmlEditorModal = lazy(() => import('./components/XmlEditorModal'));

const EMPTY_DIFF: DiffResult = {
  _added: {},
  _removed: {},
  _changed: {},
  _layoutChanged: {}
};

const demoFile = (name: string, xml: string): BpmnFile => ({
  name,
  xml,
  size: new Blob([ xml ]).size,
  modified: Date.now()
});

type Filter = 'all' | ChangeKind;

const KIND_META: Record<ChangeKind, { label: string; short: string }> = {
  added: { label: 'Added', short: '+' },
  removed: { label: 'Removed', short: '−' },
  changed: { label: 'Changed', short: '∆' },
  layout: { label: 'Moved', short: '↗' }
};

function count(result: DiffResult, kind: ChangeKind) {
  const key = kind === 'layout' ? '_layoutChanged' : `_${kind}` as keyof DiffResult;
  return Object.keys(result[key]).length;
}

function markerIds(result: DiffResult, side: 'before' | 'after') {
  return {
    ...(side === 'before' ? { removed: Object.keys(result._removed) } : { added: Object.keys(result._added) }),
    changed: Object.keys(result._changed),
    layout: Object.keys(result._layoutChanged)
  };
}

function readBpmnFile(file: File): Promise<BpmnFile> {
  if (file.size > 10 * 1024 * 1024) {
    return Promise.reject(new Error('Please choose a BPMN file smaller than 10 MB.'));
  }

  if (!/\.(bpmn|xml)$/i.test(file.name)) {
    return Promise.reject(new Error('Please choose a .bpmn or .xml file.'));
  }

  return file.text().then((xml) => {
    if (!/<(?:\w+:)?definitions\b/i.test(xml)) {
      throw new Error('The selected file does not look like a BPMN 2.0 document.');
    }

    return { name: file.name, xml, size: file.size, modified: file.lastModified };
  });
}

function inlineDiffSvgStyles(root: HTMLElement) {
  const selector = [
    '.diff-added .djs-visual > *',
    '.diff-added .djs-outline',
    '.diff-removed .djs-visual > *',
    '.diff-removed .djs-outline',
    '.diff-changed .djs-visual > *',
    '.diff-changed .djs-outline',
    '.diff-layout .djs-visual > *',
    '.diff-layout .djs-outline',
    '.diff-focus .djs-outline'
  ].join(',');
  const properties = [
    'color',
    'fill',
    'fill-opacity',
    'opacity',
    'paint-order',
    'stroke',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-opacity',
    'stroke-width',
    'visibility'
  ];

  const originals = Array.from(root.querySelectorAll<SVGElement>(selector)).map((element) => ({
    element,
    style: element.getAttribute('style')
  }));

  originals.forEach(({ element }) => {
    const computed = window.getComputedStyle(element);
    properties.forEach((property) => {
      const value = computed.getPropertyValue(property);
      if (value) element.style.setProperty(property, value, 'important');
    });
  });

  return () => {
    originals.forEach(({ element, style }) => {
      if (style === null) element.removeAttribute('style');
      else element.setAttribute('style', style);
    });
  };
}

export default function App() {
  const [ before, setBefore ] = useState<BpmnFile | null>(() => demoFile('pizza-order-v1.bpmn', demoBeforeXml));
  const [ after, setAfter ] = useState<BpmnFile | null>(() => demoFile('pizza-order-v2.bpmn', demoAfterXml));
  const [ result, setResult ] = useState<DiffResult>(EMPTY_DIFF);
  const [ status, setStatus ] = useState<'idle' | 'comparing' | 'ready' | 'error'>('comparing');
  const [ error, setError ] = useState('');
  const [ fileError, setFileError ] = useState('');
  const [ filter, setFilter ] = useState<Filter>('all');
  const [ query, setQuery ] = useState('');
  const [ selectedId, setSelectedId ] = useState<string | null>(null);
  const [ editorSide, setEditorSide ] = useState<'before' | 'after' | null>(null);
  const [ changeLogOpen, setChangeLogOpen ] = useState(false);
  const [ imageExporting, setImageExporting ] = useState(false);
  const [ imageExportError, setImageExportError ] = useState('');
  const [ imageDownload, setImageDownload ] = useState<{ url: string; name: string; size: number } | null>(null);
  const beforeCanvas = useRef<BpmnCanvasHandle>(null);
  const afterCanvas = useRef<BpmnCanvasHandle>(null);
  const exportSurface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!before || !after) {
      setResult(EMPTY_DIFF);
      setStatus('idle');
      return;
    }

    let active = true;
    setStatus('comparing');
    setError('');
    setSelectedId(null);

    compareXml(before.xml, after.xml).then((nextResult) => {
      if (!active) return;
      setResult(nextResult);
      setStatus('ready');
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : 'The BPMN files could not be compared.');
      setStatus('error');
    });

    return () => { active = false; };
  }, [ before, after ]);

  useEffect(() => {
    return () => {
      if (imageDownload) URL.revokeObjectURL(imageDownload.url);
    };
  }, [ imageDownload ]);

  const changes = useMemo(() => toChangeItems(result), [ result ]);
  const visibleChanges = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return changes.filter((item) => {
      const matchesFilter = filter === 'all' || item.kind === filter;
      const matchesQuery = !normalized || `${item.name} ${item.id} ${item.type}`.toLowerCase().includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [ changes, filter, query ]);

  const loadFile = async (side: 'before' | 'after', file: File) => {
    setFileError('');
    try {
      const loaded = await readBpmnFile(file);
      if (side === 'before') setBefore(loaded);
      else setAfter(loaded);
    } catch (reason) {
      setFileError(reason instanceof Error ? reason.message : 'Could not read that file.');
    }
  };

  const focusChange = (item: ChangeItem) => {
    setSelectedId(item.id);
    if (item.kind !== 'added') beforeCanvas.current?.focus(item.id);
    if (item.kind !== 'removed') afterCanvas.current?.focus(item.id);
  };

  const exportReport = () => {
    if (!before || !after) return;
    const report = buildReport(result, before.name, after.name);
    const blob = new Blob([ JSON.stringify(report, null, 2) ], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bpmn-diff-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportVisualDiff = async () => {
    if (!before || !after || !exportSurface.current || imageExporting) return;

    setImageExportError('');
    setImageDownload(null);
    setImageExporting(true);
    let restoreDiffStyles: () => void = () => {};

    try {
      await document.fonts?.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const surface = exportSurface.current;
      restoreDiffStyles = inlineDiffSvgStyles(surface);
      const imageBlob = await toBlob(surface, {
        backgroundColor: '#f6f7f3',
        pixelRatio: 2,
        skipFonts: true,
        width: surface.scrollWidth,
        height: surface.scrollHeight,
        style: {
          width: `${surface.scrollWidth}px`,
          height: `${surface.scrollHeight}px`
        }
      });

      if (!imageBlob) {
        throw new Error('The browser could not create the PNG image.');
      }

      const filePart = (value: string) => value.replace(/\.(bpmn|xml)$/i, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '');
      const imageUrl = URL.createObjectURL(imageBlob);
      const imageName = `${filePart(before.name)}-vs-${filePart(after.name)}-diff.png`;
      const anchor = document.createElement('a');
      anchor.href = imageUrl;
      anchor.download = imageName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setImageDownload({ url: imageUrl, name: imageName, size: imageBlob.size });
    } catch (reason) {
      setImageExportError(reason instanceof Error ? reason.message : 'The visual comparison could not be exported.');
    } finally {
      restoreDiffStyles();
      setImageExporting(false);
    }
  };

  const reset = () => {
    setBefore(null);
    setAfter(null);
    setFilter('all');
    setQuery('');
    setFileError('');
    setImageDownload(null);
    setChangeLogOpen(false);
  };

  const hasFiles = Boolean(before && after);
  const total = changes.length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-stack">
          <a className="brand" href="#top" aria-label="Delta home">
            <span className="brand-mark"><GitCompareArrows size={18} /></span>
            <span>delta</span>
            <em>BPMN</em>
          </a>
          <span className="local-badge"><span /> Browser-side processing</span>
        </div>
        <section className="source-picker source-picker--header" aria-label="Select BPMN files">
          <FileDropzone
            eyebrow="Baseline"
            label="Earlier version"
            tone="before"
            file={before}
            onFile={(file) => loadFile('before', file)}
            onClear={() => setBefore(null)}
            onEdit={() => setEditorSide('before')}
          />
          <button
            className="swap-button"
            type="button"
            aria-label="Swap baseline and current files"
            title="Swap versions"
            disabled={!before && !after}
            onClick={() => { setBefore(after); setAfter(before); }}
          >
            <ArrowLeftRight size={15} />
          </button>
          <FileDropzone
            eyebrow="Current"
            label="Newer version"
            tone="after"
            file={after}
            onFile={(file) => loadFile('after', file)}
            onClear={() => setAfter(null)}
            onEdit={() => setEditorSide('after')}
          />
        </section>
        <div className="topbar-actions">
          <button className="text-button" type="button" onClick={reset}><RefreshCw size={15} /> Reset</button>
          <button className="image-export-button" type="button" onClick={exportVisualDiff} disabled={!hasFiles || status !== 'ready' || imageExporting}>
            {imageExporting ? <LoaderCircle className="spin" size={16} /> : <ImageDown size={16} />} {imageExporting ? 'Creating…' : 'PNG'}
          </button>
          <button className="primary-button" type="button" onClick={exportReport} disabled={!hasFiles || status !== 'ready'}>
            <Download size={16} /> Report
          </button>
        </div>
      </header>

      <main id="top">
        {fileError && <div className="notice notice--error">{fileError}</div>}
        {imageExportError && <div className="notice notice--error"><strong>PNG export failed.</strong> {imageExportError}</div>}
        {imageDownload && (
          <div className="notice notice--success">
            <strong>PNG ready.</strong> {(imageDownload.size / 1024 / 1024).toFixed(1)} MB image generated.
            <a href={imageDownload.url} download={imageDownload.name}>Download again</a>
            <button type="button" aria-label="Dismiss PNG notification" title="Dismiss" onClick={() => setImageDownload(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {!hasFiles && (
          <section className="empty-workspace">
            <div className="empty-illustration"><FileDiff size={31} /><span><Plus size={13} /></span></div>
            <h2>Add both process versions</h2>
            <p>Choose a baseline and a current BPMN file to start the visual comparison.</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setBefore(demoFile('pizza-order-v1.bpmn', demoBeforeXml));
                setAfter(demoFile('pizza-order-v2.bpmn', demoAfterXml));
              }}
            >
              Load example comparison
            </button>
          </section>
        )}

        {hasFiles && (
          <div ref={exportSurface} className={`export-surface ${imageExporting ? 'export-surface--capturing' : ''}`}>
            {status === 'error' && <div className="notice notice--error"><strong>Comparison failed.</strong> {error}</div>}

            <section className={`workspace ${changeLogOpen ? 'workspace--changes-open' : 'workspace--changes-closed'}`}>
              <div className="comparison-pane">
                <div className="pane-toolbar">
                  <div className="diff-overview" aria-label="Comparison results">
                    <button className="diff-total" type="button" onClick={() => { setFilter('all'); setChangeLogOpen(true); }} disabled={status !== 'ready'}>
                      <strong>{status === 'comparing' ? '…' : total}</strong><span>differences</span>
                    </button>
                    <div className="legend" aria-label="Diff legend">
                      {(['added', 'removed', 'changed', 'layout'] as ChangeKind[]).map((kind) => (
                        <button
                          className={`legend-item legend-item--${kind}`}
                          type="button"
                          key={kind}
                          disabled={status !== 'ready'}
                          onClick={() => { setFilter(kind); setChangeLogOpen(true); }}
                        >
                          <i className={`legend-dot legend-dot--${kind}`} />
                          <span>{KIND_META[kind].label}</span>
                          <strong>{count(result, kind)}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="canvas-controls">
                    <button type="button" title="Zoom out" onClick={() => { beforeCanvas.current?.zoomOut(); afterCanvas.current?.zoomOut(); }}><Minus size={15} /></button>
                    <button type="button" title="Fit both diagrams" onClick={() => { beforeCanvas.current?.reset(); afterCanvas.current?.reset(); }}><Maximize2 size={14} /></button>
                    <button type="button" title="Zoom in" onClick={() => { beforeCanvas.current?.zoomIn(); afterCanvas.current?.zoomIn(); }}><Plus size={15} /></button>
                  </div>
                </div>

                <div className="diagram-grid">
                  <article className="diagram-panel">
                    <header>
                      <div><span className="version-tag version-tag--before">Baseline</span><strong>{before!.name}</strong></div>
                      <small>Earlier version</small>
                    </header>
                    <BpmnCanvas
                      ref={beforeCanvas}
                      xml={before!.xml}
                      markers={markerIds(result, 'before')}
                      onElementClick={(id) => setSelectedId(id)}
                    />
                  </article>
                  <article className="diagram-panel">
                    <header>
                      <div><span className="version-tag version-tag--after">Current</span><strong>{after!.name}</strong></div>
                      <small>Newer version</small>
                    </header>
                    <BpmnCanvas
                      ref={afterCanvas}
                      xml={after!.xml}
                      markers={markerIds(result, 'after')}
                      onElementClick={(id) => setSelectedId(id)}
                    />
                  </article>
                </div>
              </div>

              <aside className={`changes-panel ${changeLogOpen ? 'changes-panel--open' : 'changes-panel--collapsed'}`}>
                {!changeLogOpen ? (
                  <button
                    className="change-log-toggle"
                    type="button"
                    aria-expanded="false"
                    aria-label={`Open change log, ${total} differences`}
                    onClick={() => setChangeLogOpen(true)}
                  >
                    <PanelRightOpen size={16} />
                    <span>Change log</span>
                    <strong>{total}</strong>
                  </button>
                ) : (
                  <>
                    <div className="changes-header">
                      <div>
                        <span>Change log</span>
                        <div className="changes-header-actions">
                          <strong>{visibleChanges.length}</strong>
                          <button type="button" aria-label="Collapse change log" title="Collapse change log" onClick={() => setChangeLogOpen(false)}>
                            <PanelRightClose size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="search-box"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an element" aria-label="Find a changed element" /></div>
                    </div>
                    <div className="filter-row">
                      {(['all', 'added', 'removed', 'changed', 'layout'] as Filter[]).map((kind) => (
                        <button type="button" className={filter === kind ? 'is-active' : ''} key={kind} onClick={() => setFilter(kind)}>
                          {kind === 'all' ? 'All' : KIND_META[kind].label}
                        </button>
                      ))}
                    </div>
                    <div className="change-list">
                      {status === 'comparing' && <div className="list-state"><LoaderCircle className="spin" size={20} /> Analysing semantic changes…</div>}
                      {status === 'ready' && !visibleChanges.length && (
                        <div className="list-state"><CircleDot size={20} /> {changes.length ? 'No changes match this filter.' : 'These BPMN files are identical.'}</div>
                      )}
                      {status === 'ready' && visibleChanges.map((item) => (
                        <button
                          type="button"
                          key={`${item.kind}-${item.id}`}
                          className={`change-item change-item--${item.kind} ${selectedId === item.id ? 'is-selected' : ''}`}
                          onClick={() => focusChange(item)}
                        >
                          <span className="change-glyph">{KIND_META[item.kind].short}</span>
                          <span className="change-copy">
                            <span><strong>{item.name}</strong><em>{KIND_META[item.kind].label}</em></span>
                            <small>{item.type} · {item.details}</small>
                            <code>{item.id}</code>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    </div>
                    <footer><Focus size={14} /> Select a change to locate it in both diagrams</footer>
                  </>
                )}
              </aside>
            </section>

          </div>
        )}
      </main>

      <footer className="page-footer">
        <span>Delta BPMN</span>
        <span>Semantic comparison powered by bpmn-js</span>
        <nav className="page-footer-nav" aria-label="Project information">
          <a href="./about.html">About</a>
          <a href="./LICENSE.txt">MIT License</a>
          <a
            className={`github-link ${PROJECT_REPOSITORY_URL ? '' : 'is-disabled'}`}
            href={PROJECT_REPOSITORY_URL || undefined}
            target={PROJECT_REPOSITORY_URL ? '_blank' : undefined}
            rel={PROJECT_REPOSITORY_URL ? 'noreferrer' : undefined}
            aria-disabled={!PROJECT_REPOSITORY_URL}
            title={PROJECT_REPOSITORY_URL ? 'View source on GitHub' : 'GitHub repository URL coming soon'}
          >
            <GitFork size={13} /> GitHub
          </a>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><RotateCcw size={13} /> Back to files</button>
        </nav>
      </footer>

      {editorSide && (
        <Suspense fallback={<div className="modal-backdrop"><LoaderCircle className="spin modal-loader" size={28} /></div>}>
          <XmlEditorModal
            side={editorSide}
            file={editorSide === 'before' ? before : after}
            onClose={() => setEditorSide(null)}
            onSave={(file) => {
              setFileError('');
              if (editorSide === 'before') setBefore(file);
              else setAfter(file);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
