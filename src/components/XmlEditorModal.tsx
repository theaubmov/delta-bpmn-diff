import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { xml as xmlLanguage } from '@codemirror/lang-xml';
import { Braces, Check, Clipboard, LoaderCircle, X } from 'lucide-react';
import { validateBpmnXml } from '../lib/comparison';
import type { BpmnFile } from '../types';

interface XmlEditorModalProps {
  side: 'before' | 'after';
  file: BpmnFile | null;
  onClose: () => void;
  onSave: (file: BpmnFile) => void;
}

export default function XmlEditorModal({ side, file, onClose, onSave }: XmlEditorModalProps) {
  const label = side === 'before' ? 'Baseline' : 'Current';
  const [ name, setName ] = useState(file?.name || `${side === 'before' ? 'baseline' : 'current'}.bpmn`);
  const [ value, setValue ] = useState(file?.xml || '');
  const [ error, setError ] = useState('');
  const [ saving, setSaving ] = useState(false);
  const [ copied, setCopied ] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [ onClose ]);

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      await validateBpmnXml(value);
      const safeName = (name.trim() || `${side}.bpmn`).replace(/\.(xml|bpmn)$/i, '') + '.bpmn';
      onSave({
        name: safeName,
        xml: value,
        size: new Blob([ value ]).size,
        modified: Date.now()
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The XML could not be parsed as BPMN 2.0.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!value || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="xml-modal" role="dialog" aria-modal="true" aria-labelledby="xml-editor-title">
        <header className="xml-modal-header">
          <div className={`xml-modal-icon xml-modal-icon--${side}`}><Braces size={20} /></div>
          <div>
            <span>{label} source</span>
            <h2 id="xml-editor-title">{file ? 'Edit BPMN XML' : 'Paste BPMN XML'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close XML editor" onClick={onClose}><X size={19} /></button>
        </header>

        <div className="xml-file-row">
          <label htmlFor="xml-file-name">Document name</label>
          <input id="xml-file-name" value={name} onChange={(event) => setName(event.target.value)} spellCheck={false} />
          <button type="button" onClick={copy} disabled={!value}>
            {copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? 'Copied' : 'Copy XML'}
          </button>
        </div>

        <div className="editor-frame">
          {!value && <div className="editor-hint">Paste a complete BPMN 2.0 XML document here</div>}
          <CodeMirror
            value={value}
            onChange={(nextValue) => { setValue(nextValue); setError(''); }}
            extensions={[ xmlLanguage() ]}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true
            }}
            height="min(56vh, 560px)"
            aria-label={`${label} BPMN XML`}
          />
        </div>

        <footer className="xml-modal-footer">
          <div className={error ? 'editor-validation editor-validation--error' : 'editor-validation'}>
            {error || 'XML is validated as BPMN 2.0 before it is applied.'}
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="button" onClick={save} disabled={!value.trim() || saving}>
            {saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
            {saving ? 'Validating…' : `Use as ${label.toLowerCase()}`}
          </button>
        </footer>
      </section>
    </div>
  );
}
