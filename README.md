# DevQA Library

A fast, offline interview answer library for .NET full-stack developers.

Type a keyword — `solid`, `index`, `useEffect`, `jwt`, `middleware` — and the answer
is on screen in a couple of milliseconds. No server, no build step, no API key, no
internet connection, and nothing to install.

**252 answers** across twelve topics, each one written in the same four layers:

| Block | What it gives you |
|---|---|
| **In simple words** | the plain-English version first |
| **Say this in the interview** | the same idea in interview language |
| **Code** | the snippet an interviewer expects to see |
| **Where I used it in my project** | the answer grounded in real production work |
| **Remember** | one line to recall under pressure |

That fourth block is the point of the whole thing. Knowing what a covering index *is*
gets you through one question; being able to say which screen it fixed and what the
response time did is what gets you through the follow-up.

## Run it

Clone or download, then open `index.html` in any browser. On Windows you can
double-click `Start-Library.cmd`.

That is the entire setup. The data ships as plain `.js` files loaded with `<script>`
tags rather than `fetch`, specifically so the page works straight from the filesystem.

## Topics

| Topic | Answers | Covers |
|---|---|---|
| C# / .NET | 22 | value vs reference types, async/await, IEnumerable vs IQueryable, generics, disposal, collections |
| OOP & SOLID | 18 | all five principles with examples, the four pillars, repository, factory, strategy, code review |
| ASP.NET Core / API | 25 | middleware pipeline, REST design, JWT, claims, DI lifetimes, EF Core, SignalR, OWASP fixes |
| ADO.NET | 23 | connected vs disconnected, the Execute methods, stored procedures, transactions, SqlBulkCopy, DBNull, connection pooling |
| SQL Server | 24 | indexing, query tuning, joins, window functions, transactions, deadlocks, paging, parameter sniffing |
| JavaScript & jQuery | 21 | closures, `this`, promises, event delegation, `==` vs `===`, debounce, array methods |
| React.js | 21 | hooks, props vs state, keys, controlled forms, memoisation, routing, reusable component design |
| Azure & Functions | 17 | triggers and bindings, hosting plans, Durable Functions, Key Vault, CI/CD, scaling |
| Microservices | 17 | monolith vs services, communication, resilience, saga, tracing, when *not* to split |
| HTML, CSS & TypeScript | 6 | TypeScript, semantic HTML, the box model, flexbox vs grid, responsive design, CSS specificity |
| Coding Round | 19 | reverse a string, palindrome, duplicates, two sum, binary search, sorting, LINQ GroupBy, Big-O |
| Scenario Based | 19 | slow in production, concurrent edits, bad deploy, data leak, legacy refactor, impossible deadline |

## Features

- **Instant keyword search** with real typo tolerance — `stord procedur`, `dedlock`,
  `dependancy injection` and `polymorfism` all resolve, and the answer tells you which
  word it searched for instead
- **Describe the problem, not the term** — "the click event stops working after the grid
  refreshes" finds event delegation; "timeout expired obtaining a connection from the pool"
  finds the disposal answer. The phrases live in `data/qa-problems.js`
- **Developer shorthand** — `sp`, `di`, `oops`, `n+1`, `cte`, `asnotracking`
- **Autocomplete** as you type, with topic badges
- **Topic filter** in the sidebar and the dropdown
- **Browse mode** showing every question as cards
- **Mark as learned** with a progress counter, stored in your browser
- **Copy answer** to the clipboard as plain text
- **Dark and light themes**, following your system setting by default
- `/` focuses the search box, `Ctrl+B` hides or shows the sidebar; `index.html#q=solid` deep-links to an answer

## How the search works

There is no model and no API call. On load, every answer is indexed by its title
tokens, curated tags and body text. A query is normalised, expanded through a
synonym map, and scored against that index — exact tag match ranks highest, then
phrase match in the title, then token and prefix matches. Misspellings fall back to a
bounded Damerau-Levenshtein distance (how far wrong a word may be scales with its
length), and a described symptom is matched by how much of a known problem phrase it
covers. There is always a best answer — the page never dead-ends on "no results".

Searching all 252 answers takes about 2 ms, which the footer reports live.

## Add your own questions

Open any file in `data/` and append an object:

```js
{
  id: "sql-my-new-one",            // unique
  topic: "sql",                    // csharp solid aspnet adonet sql jquery react azure microservices web coding scenario
  star: true,                      // optional — features it on the home screen
  q: "The question as an interviewer would ask it",
  tags: ["keyword", "short form", "another phrasing"],
  simple:   "The plain-English version.",
  answer:   "The interview answer. **bold**, `code`, and - bullet lines all work.",
  code:     "optional snippet",
  project:  "Where you used it in your own project.",
  remember: "One line."
}
```

Save, refresh. The index rebuilds on load — there is nothing to compile.

Use double quotes around the strings, so apostrophes and backticks are safe inside,
and write newlines as `\n`.

## A note on the answers

The project notes describe real work: a React + .NET vendor portal, a configurable
document engine, a Hangfire-based SAP Business One integration, and a procurement
platform on ASP.NET Core and MVC 5 with SQL Server.

Where the experience isn't there, the answer says so and names the nearest real thing
instead of bluffing. That is deliberate. An honest "I haven't run that in production,
but here is the equivalent I have built" survives the follow-up question; an invented
claim collapses on it, and takes everything else you said with it.

## Licence

MIT — use it, fork it, rewrite the answers in your own words. The last part matters:
an answer you can defend is worth more than a better one you memorised.
