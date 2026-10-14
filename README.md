# DevQA Library

A fast, offline interview answer library for .NET full-stack developers.

Type a keyword — `solid`, `index`, `useEffect`, `jwt`, `middleware` — and the answer
is on screen in a couple of milliseconds. No server, no build step, no API key, no
internet connection, and nothing to install.

**161 answers** across eight topics, each one written in the same four layers:

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
| OOP & SOLID | 17 | all five principles with examples, the four pillars, repository, factory, strategy, code review |
| ASP.NET Core / API | 22 | middleware pipeline, REST design, JWT, DI lifetimes, EF Core performance and migrations, OWASP fixes |
| SQL Server | 24 | indexing, query tuning, joins, window functions, transactions, deadlocks, paging, parameter sniffing |
| JavaScript & jQuery | 21 | closures, `this`, promises, event delegation, `==` vs `===`, debounce, array methods |
| React.js | 21 | hooks, props vs state, keys, controlled forms, memoisation, routing, reusable component design |
| Azure & Functions | 17 | triggers and bindings, hosting plans, Durable Functions, Key Vault, CI/CD, scaling |
| Microservices | 17 | monolith vs services, communication, resilience, saga, tracing, when *not* to split |

## Features

- **Instant keyword search** with typo tolerance (`solit`, `indx`, `middlware` all resolve)
  and developer shorthand (`sp`, `di`, `oops`, `n+1`, `cte`, `asnotracking`)
- **Autocomplete** as you type, with topic badges
- **Topic filter** in the sidebar and the dropdown
- **Browse mode** showing every question as cards
- **Mark as learned** with a progress counter, stored in your browser
- **Copy answer** to the clipboard as plain text
- **Dark and light themes**, following your system setting by default
- `/` focuses the search box; `index.html#q=solid` deep-links to an answer

## How the search works

There is no model and no API call. On load, every answer is indexed by its title
tokens, curated tags and body text. A query is normalised, expanded through a
synonym map, and scored against that index — exact tag match ranks highest, then
phrase match in the title, then token and prefix matches, with a one-character edit
distance as a fallback for typos.

Searching all 161 answers takes about 1.5 ms, which the footer reports live.

## Add your own questions

Open any file in `data/` and append an object:

```js
{
  id: "sql-my-new-one",            // unique
  topic: "sql",                    // csharp solid aspnet sql jquery react azure microservices
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
