# GovAdmin TailAdmin System Diagrams

The first version is a combined overview: [`system-flow-diagram.svg`](./system-flow-diagram.svg).

The separated diagrams are:

- [`diagram-data-flow.svg`](./diagram-data-flow.svg)
- [`diagram-build-flow.svg`](./diagram-build-flow.svg)
- [`diagram-runtime-flow.svg`](./diagram-runtime-flow.svg)
- [`diagram-auth-signup-flow.svg`](./diagram-auth-signup-flow.svg)
- [`diagram-civic-records-flow.svg`](./diagram-civic-records-flow.svg)
- [`diagram-report-export-flow.svg`](./diagram-report-export-flow.svg)
- [`diagram-ui-modules-flow.svg`](./diagram-ui-modules-flow.svg)

They use the plain black-and-gray style of the supplied reference image:

- `DATA`: Firebase config, Auth, Firestore, user documents, civic subcollections, local browser state, and generated downloads.
- `BUILD`: source HTML pages, reusable partials, Webpack HTML preprocessing, CSS/JS/assets processing, output files, and dev server.
- `RUNTIME`: browser load, bundled app startup, auth guard, profile hydration, Alpine state, helpers, date/upload widgets, charts, map, calendar, and image resize behavior.
- `FEATURE FLOWS`: signup, civic records, reports, PDF/CSV exports, calendar workflow, visual dashboard pages, and primary page groups.

Notes from the code review:

- The app has no backend HTTP API in this repository. It is a client-side static dashboard that talks directly to Firebase.
- `webpack.config.js` generates one HTML file for each `src/*.html` page and expands custom `<include src="...">` partials.
- `src/js/index.js` is the main runtime entry. It wires Firebase Auth/Firestore, global page handlers, chart/map/calendar initialization, exports, and UI helpers.
- `window.handleIssueDocument` appears twice in `src/js/index.js`; the later `Permits` implementation overrides the earlier `permit & License` modal implementation at runtime.
- `generateComplaintsReport()` calls `window.fetchComplaints()`, but no `fetchComplaints` definition was found in the current source.
