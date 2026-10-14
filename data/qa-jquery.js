/* JavaScript (ES6+) and jQuery pack */
window.QA = (window.QA || []).concat([

{
  id: "jq-ajax", topic: "jquery", star: true,
  q: "How do you make an AJAX call in jQuery?",
  tags: ["ajax", "jquery ajax", "$.ajax", "call api from jquery", "post json"],
  simple: "AJAX sends a request to the server in the background and updates part of the page with the answer — no full page reload.",
  answer: "`$.ajax` with url, type, data, contentType and dataType, plus success and error handlers. For a .NET Web API that expects JSON I set `contentType: 'application/json'` and send `JSON.stringify(payload)` — otherwise jQuery sends form encoding and the model binder gets nothing.\nPoints I always cover: handle the error callback (not just success), disable the submit button while the call is in flight to stop double posting, include the anti-forgery token on state-changing posts, and never build HTML from the response with string concatenation of user data — that is how XSS gets in.",
  code: "$.ajax({\n  url: '/api/v1/vendors/search',\n  type: 'POST',\n  contentType: 'application/json',\n  data: JSON.stringify({ code: $('#txtCode').val(), page: 1 }),\n  beforeSend: function (xhr) { xhr.setRequestHeader('Authorization', 'Bearer ' + token); },\n  success: function (res) { renderGrid(res.items); },\n  error: function (xhr) { showError(xhr.status === 401 ? 'Session expired' : 'Load failed'); }\n});",
  project: "This is how the server-rendered procurement screens work — AJAX grids, cascading dropdowns and modal forms that load and submit without a page reload. I built those screens with JavaScript, jQuery, AJAX and Bootstrap across the established MVC modules, calling the same .NET endpoints the newer React screens use.",
  remember: "contentType JSON + JSON.stringify, and always write the error handler."
},

{
  id: "jq-delegation", topic: "jquery", star: true,
  q: "Event delegation in jQuery — why does .click() fail on dynamic rows?",
  tags: ["event delegation", "on vs click", "dynamic element click not working", "jquery on"],
  simple: "`.click()` only attaches to elements that exist right now. Rows you add later through AJAX never got the handler. Attach to a parent that already exists and let the event bubble up to it.",
  answer: "`$('.btn-edit').click(...)` binds to the elements found at that moment. After an AJAX refresh the old elements are gone and the new ones have no handler — the single most common jQuery bug in dynamic grids.\nDelegation fixes it: `$('#grid').on('click', '.btn-edit', handler)` binds once to the container and matches the selector when the event bubbles up. It survives any number of re-renders and uses one handler instead of hundreds, which is also lighter on memory.\nI delegate to the nearest stable container rather than to `document`, so the event does not travel further than it needs to.",
  code: "// breaks after the grid reloads\n$('.btn-approve').click(onApprove);\n\n// works for current and future rows\n$('#poGrid').on('click', '.btn-approve', onApprove);",
  project: "Every AJAX grid in the procurement modules uses delegation — the rows are re-rendered on every search, page change and status update, so direct binding would stop working after the first refresh. Same for the dynamically added line-item rows in the document forms.",
  remember: "Dynamic elements need .on() on a parent that already exists."
},

{
  id: "jq-ready", topic: "jquery",
  q: "$(document).ready vs window.onload",
  tags: ["document ready", "window onload", "dom ready", "script placement"],
  simple: "document.ready fires when the HTML structure is ready. window.onload waits for every image and stylesheet too, so it is later and slower.",
  answer: "`$(document).ready(fn)` (or the shorthand `$(fn)`) runs as soon as the DOM is parsed — that is when it is safe to query and bind elements. `window.onload` waits for all resources including images and iframes.\nFor binding handlers and initialising plugins, ready is correct; onload only matters when you need real image dimensions.\nIn plain JavaScript the equivalent is `DOMContentLoaded`, or simply putting the script at the end of the body or marking it `defer`. The usual symptom of getting it wrong is a selector returning an empty set because the script ran before the element existed.",
  code: "$(function () {\n    bindGridEvents();\n    loadDropdowns();\n});",
  project: "Every jQuery screen in the procurement modules binds its handlers inside a ready block — the grids, cascading dropdowns and modal forms are all initialised there rather than relying on script position.",
  remember: "ready = DOM is there. onload = everything, including images."
},

{
  id: "jq-vs-js", topic: "jquery",
  q: "Do we still need jQuery? jQuery vs modern JavaScript",
  tags: ["jquery vs javascript", "vanilla js", "queryselector", "is jquery dead"],
  simple: "Modern browsers now do natively most of what jQuery was invented for. New code does not need it — but a lot of working enterprise code uses it, and that code still has to be maintained.",
  answer: "jQuery solved cross-browser DOM access, AJAX and animation at a time when browsers disagreed on everything. Today `querySelector`, `classList`, `fetch`, `addEventListener` and CSS transitions cover the same ground without a 90 KB dependency, and SPA frameworks own the rendering.\nWhere it is still right: legacy screens, Bootstrap 4-era plugins, DevExtreme/DataTables-style widgets, and small server-rendered pages where adding a framework is not worth it.\nMy honest position in an interview: I write new front ends in React, I maintain and extend established jQuery modules, and I do not rewrite working screens just to remove a library.",
  code: "// jQuery\n$('#btnSave').on('click', save);\n// vanilla\ndocument.getElementById('btnSave').addEventListener('click', save);",
  project: "That is exactly the split in my work: the Vendor Portal front end is React.js, while the established procurement and document modules are MVC Razor with jQuery and AJAX, which I continue to maintain and extend.",
  remember: "New work in React; jQuery stays for the modules that already use it."
},

{
  id: "js-var-let-const", topic: "jquery", star: true,
  q: "var vs let vs const (and hoisting)",
  tags: ["var let const", "hoisting", "block scope", "temporal dead zone"],
  simple: "var is function-scoped and leaks out of blocks. let and const are block-scoped. const means the binding cannot be reassigned — the object inside can still change.",
  answer: "`var` is function scoped and hoisted as `undefined`, which is why a variable can be read before its declaration line without an error.\n`let` and `const` are block scoped and hoisted into a temporal dead zone — reading them before the declaration throws, which catches bugs early.\n`const` prevents reassignment of the binding only: `const arr = []; arr.push(1)` is perfectly legal.\nThe classic interview demo is a loop with `var` in a setTimeout printing the final value every time, because all iterations share one variable; `let` creates a fresh binding per iteration.\nMy default is const, let when it must change, var never in new code.",
  code: "for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 3 3 3\nfor (let j = 0; j < 3; j++) setTimeout(() => console.log(j));   // 0 1 2",
  remember: "const by default, let when it changes, var not at all."
},

{
  id: "js-equality", topic: "jquery",
  q: "== vs === in JavaScript",
  tags: ["== vs ===", "equality", "type coercion", "truthy falsy"],
  simple: "== converts the types first and then compares, so surprising things end up equal. === compares value and type, with no conversion.",
  answer: "`==` applies type coercion: `'5' == 5` is true, `0 == false` is true, `null == undefined` is true, and `[] == false` is true. Those rules are hard to hold in your head, so the result is bugs.\n`===` compares type and value — predictable, and what I use everywhere.\nThe one idiomatic exception is `x == null`, which checks null and undefined together.\nRelated: falsy values are `false, 0, '', null, undefined, NaN`, so `if (qty)` wrongly rejects a legitimate zero — use `if (qty !== undefined)` or an explicit check.",
  code: "'5' == 5     // true\n'5' === 5    // false\n0 == ''      // true\nif (value == null) { /* null or undefined */ }",
  remember: "Always ===. The only safe == is x == null."
},

{
  id: "js-closure", topic: "jquery", star: true,
  q: "What is a closure in JavaScript?",
  tags: ["closure", "lexical scope", "private variable js", "iife"],
  simple: "A function remembers the variables from where it was created, even after that outer function has finished. That memory is the closure.",
  answer: "A closure is a function plus the scope it was defined in. When an inner function references an outer variable, that variable stays alive after the outer function returns.\nUses: private state (a counter or cache nobody outside can touch), factory functions that capture configuration, the module pattern, and every callback that uses a variable from its surrounding scope — which is most event handlers.\nThe cost is memory: a closure holding a large object or a DOM node keeps it from being collected, which is a real leak source in long-lived pages.",
  code: "function createCounter() {\n    let count = 0;                 // private\n    return { next: () => ++count };\n}\nconst c = createCounter();\nc.next();   // 1\nc.next();   // 2",
  project: "The shared jQuery widgets in our MVC screens are written with this pattern — the grid helper keeps its page number, filters and selected rows in closure variables instead of globals, so two grids on the same page do not overwrite each other's state.",
  remember: "Inner function keeps the outer variables alive. That is a closure."
},

{
  id: "js-this", topic: "jquery",
  q: "What does this refer to? Arrow functions vs normal functions",
  tags: ["this keyword", "arrow function", "bind call apply", "lexical this"],
  simple: "In a normal function, this depends on how the function is called. An arrow function does not have its own this — it borrows the one from where it was written.",
  answer: "For a regular function `this` is the call-site object: the object before the dot, the DOM element in a DOM handler, undefined in strict mode when called standalone, or the new object with `new`.\nArrow functions capture `this` lexically, which is why they are the fix for the old `var self = this;` workaround inside callbacks.\nThat also makes arrows wrong in two places: as jQuery event handlers where you want `this` to be the element (use `event.currentTarget` or a normal function), and as object methods that need the object as `this`.\n`call`, `apply` and `bind` set `this` explicitly — bind returns a new permanently bound function.",
  code: "$('#grid').on('click', '.row', function () {\n    $(this).addClass('selected');           // this = the clicked element\n});\n\nconst api = {\n  rows: [],\n  load() { fetch(url).then(r => r.json()).then(d => { this.rows = d; }); }  // arrow keeps this\n};",
  project: "This comes up constantly in the legacy screens: the grid row handlers need this to be the clicked element, so those stay normal functions, while callbacks inside the newer React code use arrows so this is not a question at all.",
  remember: "Normal function: this = caller. Arrow: this = where it was written."
},

{
  id: "js-promise", topic: "jquery", star: true,
  q: "Promises, async/await and callback hell",
  tags: ["promise", "async await javascript", "callback hell", "then catch", "promise.all"],
  simple: "A promise is a receipt for a value that is not ready yet. async/await lets you write code that waits for it without nesting callbacks inside callbacks.",
  answer: "A promise is pending, then fulfilled or rejected. `.then()` chains and `.catch()` handles errors, which already flattens the nested-callback pyramid.\n`async/await` is syntax over promises — `await` pauses the async function until the promise settles, and errors are caught with ordinary try/catch, so the code reads top to bottom.\nUseful combinators: `Promise.all` for independent calls in parallel (fails if any fails), `Promise.allSettled` when you want every result regardless, `Promise.race` for timeouts.\nThe mistake I watch for is awaiting inside a loop when the calls are independent — that serialises them when `Promise.all` would run them together.",
  code: "async function loadScreen(id) {\n  try {\n    const [vendor, orders] = await Promise.all([\n      fetch(`/api/vendors/${id}`).then(r => r.json()),\n      fetch(`/api/vendors/${id}/orders`).then(r => r.json())\n    ]);\n    render(vendor, orders);\n  } catch (e) { showError(e); }\n}",
  project: "The React screens in the Vendor Portal load their lookups and their data this way — independent calls in parallel with Promise.all so the screen paints once, and a single catch that maps the failure onto the error banner instead of leaving a spinner running forever.",
  remember: "await for dependent calls, Promise.all for independent ones."
},

{
  id: "js-fetch-ajax", topic: "jquery",
  q: "fetch vs $.ajax vs axios",
  tags: ["fetch", "axios", "ajax comparison", "http client javascript"],
  simple: "All three call an API. fetch is built into the browser, $.ajax comes with jQuery, axios is a small library with nicer defaults.",
  answer: "`fetch` is native and promise-based, but it has two gotchas: it does not reject on HTTP error statuses (you must check `response.ok` yourself) and you must call `.json()` manually.\n`$.ajax` needs jQuery but handles JSON parsing, has rich options, and fits existing jQuery code.\n`axios` auto-parses JSON, rejects on non-2xx, supports interceptors and request cancellation — the interceptor is why SPAs like it: one place to attach the bearer token and one place to handle 401.\nI use axios in React, fetch for anything small, and $.ajax inside the legacy modules.",
  code: "const res = await fetch(url);\nif (!res.ok) throw new Error(res.status);   // fetch will NOT throw on 404/500\nconst data = await res.json();",
  project: "In the Vendor Portal the React side uses an axios instance with a request interceptor that attaches the JWT and a response interceptor that pushes the user back to login on a 401 — that is the piece that keeps token handling out of every individual component.",
  remember: "fetch does not throw on 404 or 500. Check response.ok."
},

{
  id: "js-bubbling", topic: "jquery",
  q: "Event bubbling, capturing, preventDefault and stopPropagation",
  tags: ["event bubbling", "capturing", "preventdefault", "stoppropagation", "event phases"],
  simple: "An event starts at the top and travels down to the element (capturing), then bubbles back up (bubbling). preventDefault stops the browser's default action; stopPropagation stops the travel.",
  answer: "Three phases: capture (document → target), target, bubble (target → document). Handlers listen in the bubble phase by default; pass `true` (or `{capture:true}`) for the capture phase.\n`event.preventDefault()` cancels the default behaviour — form submit, link navigation, checkbox toggle.\n`event.stopPropagation()` stops the event travelling further, which is what you need when a button sits inside a clickable row and you do not want both handlers to fire.\n`return false` in a jQuery handler does both at once, which is convenient and also why people are surprised when a parent handler mysteriously stops firing.\nBubbling is what makes event delegation possible.",
  code: "$('#grid').on('click', '.btn-delete', function (e) {\n    e.preventDefault();      // do not follow the href\n    e.stopPropagation();     // do not also trigger the row-select handler\n    confirmDelete($(this).data('id'));\n});",
  project: "The AJAX grids have clickable rows with action buttons inside them, so stopPropagation on the button handler is what keeps a delete click from also triggering the row-select handler.",
  remember: "preventDefault = stop the browser. stopPropagation = stop the travel."
},

{
  id: "js-array-methods", topic: "jquery", star: true,
  q: "map, filter, reduce, find — array methods",
  tags: ["map filter reduce", "array methods", "foreach vs map", "find some every"],
  simple: "map transforms every item into a new array. filter keeps the ones that pass a test. reduce boils the whole array down to one value. find returns the first match.",
  answer: "- `map` — same length, each item transformed. Returns a new array.\n- `filter` — subset that passes the predicate.\n- `reduce` — accumulate to a single value: a total, a grouped object, a lookup map.\n- `find` / `findIndex` — first match or its position.\n- `some` / `every` — boolean checks.\n- `forEach` — side effects only; it returns undefined and cannot be chained.\nAll of them except forEach return something, so they chain. In React this matters because rendering a list is `items.map(...)` and filtering must never mutate state — these methods return new arrays, which is exactly what immutable state updates need.",
  code: "const total = lines\n  .filter(l => l.qty > 0)\n  .map(l => l.qty * l.rate)\n  .reduce((sum, v) => sum + v, 0);",
  project: "The React grids and the document line-item screens use this constantly — map to render rows, filter for client-side search on an already-loaded page, and reduce to total the line amounts shown in the footer before the server recalculates on save.",
  remember: "map transforms, filter selects, reduce accumulates, forEach just loops."
},

{
  id: "js-es6", topic: "jquery",
  q: "What ES6+ features do you use?",
  tags: ["es6", "destructuring", "spread operator", "template literal", "optional chaining", "modern javascript"],
  simple: "Arrow functions, let/const, template strings, destructuring, spread, default parameters, optional chaining, modules — the everyday modern JavaScript toolkit.",
  answer: "The ones I use daily:\n- **Arrow functions** and lexical `this`.\n- **Template literals** for readable strings and multi-line markup.\n- **Destructuring** of objects and arrays, including in function parameters — `const { id, name } = vendor;`\n- **Spread/rest** for copying and merging — `{...state, status: 'OPEN'}` is the standard immutable update in React.\n- **Default parameters** and **optional chaining** `?.` with **nullish coalescing** `??`.\n- **Modules** (import/export), **Promise/async-await**, `Map`/`Set`.\nSpread does a shallow copy, which is worth saying out loud — nested objects are still shared references.",
  code: "const { id, name = '-' } = vendor;\nconst next = { ...state, status: 'APPROVED' };\nconst city = vendor?.address?.city ?? 'N/A';",
  remember: "Spread is a shallow copy. Nested objects are still shared."
},

{
  id: "js-debounce", topic: "jquery",
  q: "What is debounce and throttle?",
  tags: ["debounce", "throttle", "search box performance", "too many api calls"],
  simple: "Debounce waits until the user stops typing before calling the server. Throttle lets a repeated event run at most once every N milliseconds.",
  answer: "Debounce resets a timer on every event and only runs after a quiet period — ideal for a search box, so typing eight characters makes one request instead of eight.\nThrottle guarantees a maximum rate — ideal for scroll, resize and mousemove handlers.\nFor a search field I also cancel the in-flight request (axios cancel token or AbortController), otherwise a slow earlier response can land after a faster later one and show stale results.",
  code: "function debounce(fn, ms) {\n  let t;\n  return function (...args) {\n    clearTimeout(t);\n    t = setTimeout(() => fn.apply(this, args), ms);\n  };\n}\n$('#txtSearch').on('input', debounce(search, 350));",
  project: "The vendor and item search boxes use debounced input — without it, every keystroke hit a database-backed search endpoint. Adding a 300-350 ms debounce cut that traffic by roughly an order of magnitude with no visible difference to the user.",
  remember: "Debounce = wait until they stop. Throttle = at most once per interval."
},

{
  id: "js-storage", topic: "jquery",
  q: "localStorage vs sessionStorage vs cookies",
  tags: ["localstorage vs sessionstorage", "cookies", "client storage", "where to store jwt"],
  simple: "localStorage stays until you clear it. sessionStorage dies with the tab. Cookies are small and are sent to the server with every request.",
  answer: "- **localStorage** — around 5 MB, persists across sessions, same-origin, synchronous, never sent to the server.\n- **sessionStorage** — same API, cleared when the tab closes.\n- **Cookies** — around 4 KB, sent automatically on every matching request, and the only one that can be made `HttpOnly` so JavaScript cannot read it.\nFor tokens this is the real debate: localStorage is readable by any script, so an XSS flaw exposes the token; an HttpOnly, Secure, SameSite cookie is safer against XSS but needs CSRF protection. Either way nothing sensitive beyond the token goes in client storage, and client-side values are never trusted by the server.",
  project: "The Vendor Portal keeps the access token on the client and attaches it via an axios interceptor, with a short token lifetime so a stolen token has a small window. Role flags held on the client are used only to decide what to show — every endpoint re-checks the role on the server.",
  remember: "localStorage persists, sessionStorage is per tab, cookies go to the server. Never trust any of them server-side."
},

{
  id: "jq-cascading", topic: "jquery",
  q: "How do you build cascading dropdowns?",
  tags: ["cascading dropdown", "dependent dropdown", "select change ajax", "dropdown bind"],
  simple: "When the first dropdown changes, clear the second one and load its options from the server for the chosen value.",
  answer: "Bind to the `change` event of the parent, disable and clear the child, call the endpoint with the parent id, then rebuild the options. Details that matter in a real screen: show a loading state so the user does not click an empty list, cancel or ignore a stale response if the parent changes again quickly, and reselect the previously saved value when loading an existing record for edit.\nAnd the server must still validate the submitted combination — a user can post any value regardless of what the dropdown offered.",
  code: "$('#ddlState').on('change', function () {\n  const stateId = $(this).val();\n  const $city = $('#ddlCity').prop('disabled', true).empty()\n                .append('<option>Loading...</option>');\n  $.getJSON('/api/cities?stateId=' + stateId, function (list) {\n    $city.empty().append('<option value=\"\">-- Select --</option>');\n    list.forEach(c => $city.append($('<option>').val(c.id).text(c.name)));\n    $city.prop('disabled', false);\n  });\n});",
  project: "Cascading dropdowns are part of the dynamic server-rendered UI I built in the procurement system — company → plant → store, state → city, and vendor → vendor contact. Building the options with jQuery element creation rather than HTML string concatenation also keeps user-supplied names from being injected into the page.",
  remember: "Clear the child, show loading, rebuild, and still validate on the server."
},

{
  id: "js-copy", topic: "jquery",
  q: "Shallow copy vs deep copy in JavaScript",
  tags: ["shallow copy vs deep copy", "spread copy", "structuredclone", "object reference"],
  simple: "A shallow copy copies the top level only — nested objects are still shared. A deep copy duplicates everything, so nothing is shared.",
  answer: "`{...obj}` and `Object.assign({}, obj)` are shallow: change `copy.address.city` and the original changes too, because both point at the same address object.\nDeep copy options: `structuredClone(obj)` (modern and handles Dates, Maps, cyclic references), or `JSON.parse(JSON.stringify(obj))` which is quick but drops functions and undefined, and turns Dates into strings.\nThis matters most in React state updates — a nested change needs each level along the path copied, otherwise the reference is unchanged and the component may not re-render.",
  code: "const copy  = { ...order };                 // shallow\nconst deep  = structuredClone(order);       // deep\n// React: copy each level you change\nsetOrder(o => ({ ...o, header: { ...o.header, status: 'OPEN' } }));",
  remember: "Spread copies one level deep. Nested changes need nested copies."
},

{
  id: "js-validation", topic: "jquery",
  q: "How do you do client-side form validation?",
  tags: ["client side validation", "jquery validation", "form validation", "unobtrusive validation"],
  simple: "Check the input in the browser so the user sees mistakes immediately — then check it again on the server, because the browser can be bypassed.",
  answer: "In MVC screens I use jQuery Validate with unobtrusive validation, which reads the data annotations rendered onto the inputs — so the rules are declared once on the model and enforced on both sides.\nPractical rules: validate on blur and on submit rather than on every keystroke, show the message next to the field, mark the first invalid field focused, and disable the submit button while posting.\nThe non-negotiable part is that client validation is a convenience. Anyone can post directly with Postman, so the API repeats every rule.",
  code: "$('#frmVendor').validate({\n  rules:    { Gstin: { required: true, minlength: 15, maxlength: 15 } },\n  messages: { Gstin: { required: 'GSTIN is required' } },\n  errorPlacement: function (err, el) { err.insertAfter(el.closest('.form-group')); }\n});",
  project: "The MVC procurement forms use unobtrusive validation driven by the model annotations, and the React registration forms in the Vendor Portal do the same job with component-level validation. In both cases the API DTO carries the same rules, so a bypassed browser check still fails on the server.",
  remember: "Client validation for speed, server validation for safety. Always both."
},

{
  id: "js-hoisting", topic: "jquery",
  q: "What is hoisting?",
  tags: ["hoisting", "function hoisting", "var undefined", "temporal dead zone"],
  simple: "JavaScript moves declarations to the top of their scope before running. var becomes undefined, function declarations are fully available, let and const throw if you touch them early.",
  answer: "During compilation declarations are registered first. `var` is initialised to `undefined`, so reading it before assignment gives undefined rather than an error. Function **declarations** are hoisted whole, so they can be called before they appear. Function **expressions** assigned to a variable follow the variable's rules.\n`let` and `const` are hoisted but sit in the temporal dead zone until the declaration executes, so early access throws a ReferenceError — which is better, because it surfaces the bug immediately.",
  code: "console.log(a);    // undefined\nvar a = 1;\n\nconsole.log(b);    // ReferenceError\nlet b = 2;\n\nhello();           // works — declaration hoisted\nfunction hello() {}",
  remember: "var hoists as undefined, let/const throw, function declarations are ready."
},

{
  id: "jq-dom", topic: "jquery",
  q: "jQuery DOM methods — html vs text vs val, attr vs prop",
  tags: ["html vs text", "attr vs prop", "val", "append prepend", "dom manipulation"],
  simple: "text() sets plain text safely. html() sets markup and will run whatever you give it. val() is for form inputs. attr reads the HTML attribute, prop reads the live property.",
  answer: "- `.text()` escapes content — the safe default for anything a user typed.\n- `.html()` parses markup, so injecting unescaped user data here is a direct XSS route.\n- `.val()` gets or sets the value of inputs, selects and textareas.\n- `.attr()` reads the attribute as written in the HTML; `.prop()` reads the current DOM property. For `checked`, `selected` and `disabled` always use `prop()` — `attr('checked')` reflects the initial markup, not the user's current state.\n- `.append`/`.prepend`/`.before`/`.after` to insert, `.remove()` to delete, `.empty()` to clear children.",
  code: "$('#lblName').text(user.name);              // safe\n$('#chkActive').prop('checked', true);      // not attr\nconst isOn = $('#chkActive').prop('checked');",
  project: "Switching grid rendering from `.html()` with concatenated strings to text-based element building was part of the XSS remediation on the legacy screens — a vendor name containing script tags was enough to execute in the browser before that change.",
  remember: "text() is safe, html() executes. Use prop() for checked and disabled."
},

{
  id: "js-null-undefined", topic: "jquery",
  q: "null vs undefined in JavaScript",
  tags: ["null vs undefined", "undefined", "typeof", "optional chaining"],
  simple: "undefined means nobody ever set it. null means somebody deliberately set it to nothing.",
  answer: "`undefined` is the default for a declared but unassigned variable, a missing object property, a missing function argument, and a function with no return.\n`null` is an explicit assignment meaning no value — typically what an API returns for an empty field.\n`typeof undefined` is 'undefined'; `typeof null` is 'object', a famous language bug.\n`null == undefined` is true but `null === undefined` is false, which is why `value == null` is the accepted idiom for checking both at once. Optional chaining `?.` and `??` are the modern way to handle them safely.",
  code: "let a;                 // undefined\nconst b = null;        // explicitly empty\nconst city = vendor?.address?.city ?? 'N/A';",
  remember: "undefined = never set. null = set to nothing on purpose."
}

]);
