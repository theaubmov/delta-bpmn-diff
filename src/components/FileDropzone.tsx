import { useRef, useState } from 'react';
import { Braces, FileCode2, Upload, X } from 'lucide-react';
import type { BpmnFile } from '../types';

interface FileDropzoneProps {
  eyebrow: string;
  label: string;
  file: BpmnFile | null;
  tone: 'before' | 'after';
  onFile: (file: File) => void;
  onClear: () => void;
  onEdit: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes > 1024 * 100 ? 0 : 1)} KB`;
}

export default function FileDropzone({ eyebrow, label, file, tone, onFile, onClear, onEdit }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ dragging, setDragging ] = useState(false);

  const accept = (files: FileList | null) => {
    const selected = files?.[0];
    if (selected) onFile(selected);
  };

  if (file) {
    return (
      <div className="source-input">
        <div className={`file-card file-card--${tone}`}>
          <div className="file-icon"><FileCode2 size={22} strokeWidth={1.8} /></div>
          <div className="file-copy">
            <span className="file-eyebrow">{eyebrow}</span>
            <strong title={file.name}>{file.name}</strong>
            <small>{formatSize(file.size)} · BPMN 2.0 XML</small>
          </div>
          <div className="file-actions">
            <button className="icon-button" type="button" aria-label={`Edit ${label} XML`} title="Edit XML" onClick={onEdit}>
              <Braces size={17} />
            </button>
            <button className="icon-button" type="button" aria-label={`Remove ${label}`} title="Remove" onClick={onClear}>
              <X size={17} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="source-input source-input--empty">
      <button
        type="button"
        className={`dropzone dropzone--${tone} ${dragging ? 'is-dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".bpmn,.xml,text/xml,application/xml"
          onChange={(event) => accept(event.target.files)}
        />
        <span className="dropzone-icon"><Upload size={20} /></span>
        <span><strong>{eyebrow}</strong>{label}</span>
        <small>Drop a .bpmn file or browse</small>
      </button>
      <button className="paste-trigger" type="button" onClick={onEdit}><Braces size={14} /> Paste BPMN XML</button>
    </div>
  );
}
