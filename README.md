# Delta BPMN

[![CI](https://github.com/bpmn-io/bpmn-js-differ/actions/workflows/CI.yml/badge.svg)](https://github.com/bpmn-io/bpmn-js-differ/actions/workflows/CI.yml)

A privacy-focused, browser-based tool for visually and semantically comparing BPMN 2.0 workflows. Delta BPMN combines a React + TypeScript interface with the `bpmn-js-differ` comparison engine and [bpmn-js](https://bpmn.io/toolkit/bpmn-js/) rendering.

> **Private by design:** your BPMN files and pasted XML are processed entirely inside your browser. The application does not upload workflows, XML, filenames, or comparison results to a server. You can safely compare confidential workflows without sharing their contents with the application host.


## Visual comparison app

The web application provides:

- File upload and drag-and-drop for `.bpmn` and `.xml` documents
- A built-in XML editor for pasting or editing either workflow version
- Side-by-side navigable BPMN diagrams
- Semantic highlighting for added, removed, changed, and moved elements
- A searchable and collapsible change log
- Downloadable JSON comparison reports
- High-resolution PNG exports of the complete visual comparison
- Browser-side processing with no workflow uploads

Start the development app:

```bash
npm install
npm run dev
```

Create a production build in `app-dist/`:

```bash
npm run build:app
```

The app opens with a bundled example. Drop a `.bpmn` or `.xml` file into each version card, or open the XML editor to paste and edit the raw source for either version.

## Privacy and browser-side processing

All sensitive operations happen on the user's device:

1. The browser reads the selected file or pasted XML.
2. `bpmn-moddle` parses the BPMN document in memory.
3. `bpmn-js-differ` calculates the semantic differences in memory.
4. `bpmn-js` renders both diagrams in the browser.
5. Reports are generated and downloaded directly by the browser.

There is no backend API for workflow processing, no workflow storage, and no file upload step. Closing or refreshing the page clears the current in-memory comparison.

The development server listens on the local network as well as localhost. For a public deployment, publish the generated `app-dist/` directory to any static host such as GitHub Pages, Netlify, Cloudflare Pages, or Vercel. No backend service is required.

When the public repository is ready, set `PROJECT_REPOSITORY_URL` in `src/config.ts`. This activates the GitHub buttons in the application and About-page footers.


## Usage

Get the project via [npm](http://npmjs.org):

```
npm install --save bpmn-js-differ
```

Use the differ to compare two BPMN 2.0 documents:

```javascript
import { diff } from 'bpmn-js-differ';

var oldDefinitions, newDefinitions; // read with bpmn-moddle

var changes = diff(oldDefinitions, newDefinitions);
```

The diff returns an object with the `_changed`, `_added`, `_removed`, `_layoutChanged` keys containing all differences between the models.

```javascript
console.log(changes._changed);
// {
//   ServiceTask_1: {
//     model: { $type: 'bpmn:ServiceTask', id: 'ServiceTask_1', ... },
//     attrs: { name: { oldValue: '', newValue: 'T' } }
//   }
// }

console.log(changes._removed);
// {
//   SequenceFlow_1: { $type: 'bpmn:SequenceFlow', id: 'SequenceFlow_1' }
// }

console.log(changes._layoutChanged);
// {
//   StartEvent_1: { $type: 'bpmn:StartEvent', id: 'StartEvent_1' }
// }

console.log(changes._added);
// {
//   Participant_1: { $type: 'bpmn:Participant', id: 'Participant_1' }
// }
```

## Reading BPMN 2.0 documents

Get [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle) via npm:

```
npm install --save bpmn-moddle
```

Load a diagram definition:

```javascript
import { BpmnModdle } from 'bpmn-moddle';

async function loadModel(diagramXML) {

  const bpmnModdle = new BpmnModdle();

  const { rootElement: definitionsA } = await bpmnModdle.fromXML(diagramXML),

  return rootElement;
}

const definitionsA = await loadModel(aXML);

// ...
// go ahead and use the model
```

## Visual Diffing

Use [bpmn-js](https://github.com/bpmn-io/bpmn-js) along with [element coloring](https://github.com/bpmn-io/bpmn-js-examples/tree/master/colors) to build your [visual diff tool](https://demo.bpmn.io/diff) on top of this utility.


## License

Delta BPMN is open source under the [MIT License](LICENSE). Anyone may use, copy, modify, merge, publish, distribute, sublicense, or sell copies of this project, subject to the license notice and conditions.

The project also builds on open-source BPMN tooling from the [bpmn.io](https://bpmn.io/) community.
