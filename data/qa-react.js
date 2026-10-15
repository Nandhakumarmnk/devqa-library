/* React.js pack */
window.QA = (window.QA || []).concat([

{
  id: "re-what", topic: "react", star: true,
  q: "What is React and what is the virtual DOM?",
  tags: ["react", "virtual dom", "what is react", "reconciliation", "declarative ui"],
  simple: "React is a library for building the UI out of small components. Instead of hand-editing the page, you describe what it should look like for the current data, and React works out the smallest change needed.",
  answer: "React is component-based and declarative. I write what the UI should be for a given state; React handles getting the DOM there.\nThe **virtual DOM** is a lightweight JavaScript representation of the UI. On a state change React builds a new tree, diffs it against the previous one (reconciliation), and applies only the differences to the real DOM. Real DOM updates are the expensive part, so batching them is where the performance comes from.\nCompared with jQuery, the big shift is that I no longer track which element to update — state is the single source of truth and the view follows it.",
  code: "function VendorBadge({ status }) {\n  return <span className={`badge ${status.toLowerCase()}`}>{status}</span>;\n}",
  project: "I built the vendor-facing UI of the Vendor Portal in React — registration, onboarding, approval and reporting screens. Moving that front end to React is what made a shared component set possible; the older modules are still MVC Razor with jQuery, so I work with both approaches day to day.",
  remember: "Describe the UI for the state; React diffs and updates only what changed."
},

{
  id: "re-props-state", topic: "react", star: true,
  q: "Props vs state in React",
  tags: ["props vs state", "props", "state", "one way data flow", "lifting state up"],
  simple: "Props come from the parent and the child must not change them. State belongs to the component itself and changing it re-renders the component.",
  answer: "**Props** are read-only inputs passed down from the parent — data flows one way, which makes the UI predictable because you can always trace where a value came from.\n**State** is internal, owned and updated by the component with `useState`, and a change triggers a re-render.\nIf two siblings need the same value, I **lift state up** to their closest common parent and pass it down as props, with a callback prop to change it. When too many levels only forward props they do not use (prop drilling), I move that value into Context.\nState updates must be immutable — replace the object or array, never mutate it, or React may not see a change.",
  code: "function VendorRow({ vendor, onSelect }) {      // props in, callback out\n  return <tr onClick={() => onSelect(vendor.id)}><td>{vendor.name}</td></tr>;\n}",
  project: "In the Vendor Portal the grid and form components take their data and their handlers entirely as props, which is why the same components are reused across the registration, onboarding and approval screens — the screen owns the state, the components just render it.",
  remember: "Props come from outside and are read-only. State lives inside and triggers re-render."
},

{
  id: "re-usestate", topic: "react", star: true,
  q: "How does useState work?",
  tags: ["usestate", "state hook", "setstate", "functional update", "immutable state"],
  simple: "useState gives you a value and a function to change it. Calling that function tells React to re-render with the new value.",
  answer: "`const [value, setValue] = useState(initial)` — the initial value is used on the first render only.\nKey points:\n- Updates are **asynchronous and batched**; reading the state right after setting it still gives the old value in the same render.\n- When the new value depends on the previous one, use the functional form `setCount(c => c + 1)` — otherwise several updates in one tick overwrite each other.\n- Always set a **new** object or array; mutating state in place does not change the reference, so React may skip the re-render.\n- For expensive initial values pass a function: `useState(() => compute())`, so it runs once instead of every render.",
  code: "const [filters, setFilters] = useState({ status: 'ALL', page: 1 });\n\nsetFilters(f => ({ ...f, page: f.page + 1 }));   // new object, based on previous",
  project: "The portal's grid screens hold their filter and paging state exactly like this and pass it to the API call, so changing a filter resets the page and triggers one refetch rather than a cascade of updates.",
  remember: "Never mutate state. Use the functional form when the new value depends on the old."
},

{
  id: "re-useeffect", topic: "react", star: true,
  q: "How does useEffect work? (dependencies and cleanup)",
  tags: ["useeffect", "dependency array", "cleanup function", "side effect", "infinite loop react"],
  simple: "useEffect runs code after the render — fetching data, subscribing, setting a timer. The dependency array decides when it runs again, and the returned function cleans up.",
  answer: "`useEffect(fn, deps)`:\n- no array → runs after every render (almost always a bug)\n- `[]` → once after mount\n- `[id]` → whenever `id` changes\nThe function you return is the cleanup: it runs before the next effect and on unmount — cancel timers, unsubscribe, abort in-flight requests.\nTwo classic problems: an **infinite loop** when the effect sets state that is also in its dependencies, and a **stale closure** when a dependency is omitted so the effect keeps using the first render's values. Objects and functions recreated every render also break the comparison, which is where `useCallback`/`useMemo` come in.\nAnd an async function cannot be passed directly — declare it inside and call it.",
  code: "useEffect(() => {\n  const ctrl = new AbortController();\n  (async () => {\n    try {\n      const res = await api.get(`/vendors/${id}`, { signal: ctrl.signal });\n      setVendor(res.data);\n    } catch (e) { if (!ctrl.signal.aborted) setError(e); }\n  })();\n  return () => ctrl.abort();      // cleanup\n}, [id]);",
  project: "Every data-loading screen in the Vendor Portal follows this shape — fetch on mount and on id change, abort on unmount so a slow response cannot set state on a screen the user already left, and a loading/error state the shared layout renders consistently.",
  remember: "Deps control when it runs; the returned function cleans up."
},

{
  id: "re-hooks-rules", topic: "react",
  q: "What are the rules of hooks?",
  tags: ["rules of hooks", "hooks", "conditional hook", "custom hook"],
  simple: "Call hooks at the top level of a component, always in the same order, never inside an if or a loop.",
  answer: "Two rules:\n1. Only call hooks at the top level — not inside conditions, loops or nested functions. React tracks hooks by call order, so a conditional hook shifts every later hook's identity and the state ends up attached to the wrong thing.\n2. Only call hooks from React function components or from custom hooks (functions named `useSomething`).\nThe eslint plugin enforces both. If I need conditional behaviour I put the condition inside the hook, not around it.",
  code: "// wrong\nif (isEdit) { const [v, setV] = useState(null); }\n\n// right\nconst [v, setV] = useState(null);\nif (isEdit) { /* use v */ }",
  remember: "Top level, same order, every render."
},

{
  id: "re-forms", topic: "react", star: true,
  q: "Controlled vs uncontrolled components (forms in React)",
  tags: ["controlled component", "uncontrolled component", "react form", "onchange value", "form handling"],
  simple: "In a controlled input React state holds the value and the input just displays it. In an uncontrolled input the DOM keeps the value and you read it when you need it.",
  answer: "**Controlled**: `value={state}` plus `onChange` — state is the single source of truth, so validation, formatting, conditional enabling and resetting are all straightforward. This is the default choice.\n**Uncontrolled**: the input keeps its own value and you read it through a `ref`. Fewer re-renders, and necessary for file inputs, which cannot be controlled.\nFor large forms a controlled field per keystroke can get heavy; that is when I either group state sensibly, debounce the expensive reactions, or move to a form library.",
  code: "const [form, setForm] = useState({ name: '', gstin: '' });\nconst onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));\n\n<input name=\"gstin\" value={form.gstin} onChange={onChange} />",
  project: "The multi-step vendor registration and onboarding forms are controlled components with client-side validation and inline error display, and the error keys map directly onto the server-side validation response — so a rule that fires on the API shows under the same field the user is looking at. File upload fields are the exception and use refs.",
  remember: "Controlled = React state owns the value. File inputs are always uncontrolled."
},

{
  id: "re-keys", topic: "react", star: true,
  q: "Why does React need a key when rendering lists?",
  tags: ["key prop", "list rendering", "index as key", "map render", "reconciliation"],
  simple: "The key tells React which item is which between renders. Without a stable key it can reuse the wrong row — the classic symptom is a checkbox or input value jumping to a different row after a sort or delete.",
  answer: "During reconciliation React matches old and new children by key. A stable unique key (the record id) lets it move, keep or remove the right elements.\nUsing the array **index** is fine only for a static list that never reorders. If the list is sorted, filtered or has items removed, indexes shift and React reuses component state against the wrong data — inputs keep the previous row's value and the UI looks corrupted.\nKeys only need to be unique among siblings, and they are not passed to the component as a prop.",
  code: "{vendors.map(v => <VendorRow key={v.id} vendor={v} />)}   // id, not index",
  project: "This came up in the portal's editable line-item grids: rows can be added and removed, and with index keys the inline inputs held on to the wrong values after a delete. Switching to the record id (and a generated id for unsaved rows) fixed it.",
  remember: "Key by id, never by index, whenever the list can change order."
},

{
  id: "re-memo", topic: "react", star: true,
  q: "useMemo, useCallback and React.memo — when do you use them?",
  tags: ["usememo", "usecallback", "react.memo", "performance optimization react", "re-render"],
  simple: "They stop work from being repeated. useMemo caches a computed value, useCallback caches a function, React.memo stops a child re-rendering when its props have not changed.",
  answer: "- **React.memo** wraps a component so it re-renders only when its props change by shallow comparison.\n- **useCallback(fn, deps)** keeps the same function reference between renders — important because a new function prop defeats React.memo on the child.\n- **useMemo(() => value, deps)** caches an expensive calculation, or a derived object, so its identity is stable.\nThey are not free: every memo adds a comparison and keeps a reference alive. I apply them when there is a measured problem — a large grid re-rendering on every keystroke, or a genuinely expensive calculation — not by default. The React Profiler tells me which component is actually re-rendering.",
  code: "const total   = useMemo(() => lines.reduce((s, l) => s + l.qty * l.rate, 0), [lines]);\nconst onSelect = useCallback(id => setSelected(id), []);\nconst Row      = React.memo(VendorRow);",
  project: "The reporting grids in the Vendor Portal handle large result sets, so the row component is memoised and the row handlers are wrapped in useCallback — otherwise every filter keystroke re-rendered the entire table. On small forms I deliberately leave it out, because the memo would cost more than it saves.",
  remember: "Measure first. memo caches components, useCallback caches functions, useMemo caches values."
},

{
  id: "re-useref", topic: "react",
  q: "What is useRef used for?",
  tags: ["useref", "ref", "dom reference", "mutable value", "focus input"],
  simple: "useRef is a box that survives re-renders without causing one. Use it to reach a DOM element, or to remember a value that should not trigger a render.",
  answer: "Two uses:\n1. **DOM access** — `<input ref={inputRef} />` then `inputRef.current.focus()`. Needed for focus, scroll position, measuring, and third-party widgets.\n2. **Mutable instance value** — a timer id, the previous value of a prop, an abort controller, a flag that the component has mounted. Changing `.current` does **not** re-render, which is exactly the point.\nIf the value should be visible in the UI, it belongs in state, not a ref.",
  code: "const firstError = useRef(null);\n// after a failed submit\nfirstError.current?.focus();",
  project: "On the multi-step registration form a ref focuses the first invalid field after a failed submit, which matters because the form is long enough that the error can be off screen. Refs also hold the abort controllers for in-flight requests.",
  remember: "Ref changes do not re-render. State changes do."
},

{
  id: "re-context", topic: "react",
  q: "Context API and state management (and Redux)",
  tags: ["usecontext", "context api", "redux", "prop drilling", "global state", "state management"],
  simple: "Context lets deeply nested components read shared data without passing props through every level. Redux is a bigger, more structured version for complex app-wide state.",
  answer: "`createContext` + a provider + `useContext` solves prop drilling for things that are genuinely global — the logged-in user, roles, theme, a notification handler.\nThe caveat: every consumer re-renders when the context value changes, so I split contexts by concern and memoise the provider value rather than putting the whole application state in one context.\nRedux (or Redux Toolkit/Zustand) earns its place when state is large, shared across many unrelated screens, or needs middleware and time-travel debugging. For server data, React Query-style caching is often the better answer than any global store, because most apparent global state is really cached API data.\nI would not add Redux to a portal that does not need it — that is complexity without benefit.",
  code: "const AuthContext = createContext(null);\nconst { user, roles } = useContext(AuthContext);",
  project: "The Vendor Portal keeps the authenticated user, their roles and the token in context, which is what the role-based routing and the conditional screen rendering read from. Screen-level data stays local to the screen — there was no case for a full Redux store.",
  remember: "Context for truly global values; local state for everything else."
},

{
  id: "re-reusable", topic: "react", star: true,
  q: "How do you design reusable components?",
  tags: ["reusable components", "component design", "composition", "shared component library", "props api"],
  simple: "A reusable component should know how to look and behave, but not where the data comes from. Pass data and callbacks in as props and keep the API small.",
  answer: "Principles I follow:\n- **Presentational, not connected** — the component receives data and raises events; the screen owns the fetching.\n- **Small prop API with sensible defaults**, so the common case is one line.\n- **Composition over flags** — accept `children` or render props instead of growing `showHeader`, `showFooter`, `isCompact` into a dozen booleans.\n- **Consistent behaviour** — one place decides how validation errors, empty states and loading look, so every screen behaves the same.\n- **Accessible and controlled** — labels tied to inputs, keyboard support, and controlled values.\nThe test is whether a new screen can be assembled from existing pieces without copying markup.",
  code: "<DataGrid\n  columns={poColumns}\n  rows={rows}\n  loading={loading}\n  page={page}\n  onPageChange={setPage}\n  emptyText=\"No purchase orders found\"\n/>",
  project: "This is one of the things I am proudest of on the Vendor Portal: I built a reusable component set — forms, grids, modals and validation — shared across the registration, onboarding and approval screens. It cut build time for each new vendor screen and kept the UI behaviour consistent instead of every screen inventing its own grid and error display.",
  remember: "Data and callbacks in through props; the component owns look and behaviour, not fetching."
},

{
  id: "re-api", topic: "react", star: true,
  q: "How do you call an API from React?",
  tags: ["api call react", "axios", "fetch data react", "loading error state", "interceptor"],
  simple: "Call the API inside useEffect (or on an event), keep three pieces of state — loading, data, error — and clean up if the component goes away.",
  answer: "Pattern I use: an axios instance with the base URL, a request interceptor that attaches the JWT, and a response interceptor that handles 401 by sending the user to login. Screens then call a small API module rather than axios directly, so the endpoint is defined in one place.\nIn the component: `loading`, `data`, `error` state; fetch in `useEffect` with the dependency that should trigger a refetch; abort on cleanup; render a skeleton while loading and a retry option on error.\nThings I avoid: calling an API in render, forgetting the error branch so the spinner runs forever, and firing dependent calls in sequence when they could run with `Promise.all`.",
  code: "const api = axios.create({ baseURL: '/api/v1' });\napi.interceptors.request.use(cfg => {\n  const t = getToken();\n  if (t) cfg.headers.Authorization = `Bearer ${t}`;\n  return cfg;\n});",
  project: "That is how the Vendor Portal talks to the .NET APIs — JWT attached by an interceptor, endpoints documented in Swagger, and validation errors returned in a consistent shape so the form components can map them onto fields. The error handling on both sides was designed together rather than bolted on.",
  remember: "loading / data / error, fetch in useEffect, abort on cleanup."
},

{
  id: "re-routing", topic: "react",
  q: "How does routing and a protected route work in React?",
  tags: ["react router", "protected route", "private route", "navigation", "role based routing"],
  simple: "React Router shows a different component for each URL without reloading the page. A protected route checks whether the user is allowed in before rendering the screen.",
  answer: "`BrowserRouter` plus `Routes`/`Route` maps paths to components; `useNavigate` navigates programmatically and `useParams` reads route parameters.\nA protected route is a wrapper that reads the auth context and either renders the children or redirects to login, optionally remembering where the user was going. Role-based routing takes the same shape, checking that the user's role is allowed for that route.\nThe point I always add: this is UX, not security. The route guard only decides what to show — the API still enforces authorisation on every call, because anyone can edit client-side code or call the endpoint directly.",
  code: "function RequireRole({ roles, children }) {\n  const { user } = useAuth();\n  if (!user) return <Navigate to=\"/login\" replace />;\n  if (!roles.includes(user.role)) return <Navigate to=\"/forbidden\" replace />;\n  return children;\n}",
  project: "The Vendor Portal uses exactly this — vendors, buyers and approvers each land on their own screens through role-based routing, backed by `[Authorize(Roles=...)]` on the matching API endpoints so the restriction is real and not cosmetic.",
  remember: "Route guards hide screens; the server enforces access."
},

{
  id: "re-lifecycle", topic: "react",
  q: "Component lifecycle — class methods vs hooks",
  tags: ["lifecycle", "componentdidmount", "class vs function component", "useeffect lifecycle"],
  simple: "Old class components had named lifecycle methods. Hooks do the same jobs with useEffect and its dependency array.",
  answer: "Mapping:\n- `componentDidMount` → `useEffect(fn, [])`\n- `componentDidUpdate` → `useEffect(fn, [dep])`\n- `componentWillUnmount` → the cleanup function returned from useEffect\n- `shouldComponentUpdate` → `React.memo`\n- constructor state → `useState`\nFunction components with hooks are the current standard: less boilerplate, no `this` binding, and logic is grouped by concern instead of scattered across three lifecycle methods. Class components still exist in older code, and error boundaries are still class-based.",
  code: "useEffect(() => {\n  const id = setInterval(refresh, 30000);\n  return () => clearInterval(id);     // unmount cleanup\n}, []);",
  remember: "[] = mount, [dep] = update, return fn = unmount."
},

{
  id: "re-custom-hook", topic: "react",
  q: "What is a custom hook?",
  tags: ["custom hook", "reusable logic", "usefetch", "hook extraction"],
  simple: "A custom hook is just a function starting with use that calls other hooks — a way to share logic between components, not UI.",
  answer: "When two components repeat the same stateful logic — fetching with loading and error, a debounced value, a form with validation, reading from localStorage — I extract it into a `useSomething` hook. Each component that calls it gets its own independent state; nothing is shared except the logic.\nThis is the hooks replacement for the old higher-order component and render-prop patterns, and it keeps components focused on rendering.",
  code: "function useApi(url) {\n  const [data, setData] = useState(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState(null);\n  useEffect(() => {\n    let on = true;\n    api.get(url)\n       .then(r => on && setData(r.data))\n       .catch(e => on && setError(e))\n       .finally(() => on && setLoading(false));\n    return () => { on = false; };\n  }, [url]);\n  return { data, loading, error };\n}",
  project: "The portal screens share a fetch hook of this shape plus a form-state hook, which is a large part of why adding a new vendor screen is quick — the data-loading and validation plumbing is already written and tested.",
  remember: "Custom hook = shared logic, separate state per caller."
},

{
  id: "re-usereducer", topic: "react",
  q: "useState vs useReducer",
  tags: ["usereducer", "reducer", "complex state", "state machine"],
  simple: "useState is fine for a few independent values. useReducer is better when several pieces of state change together according to rules.",
  answer: "`useReducer(reducer, initialState)` returns the state and a `dispatch`. All the transition logic lives in one pure reducer function, which makes complex flows easier to follow and to test, and keeps related updates atomic.\nI reach for it when a screen has a multi-step flow, interdependent fields, or more than a handful of `useState` calls that always change together. Dispatch is also stable, so passing it down does not break memoised children.\nFor simple independent values `useState` is clearer and I leave it alone.",
  code: "function reducer(state, action) {\n  switch (action.type) {\n    case 'NEXT':  return { ...state, step: state.step + 1 };\n    case 'ERROR': return { ...state, errors: action.errors, saving: false };\n    default: return state;\n  }\n}",
  project: "The multi-step vendor registration is the natural fit — step index, per-step validity, server errors and the saving flag all move together, and a reducer keeps those transitions in one readable place instead of five setState calls scattered across handlers.",
  remember: "Many values changing together = useReducer."
},

{
  id: "re-error-boundary", topic: "react",
  q: "What is an error boundary?",
  tags: ["error boundary", "componentdidcatch", "react error handling", "white screen"],
  simple: "An error boundary catches a crash inside part of the UI and shows a fallback instead of blanking the whole page.",
  answer: "A class component implementing `getDerivedStateFromError` and `componentDidCatch` catches render-time errors in its subtree, logs them, and renders a fallback. Without one, an uncaught render error unmounts the whole tree — the infamous white screen.\nIt does not catch errors in event handlers, async code or outside React; those need ordinary try/catch. I place boundaries around independent regions — a grid, a widget, a route — so one failing section does not take the application down.",
  code: "class ErrorBoundary extends React.Component {\n  state = { hasError: false };\n  static getDerivedStateFromError() { return { hasError: true }; }\n  componentDidCatch(err, info) { logToServer(err, info); }\n  render() { return this.state.hasError ? <ErrorPanel /> : this.props.children; }\n}",
  remember: "Boundaries catch render errors only — not event handlers or async code."
},

{
  id: "re-conditional", topic: "react",
  q: "Conditional rendering in React",
  tags: ["conditional rendering", "ternary jsx", "&& operator react", "render if"],
  simple: "Decide inside JSX what to show — a ternary for either/or, && for show-or-nothing, and an early return for loading and error states.",
  answer: "Patterns: `{isLoading ? <Spinner/> : <Grid/>}`, `{canApprove && <ApproveButton/>}`, or an early `return` for the loading and error branches so the main JSX stays readable.\nThe trap with `&&` is a numeric left-hand side: `{rows.length && <Grid/>}` renders a literal `0` when the array is empty. Use `rows.length > 0 &&` or a ternary.\nI also keep permission-based rendering honest — hiding a button is a UI nicety, and the API still checks the role.",
  code: "if (loading) return <Skeleton />;\nif (error)   return <ErrorPanel onRetry={reload} />;\nreturn rows.length > 0 ? <Grid rows={rows} /> : <Empty />;",
  project: "The portal screens all share the same loading, error and empty treatment through early returns, which is part of why the grids behave consistently rather than each screen inventing its own spinner.",
  remember: "rows.length && ... prints 0. Compare explicitly."
},

{
  id: "re-rerender", topic: "react",
  q: "Why does a React component re-render?",
  tags: ["re-render", "why component rerenders", "state change", "immutability", "render optimization"],
  simple: "A component re-renders when its own state changes, when its parent re-renders, or when a context it uses changes.",
  answer: "Three triggers: a state update in the component, a parent re-rendering (which re-renders children by default regardless of props), or a consumed context value changing.\nReact compares props shallowly for memoised components, which is why **immutability matters** — mutating an array in place keeps the same reference, so React sees no change and may skip the update; conversely creating a new object or inline function every render defeats memoisation and causes extra renders.\nRe-render is not the same as a DOM update: React still diffs and only touches the DOM where the output actually differs. I only optimise when the Profiler shows a real cost.",
  code: "// defeats React.memo — new array identity every render\n<Grid columns={[{ field: 'name' }]} />\n// stable\nconst columns = useMemo(() => [{ field: 'name' }], []);",
  project: "This is what the memoisation work on the reporting grids came down to — the row components were re-rendering on every filter keystroke because the column definitions and handlers were new objects on each render.",
  remember: "Own state, parent render, or context change. Immutable updates + stable references."
},

{
  id: "re-jsx", topic: "react",
  q: "What is JSX? And why fragments?",
  tags: ["jsx", "fragment", "react element", "className", "babel"],
  simple: "JSX is HTML-like syntax inside JavaScript. A build step turns it into React function calls. A fragment lets you return several elements without adding a wrapper div.",
  answer: "JSX compiles to `React.createElement(...)`. Differences from HTML: `className` not class, `htmlFor` not for, camelCase event props (`onClick`), self-closing tags required, `{}` for expressions, and style as an object.\nJSX escapes interpolated values, which prevents XSS by default — `dangerouslySetInnerHTML` is the deliberate opt-out and is named that way for a reason.\nA component must return a single root; `<></>` (Fragment) groups children without an extra DOM node, which matters inside tables and flex/grid layouts where a stray div breaks the layout.",
  code: "return (\n  <>\n    <Header title={title} />\n    <Grid rows={rows} />\n  </>\n);",
  project: "Worth knowing for the security side too: JSX escaping by default is one less XSS surface than the jQuery screens had, where unencoded output in html() was a real finding.",
  remember: "JSX escapes values by default. dangerouslySetInnerHTML is the XSS risk."
},

{
  id: "re-react-vs-mvc", topic: "react",
  q: "Why move a screen from jQuery/MVC to React?",
  tags: ["react vs mvc", "spa vs server rendered", "why react", "migration"],
  simple: "React is worth it when a screen has a lot of interactive state. For a simple read-only page, server-rendered Razor is still fine and simpler.",
  answer: "React pays off when the UI has real client state — multi-step forms, grids with inline editing, live validation, several components reacting to the same data. Manual DOM manipulation at that level becomes unmaintainable because the state is spread across the DOM itself.\nServer-rendered views remain the simpler choice for static or mostly read-only pages, and they avoid a build pipeline.\nMy honest view in interviews: I would not rewrite a working module just to use React. I introduce it where the interaction justifies it, which is how the Vendor Portal front end came about while the established modules stayed on MVC and jQuery.",
  project: "The Vendor Portal was the right candidate — a self-service portal for suppliers, buyers and approvers with multi-step onboarding, document upload and approval flows. Replacing the email-driven follow-up process with that portal is the achievement; React is what made the shared component set and the consistent validation possible. I have been working with React for over a year now, alongside the .NET work.",
  remember: "React for interaction-heavy screens; server-rendered for simple ones."
},

{
  id: "re-vs-angular", topic: "react",
  q: "React vs Angular — what is the difference?",
  tags: ["react vs angular", "angular experience", "angular vs react", "framework comparison", "spa framework"],
  simple: "React is a library for the view, and you choose the rest — routing, state, HTTP. Angular is a full framework that ships all of that with it, in TypeScript, with a stricter structure.",
  answer: "**React** — a UI library. JSX, components, hooks, one-way data flow. Routing (React Router), HTTP (axios/fetch) and state management are your choice. That means freedom and a smaller core, at the cost of decisions every team makes differently.\n**Angular** — a complete framework. TypeScript by default, its own DI container, RxJS observables, two-way binding with `[(ngModel)]`, modules, services, the CLI, and routing and HTTP built in. Opinionated, consistent across teams, steeper to learn.\nOther real differences: React uses a virtual DOM and re-renders by diffing; Angular compiles templates and tracks changes its own way. Angular's DI and service model will feel immediately familiar to a .NET developer — it is the same constructor-injection idea.\n**The choice in practice** is usually about the team, not the technology: Angular suits large enterprise teams that benefit from one prescribed way of doing things; React suits teams that want flexibility and a smaller surface.\n**If asked whether you know Angular** and you do not: say so directly, then say that the concepts transfer — components, DI, services, routing and one-way data flow are the same ideas you already use in React and .NET, and the gap is syntax and RxJS rather than architecture. That answer holds up; a bluff does not survive one question about observables.",
  project: "My SPA work is React — the Vendor Portal front end, its shared component set, and the API integration. I have not shipped an Angular application, and I would say that plainly rather than claim it; what I would point at instead is that Angular's dependency injection is the same pattern I use daily in ASP.NET Core.",
  remember: "React = library, you pick the rest. Angular = full framework, TypeScript, DI, RxJS. Don't bluff Angular."
},

{
  id: "re-lazy", topic: "react", star: true,
  q: "Lazy loading and code splitting in React (React.lazy and Suspense)",
  tags: ["lazy loading react", "react.lazy", "suspense", "code splitting", "dynamic import", "bundle size", "route based splitting", "lazy load component"],
  simple: "Instead of shipping the whole application in one JavaScript file, you split it so a screen's code only downloads when someone opens that screen. The first page load gets much smaller.",
  answer: "`React.lazy(() => import('./Screen'))` turns a component into a dynamic import. The bundler sees `import()` and splits that code into its own chunk, fetched on demand. `<Suspense fallback={...}>` supplies what to show while the chunk is in flight.\n**Where it actually pays**: route-level splitting. A portal with twelve screens does not need the reporting screen's code to render the login page. The other good candidates are heavy one-off dependencies — a chart library, a rich-text editor, a PDF viewer — loaded only when that feature is opened.\n**Points worth making:**\n- Wrap it in an **error boundary** too, because a failed chunk download (bad network, or a stale chunk after a deploy) throws. That stale-chunk case is real: a user with the old page open requests a chunk that no longer exists after a release.\n- Give the fallback a **skeleton** rather than a spinner, so the layout does not jump.\n- Do not split too finely — every chunk is another request, and splitting a small component makes things slower, not faster.\n- You can **preload on intent**: start the import on hover or focus of the link, so the code is usually there by the time the user clicks.\n**Not the same thing as other lazy loading**, and the distinction is worth drawing in an interview: this is JavaScript code splitting, whereas EF Core lazy loading is about navigation properties being fetched per access (and is the usual cause of N+1), and `<img loading=\"lazy\">` is the browser deferring off-screen images. Same words, three different problems.",
  code: "const Reports = React.lazy(() => import('./screens/Reports'));\n\n<Suspense fallback={<SkeletonTable rows={8} />}>\n  <Routes>\n    <Route path=\"/reports\" element={<Reports />} />\n  </Routes>\n</Suspense>\n\n// preload on intent, so the click feels instant\n<Link to=\"/reports\" onMouseEnter={() => import('./screens/Reports')}>Reports</Link>",
  project: "The Vendor Portal is the right shape for this — vendors, buyers and approvers each use a different set of screens, so route-level splitting means a vendor never downloads the approval and reporting code. It pairs with the error boundary work, because a stale chunk after a release is exactly the kind of failure that should show a retry rather than a blank page.",
  remember: "React.lazy + import() splits the bundle, Suspense shows the fallback. Split by route, wrap in an error boundary, preload on hover."
}

]);
