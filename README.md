# DevQA Library

A fast, offline interview answer library for .NET full-stack developers.

Type a keyword — `solid`, `index`, `useEffect`, `jwt`, `middleware` — and the answer
is on screen in a couple of milliseconds. No server, no build step, no API key, no
internet connection, and nothing to install.

**344 answers** across twelve topics, each one written in the same four layers:

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
| C# / .NET | 52 | value vs reference types, async/await, Task vs ValueTask, IEnumerable vs IQueryable, First vs Single, generics, disposal, collections |
| OOP & SOLID | 28 | all five principles with examples, the four pillars, repository, factory, strategy, code review, xUnit / NUnit / Moq, SonarQube and quality gates |
| ASP.NET Core / API | 41 | middleware pipeline, REST design, JWT, OAuth 2.0 / OpenID Connect, claims, DI lifetimes, HttpClientFactory, EF Core loading, transactions and bulk updates, SignalR, OWASP fixes |
| ADO.NET | 25 | connected vs disconnected, the Execute methods, stored procedures, transactions, SqlBulkCopy, DBNull, connection pooling |
| SQL Server | 49 | database design, indexing and B-tree internals, execution plans, query tuning, joins, window functions, transactions, deadlocks, cursors, dynamic SQL, OPENQUERY and linked servers, collation, permissions, HA |
| JavaScript & jQuery | 22 | closures, `this`, promises, event delegation, `==` vs `===`, debounce, array methods |
| React.js | 29 | hooks, props vs state, keys, controlled forms, memoisation, routing, reusable components, Redux Toolkit and RTK Query, TypeScript with React, Jest and React Testing Library, React 18, performance |
| Azure & Functions | 23 | triggers and bindings, hosting plans, Durable Functions, Service Bus queues and topics, Storage, Key Vault, YAML CI/CD pipelines, scaling |
| Microservices | 21 | monolith vs services, communication, resilience, saga, outbox, tracing, Dockerfiles and compose, Kubernetes objects, when *not* to split |
| HTML, CSS & TypeScript | 8 | TypeScript, generics and utility types, semantic HTML, the box model, flexbox vs grid, responsive design, CSS specificity |
| Coding Round | 22 | reverse a string, palindrome, duplicates, two sum, binary search, sorting, LINQ GroupBy, Big-O, SQL per-department and self-join classics, a debounced React search, a CRUD controller |
| Scenario Based | 24 | slow in production, concurrent edits, bad deploy, data leak, legacy refactor, impossible deadline, Excel bulk upload, Agile / Scrum, requirements and mid-sprint changes |

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

## Voice mode

Switch the sidebar control to **Voice** once. The browser asks for the
microphone that one time, and after that it stays listening — ask, read
the answer, ask the next one, no clicking in between. It survives the
silence timeouts and session limits the browser imposes by reopening a
session automatically, and it picks straight back up after a reload.

Stop it deliberately: tap the mic, press **Escape**, or switch back to
**Text**. Typing still works while voice is on.

Answers are always text — nothing is read aloud.

Two things worth knowing, and why it is opt-in rather than on by default:

- **It runs offline too, where the browser can.** Chrome can transcribe on
  the machine instead of streaming the audio to its vendor. The first time
  you switch Voice on it fetches that model in the background — voice works
  throughout, and moves over by itself when the model lands. After that
  nothing leaves the machine at all and the footer says *Fully offline*.
  A browser that cannot do it falls back to the online recogniser: voice
  still works, it just needs a connection to transcribe. The answers never
  do, either way, and the footer always says which of the two you are on.
- **It is told what it is about to hear.** The library's own vocabulary —
  every question title and alias, and every corrected spelling — is handed
  to the recogniser as expected phrases, which is what stops `IEnumerable`
  coming back as "I innumerable". Whatever still slips through is repaired
  by `data/qa-speech.js` before the search runs.
- **It needs a secure page.** It works on the published `https://` link and
  on `localhost`, but not on a file opened straight from disk — Chrome
  blocks the microphone there, and the mic button explains that rather than
  failing silently.

Speech recognition mangles developer words, so `data/qa-speech.js` maps what
the microphone actually produces onto what you meant — "sequel server",
"jason", "a sink await", "see sharp", "jay query". Add your own as you hit
them. The same map rescues typed queries, but only when the direct search is
weak, so a query that already works is never rewritten.

## Mock interview

**Mock interview** in the sidebar turns it around: the app is the interviewer
and you answer out loud.

1. It picks a question (from the topic filter if one is set, starred and
   not-yet-learned ones first) and reads it aloud. The mic is off while it
   talks, so it never hears itself.
2. It listens to your answer, and does **not** react to every word. Nothing
   is judged while words are still coming, a pause to think does not end your
   turn, and "um", "okay" and the like do not count as a reply. Your answer
   is finished once you have said at least a few real words and then stayed
   quiet for about 2.6 seconds, or 4.2 seconds if you stopped mid-phrase on
   "and", "because", "the".
3. It scores the answer against that question's key points: what you
   covered, what you missed, the model answer to compare, and a running
   average. Then it asks the next one.

Say **"repeat"** to hear the question again, **"skip"** to move on, or
**"stop interview"** to end. The bar above the composer has the same as
buttons, plus **Done** to score straight away. Esc ends it too. Starting
Voice mode ends the mock interview, since they share the microphone.

## How the search works

There is no model and no API call. On load, every answer is indexed by its title
tokens, curated tags and body text. A query is normalised, expanded through a
synonym map, and scored against that index — exact tag match ranks highest, then
phrase match in the title, then token and prefix matches. Misspellings fall back to a
bounded Damerau-Levenshtein distance (how far wrong a word may be scales with its
length), and a described symptom is matched by how much of a known problem phrase it
covers. There is always a best answer — the page never dead-ends on "no results".

Searching all 344 answers takes about 2 ms, which the footer reports live.

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
