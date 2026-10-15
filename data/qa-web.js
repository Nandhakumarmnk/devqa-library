/* HTML, CSS, TypeScript and UI controls — the résumé claims these,
   so an interviewer may ask about them even in a .NET round. */
window.QA = (window.QA || []).concat([

{
  id: "web-typescript", topic: "web", star: true,
  q: "What is TypeScript and why use it over JavaScript?",
  tags: ["typescript", "ts", "typescript vs javascript", "static typing", "interface type"],
  simple: "TypeScript is JavaScript with types added. The types are checked while you build and then stripped out — the browser still runs plain JavaScript. The point is that mistakes show up in the editor instead of in front of a user.",
  answer: "TypeScript compiles to JavaScript; the types exist only at build time. What that buys:\n- **Errors at compile time** — a misspelt property or a wrong argument is caught before the page runs.\n- **Real autocomplete** across a codebase, because the editor knows the shapes.\n- **Safer refactoring** — renaming a field surfaces every usage.\nThe core pieces I use: `interface` and `type` for object shapes, union types (`'OPEN' | 'CLOSED'`), optional (`?`) and readonly properties, generics, and `unknown` rather than `any` when a value really is untyped.\n`interface` vs `type`: interfaces can be re-opened and extended and are my default for object shapes; `type` handles unions, intersections and primitives that an interface cannot express.\nThe honest caveat: TypeScript checks nothing at runtime. API data crossing the boundary is typed by assertion, not by proof, so the server still has to validate — and a wrong DTO type is a lie the compiler will happily believe.",
  code: "interface Vendor {\n  id: number;\n  name: string;\n  gstin?: string;                        // optional\n  status: 'ACTIVE' | 'BLOCKED';          // union - only these two\n}\n\nasync function getVendor(id: number): Promise<Vendor> {\n  const res = await api.get<Vendor>(`/vendors/${id}`);\n  return res.data;\n}",
  project: "The React side of the Vendor Portal is where this matters for me — typed props and typed API responses mean a renamed field on a DTO breaks the build rather than rendering undefined on a vendor's screen. It pairs naturally with C#, because defining the shape before using it is the same habit.",
  remember: "Types at build time only. interface for shapes, type for unions. The server still validates."
},

{
  id: "web-html", topic: "web",
  q: "What is semantic HTML and why does it matter?",
  tags: ["html5", "semantic html", "accessibility", "div vs section", "semantic tags"],
  simple: "Semantic HTML means using the tag that describes what the thing is — header, nav, main, table, button — instead of making everything a div. The browser, screen readers and search engines all understand the real tags.",
  answer: "`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<table>`, `<form>`, `<button>` carry meaning. A `<div>` carries none.\nWhy it is worth the effort:\n- **Accessibility** — a screen reader can jump between landmarks and announce a real `<button>` as a button. A clickable div is invisible to it unless you hand-add role, tabindex and key handling.\n- **Keyboard support comes free** — a real button is focusable and fires on Enter and Space; a div is not and does not.\n- **SEO and tooling** read structure from the tags.\nThe two I enforce in review: form inputs must have a `<label for>` (not just a placeholder), and anything clickable must be a `<button>` or `<a>`. Also `<button type=\"button\">` inside a form, or it submits the form by accident.",
  code: "<!-- wrong: invisible to a screen reader, dead to the keyboard -->\n<div class=\"btn\" onclick=\"save()\">Save</div>\n\n<!-- right -->\n<button type=\"button\" class=\"btn\" onclick=\"save()\">Save</button>\n<label for=\"gstin\">GSTIN</label>\n<input id=\"gstin\" name=\"gstin\" required>",
  project: "The enterprise screens I maintain are form- and grid-heavy, so labels tied to inputs and real buttons matter for the people who use them all day with the keyboard. Correct markup also removes a class of accessibility findings before anyone has to raise them.",
  remember: "Use the tag that says what it is. A div is not a button."
},

{
  id: "web-css-layout", topic: "web", star: true,
  q: "Flexbox vs Grid, and the CSS box model",
  tags: ["css3", "flexbox", "css grid", "box model", "box-sizing", "layout css"],
  simple: "The box model is how a box's size is worked out — content, padding, border, margin. Flexbox lays things out in one direction, a row or a column. Grid lays them out in rows and columns at once.",
  answer: "**Box model**: width applies to the content box by default, so padding and border are *added* on top — which is why layouts overflow unexpectedly. `box-sizing: border-box` makes width include padding and border, and setting it globally is the first line of almost every stylesheet.\n**Flexbox** is one-dimensional: a toolbar, a button row, a sidebar beside content. `justify-content` works along the main axis, `align-items` across it, and `gap` spaces children without margin collapsing.\n**Grid** is two-dimensional: page layouts, card galleries, form grids. `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))` gives a responsive card grid with no media queries at all.\nRule of thumb: content in a line → flex; a real layout with rows *and* columns → grid. They nest happily.",
  code: "*{ box-sizing: border-box; }\n\n/* one dimension */\n.toolbar{ display:flex; align-items:center; gap:10px; }\n\n/* two dimensions, responsive with no media query */\n.cards{\n  display:grid;\n  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));\n  gap:12px;\n}",
  project: "The React component set in the Vendor Portal is laid out this way — flex for toolbars and form rows, grid for the card and dashboard areas — which is what lets the same components sit on different screens without each one carrying its own layout hacks.",
  remember: "border-box always. Flex for one direction, Grid for two."
},

{
  id: "web-responsive", topic: "web", star: true,
  q: "How do you make a page responsive? (and Bootstrap's grid)",
  tags: ["responsive web design", "media query", "bootstrap 5", "mobile first", "breakpoints", "viewport"],
  simple: "Responsive means one page that reshapes itself for the screen it is on, instead of a separate mobile site. You use relative sizes, a flexible grid, and a few breakpoints where the layout genuinely needs to change.",
  answer: "The ingredients:\n- `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">` — without it a phone pretends to be 980px wide and everything is tiny.\n- **Relative units** — %, rem, fr, `minmax()`, `clamp()` — rather than fixed pixel widths.\n- **Media queries** at breakpoints, written **mobile first**: base styles for small screens, then `min-width` queries add complexity upward.\n- **Flexible images** — `max-width: 100%`.\n- **Overflow containers** — wide tables and code blocks scroll inside their own box so the page body never scrolls sideways.\n**Bootstrap 5** packages this: a 12-column grid with `col-md-6`-style classes at breakpoints (sm 576, md 768, lg 992, xl 1200), plus flex and spacing utilities. It is fast for enterprise screens and consistent across a team. The cost is markup full of utility classes, and Bootstrap 5 finally dropped the jQuery dependency.\nThe real test is the data grid — a twelve-column table has no good phone layout, so you either scroll it horizontally in its own container or switch to a card view below a breakpoint.",
  code: "/* mobile first: the base is the small screen */\n.panel{ padding: 12px; }\n\n@media (min-width: 768px){\n  .panel{ padding: 24px; display: grid; grid-template-columns: 260px 1fr; }\n}\n\n/* a table that will not break the page */\n.table-wrap{ overflow-x: auto; }",
  project: "The server-rendered procurement screens use Bootstrap's grid and utilities, and the React portal uses its own flex and grid layout. Both face the same problem — dense transactional grids on a small screen — and both solve it by letting the grid scroll inside its own container rather than squeezing twelve columns onto a phone.",
  remember: "Viewport meta, relative units, mobile-first min-width queries, and let wide tables scroll."
},

{
  id: "web-css-specificity", topic: "web",
  q: "Why is my CSS not applying? (specificity and the cascade)",
  tags: ["css specificity", "cascade", "important", "css not working", "override css"],
  simple: "When two rules target the same element, the more specific selector wins — not the one written last. That is why a class sometimes cannot override an id, and why people reach for !important.",
  answer: "Specificity is counted as inline style > id > class/attribute/pseudo-class > element. A tie is broken by source order, which is why the last rule wins only when specificity is equal.\nSo `#panel .btn { color: red }` beats `.btn.primary { color: blue }` regardless of order.\nDebugging it: open DevTools, look at the Styles pane, and the overridden rule is shown struck through along with what beat it. That answers the question faster than any amount of guessing.\n`!important` wins over everything except another `!important` further down, and it is a trap — one `!important` forces the next person to use two. I use it only against third-party CSS I cannot edit.\nThe durable fix is keeping specificity flat: style with single classes, avoid ids for styling, and do not nest selectors four levels deep just because the markup is nested.",
  code: "/* loses, despite coming later */\n.btn.primary{ color: blue; }\n/* wins - an id raises specificity */\n#panel .btn{ color: red; }\n\n/* keep it flat instead */\n.btn--primary{ color: blue; }",
  project: "This is a routine issue when extending Bootstrap screens — a utility class quietly losing to a more specific theme rule. Keeping our own styles on single classes rather than id-based selectors is what stops that turning into a wall of !important.",
  remember: "Inline > id > class > element. Source order only breaks a tie."
},

{
  id: "web-controls", topic: "web",
  q: "Which UI grid and reporting controls have you used? (DevExtreme, DevExpress, Crystal Reports)",
  tags: ["devextreme", "devexpress", "crystal reports", "reporting tools", "grid control", "ssrs"],
  simple: "Name the ones you have actually touched and say what you used them for. These are tools, not skills — an interviewer wants to know whether you can work with a commercial grid and a report engine, not whether you memorised their APIs.",
  answer: "What these are and where they fit:\n- **DevExtreme** — a commercial component suite; I used its data grid for document and listing screens, with server-side paging, filtering and export. The thing to understand is that a grid like this is only as fast as the endpoint behind it: it must page and filter on the **server**, or it pulls the whole table into the browser.\n- **DevExpress** — the wider control and reporting suite from the same vendor, used for richer grid and report rendering.\n- **Crystal Reports** — the older report engine: a designed .rpt layout bound to a dataset or stored procedure, exported to PDF or Excel. Still common in enterprise systems and usually inherited rather than chosen.\n- The modern alternative for new work is a tuned stored procedure feeding a plain grid, with export handled in code — fewer licences and far easier to debug.\nIf asked something version-specific I do not know, I say so and describe how I would find it. Nobody expects a .NET developer to recall a commercial grid's full API.",
  project: "Smart Documents uses DevExtreme for its grids, and the heavy report screens behind them are tuned stored procedures rather than letting the control do the work. That split is the point worth making: the control renders, the database decides what to render.",
  remember: "Name what you used it for. Server-side paging is what makes any commercial grid usable."
},

{
  id: "web-bundler", topic: "web",
  q: "What is a bundler? Vite vs Webpack",
  tags: ["vite", "webpack", "bundler", "build tool", "npm run build", "hot reload", "transpile"],
  simple: "Browsers cannot run JSX or TypeScript, and loading hundreds of separate files is slow. A bundler converts your source into plain JavaScript and packages it for the browser. Vite is the modern one; Webpack is the one most existing projects use.",
  answer: "A bundler does three jobs: **transpile** (JSX and TypeScript down to JavaScript the browser understands), **bundle** (resolve imports into a few files instead of hundreds of requests), and **optimise** (minify, tree-shake unused code, hash filenames for cache-busting, split code so a route loads only what it needs).\n**Webpack** — the long-standing standard. Extremely configurable, a huge plugin ecosystem, and most existing React projects are on it. The cost is configuration complexity and slow rebuilds on a big codebase, because it bundles everything before serving.\n**Vite** — in development it serves your files as **native ES modules**, so there is no bundling step at startup and the dev server opens almost instantly with fast hot module replacement. For production it bundles with Rollup. Configuration is much smaller.\n**The practical position**: new projects start on Vite; existing projects stay on Webpack because migrating a working build is risk for little user-visible benefit. The difference is developer experience — the shipped bundle is comparable.\n**Worth knowing either way**: `npm run dev` versus `npm run build`, why the build output is hashed, and that source maps are what make a production stack trace readable.",
  code: "// vite.config.js — the whole thing, for a React app\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { proxy: { '/api': 'https://localhost:7001' } }   // avoids CORS in dev\n});",
  project: "The dev proxy line is the one that matters day to day on our setup — the React dev server and the .NET API run on different ports, and proxying `/api` through the dev server is what avoids fighting CORS locally while keeping the production setup unchanged.",
  remember: "Transpile, bundle, optimise. Vite for new projects, Webpack because it is already there."
}

]);
