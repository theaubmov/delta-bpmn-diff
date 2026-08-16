import {
  ArrowLeft,
  Braces,
  Check,
  FileDiff,
  GitCompareArrows,
  GitFork,
  Globe2,
  LockKeyhole,
  Scale,
  ShieldCheck
} from 'lucide-react';
import { PROJECT_REPOSITORY_URL } from './config';

export default function AboutPage() {
  return (
    <div className="about-shell">
      <header className="about-topbar">
        <a className="brand" href="./index.html" aria-label="Delta home">
          <span className="brand-mark"><GitCompareArrows size={18} /></span>
          <span>delta</span>
          <em>BPMN</em>
        </a>
        <a className="about-back" href="./index.html"><ArrowLeft size={15} /> Back to comparison</a>
      </header>

      <main className="about-main">
        <section className="about-hero">
          <div className="about-eyebrow"><ShieldCheck size={15} /> Private by design</div>
          <h1>Understand workflow changes.<br />Keep the workflow private.</h1>
          <p>Delta BPMN is an open-source visual comparison tool for BPMN 2.0 files. It helps teams review process changes without sending sensitive workflow data to a backend service.</p>
          <div className="about-hero-actions">
            <a className="primary-button" href="./index.html"><FileDiff size={16} /> Open comparison tool</a>
            <a className="secondary-button" href="./LICENSE.txt"><Scale size={16} /> Read MIT License</a>
          </div>
        </section>

        <section className="about-principles" aria-label="Project principles">
          <article>
            <span className="about-card-icon"><LockKeyhole size={21} /></span>
            <h2>Nothing is uploaded</h2>
            <p>Files, pasted XML, filenames, diagrams, and comparison results stay inside your browser. The application has no workflow-processing API or server-side storage.</p>
          </article>
          <article>
            <span className="about-card-icon"><GitCompareArrows size={21} /></span>
            <h2>Semantic comparison</h2>
            <p>Delta identifies added, removed, changed, and repositioned BPMN elements instead of comparing XML as unstructured text.</p>
          </article>
          <article>
            <span className="about-card-icon"><GitFork size={21} /></span>
            <h2>Open source</h2>
            <p>The project is released under the permissive MIT License. Anyone can use it, inspect it, adapt it, and distribute their own version.</p>
          </article>
        </section>

        <section className="privacy-flow">
          <div className="privacy-copy">
            <div className="about-eyebrow"><Globe2 size={15} /> Browser-side architecture</div>
            <h2>Your workflow never leaves your device</h2>
            <p>The web host delivers the application code. After that, the complete comparison runs locally in browser memory. Closing or refreshing the page clears the current comparison.</p>
            <ul>
              <li><Check size={15} /> BPMN files are read with the browser File API</li>
              <li><Check size={15} /> XML is parsed and validated in memory</li>
              <li><Check size={15} /> Semantic differences are calculated on-device</li>
              <li><Check size={15} /> Reports are generated as local browser downloads</li>
            </ul>
          </div>
          <div className="privacy-diagram" aria-label="Browser-side processing diagram">
            <div><Braces size={22} /><span>Your BPMN XML</span></div>
            <i>→</i>
            <div className="privacy-browser"><Globe2 size={22} /><span>Your browser</span><small>Parse · Compare · Render</small></div>
            <i>→</i>
            <div><FileDiff size={22} /><span>Visual differences</span></div>
            <strong><LockKeyhole size={14} /> No upload</strong>
          </div>
        </section>

        <section className="license-section">
          <div className="license-mark"><Scale size={27} /></div>
          <div>
            <span>Open-source license</span>
            <h2>Free to use under MIT</h2>
            <p>Anyone may use, copy, modify, merge, publish, distribute, sublicense, or sell copies of Delta BPMN, provided the copyright and license notice are included. The software is provided “as is,” without warranty.</p>
          </div>
          <a href="./LICENSE.txt">View full license <span>→</span></a>
        </section>
      </main>

      <footer className="about-footer">
        <span>Delta BPMN</span>
        <span>Browser-side BPMN comparison · MIT licensed</span>
        <nav>
          <a
            className={PROJECT_REPOSITORY_URL ? '' : 'is-disabled'}
            href={PROJECT_REPOSITORY_URL || undefined}
            target={PROJECT_REPOSITORY_URL ? '_blank' : undefined}
            rel={PROJECT_REPOSITORY_URL ? 'noreferrer' : undefined}
            aria-disabled={!PROJECT_REPOSITORY_URL}
            title={PROJECT_REPOSITORY_URL ? 'View source on GitHub' : 'GitHub repository URL coming soon'}
          >
            <GitFork size={13} /> GitHub
          </a>
          <a href="./index.html">Open tool</a>
        </nav>
      </footer>
    </div>
  );
}
