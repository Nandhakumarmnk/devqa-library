/* ============================================================
   Spoon-fed layer: the exact words to say, and what they ask next.

   The answer field is notes. This is speech — first person, said
   out loud, roughly 30-60 seconds. Read it as written and it works.

   followups are the questions that actually come next, each with a
   short answer, so the second question does not catch you out.

   Attached to answers by id, like the comparison tables. Add more
   as you go — any id in the library can have one.
   ============================================================ */
window.QA_SCRIPT = {

/* ---------- OOP & SOLID ---------- */
"sol-solid": {
  script: "SOLID is five principles I use to keep classes small and changeable. S is Single Responsibility — one class, one reason to change, so my controller takes the request, my service holds the rules and my repository talks to the database. O is Open/Closed — I add a new type by adding a class, not by editing a switch statement that already works. L is Liskov Substitution — any child class has to work wherever the parent is expected, without surprising the caller. I is Interface Segregation — several small interfaces instead of one fat one, so nobody implements methods they do not need. D is Dependency Inversion — my code depends on interfaces and the concrete class is injected, which is exactly what ASP.NET Core's DI container gives you. The reason I care is testability and safe change: I can replace one piece without touching the rest.",
  followups: [
    { q: "Which one do you use most?", a: "Single Responsibility and Dependency Inversion — they are the two that show up in every class I write. The other three are things I check for in review." },
    { q: "Give me a real violation you fixed.", a: "A document class that validated, saved and emailed. I split it into a validator, a repository and a notification service — then a change to the email wording touched one file instead of three." },
    { q: "Is SOLID always right?", a: "No. It tells you how to structure what you need, not to build what you do not. A tiny CRUD app with five layers is ceremony — that is what YAGNI is for." }
  ]
},

"sol-srp": {
  script: "Single Responsibility means a class should have one reason to change. The test I use is simple — if I cannot name the class without using the word 'and', it is doing too much. For example, an order service that validates the order, saves it to the database and sends the confirmation email has three reasons to change: the business rules, the schema, and the email template. Any of those changing forces me to edit and retest that one class. So I split it into a validator, a repository and a mailer, and the order service just orchestrates them. The payoff is that each change touches one small file, the tests are focused, and two developers can work on different concerns without conflicting.",
  followups: [
    { q: "How small is too small?", a: "When classes that always change together have been split apart. Cohesion is the test, not line count — five classes that must all change for one requirement is worse than one class." },
    { q: "How does this help testing?", a: "A validator with no database and no email can be tested with plain objects. Once those are separate, the test needs no mocks at all for that part." }
  ]
},

"sol-dip": {
  script: "Dependency Inversion says high-level code should depend on abstractions, not on concrete classes — and Dependency Injection is how you actually do it. In practice my service declares what it needs in its constructor as an interface, and the container supplies the real implementation at runtime. So my vendor service takes an IVendorRepository; it has no idea whether that is Entity Framework, Dapper or a stub. That buys me three things: I can swap the implementation without touching the consumer, I can inject a fake in a unit test, and the lifetimes are managed centrally. In ASP.NET Core the container is built in, so I register scoped for anything per request like the DbContext and repositories, and singleton for stateless things like configuration.",
  followups: [
    { q: "What is the difference between DI and the DI container?", a: "DI is the pattern — passing dependencies in rather than creating them. The container is just the thing that wires it up for you. You can do DI by hand with a constructor." },
    { q: "What goes wrong with lifetimes?", a: "Injecting a scoped DbContext into a singleton. The singleton holds it forever, so it gets shared across requests and threads — ASP.NET Core actually throws on that at startup in development." }
  ]
},

"sol-oop-4": {
  script: "The four pillars are encapsulation, abstraction, inheritance and polymorphism. Encapsulation is keeping the data private and exposing controlled access, so an object protects its own state — my purchase order keeps its lines in a private list and exposes an AddLine method that enforces the rules. Abstraction is showing what something does and hiding how; an interface like ISapClient is abstraction. Inheritance is a derived class reusing and specialising a base — my document types inherit a base document. And polymorphism is one call behaving differently depending on the actual object: the engine calls Validate on a base reference and the right document type's version runs. The point of all four together is that the calling code stays the same while the implementation behind it changes.",
  followups: [
    { q: "Abstraction versus encapsulation?", a: "Abstraction is design — deciding what to show. Encapsulation is implementation — protecting what is behind it. Abstraction gives a clean surface, encapsulation stops anyone reaching around it." },
    { q: "Why prefer composition over inheritance?", a: "Inheritance couples you to a base class and C# only allows one. Composition injects collaborators behind interfaces, which can be swapped and mocked. I inherit only for a genuine is-a with a stable contract." }
  ]
},

/* ---------- C# ---------- */
"cs-abstract-interface": {
  script: "An interface is a contract — it says what a type must do, with no implementation and no state, and a class can implement many of them. An abstract class is a partly built parent — it can hold fields, a constructor and real methods alongside the abstract ones, but a class can only inherit one. So I reach for an interface when unrelated types need to honour the same contract, and for anything I want to inject or mock in a test, which in a .NET codebase is most things. I use an abstract class when several types genuinely form an is-a family and share real logic and state. In my document engine both appear: an abstract base document carries the shared audit and header behaviour, while the storage and SAP sides sit behind interfaces so the controller depends on the contract.",
  followups: [
    { q: "Can an interface have implementation now?", a: "Yes, C# 8 added default interface methods. They are useful for adding a member to a published interface without breaking implementers, but I would not use them to hold real logic — that is what a base class is for." },
    { q: "Why can a class implement many interfaces but inherit one class?", a: "To avoid the diamond problem — ambiguous inherited state and implementation from two parents. Interfaces carry no state, so there is nothing to be ambiguous about." }
  ]
},

"cs-value-ref": {
  script: "A value type holds the data itself, and a reference type holds the address of data that lives on the heap. So int, decimal, bool, DateTime, struct and enum are value types — assign one to another variable and you get an independent copy. Class, string, arrays and collections are reference types — assign one and both names point at the same object, so a change through one is visible through the other. A value type can never be null unless I make it nullable, and by default value types compare by content while reference types compare by identity. The one that catches people is string: it is a reference type, but because it is immutable it behaves like a value.",
  followups: [
    { q: "Where exactly do they live?", a: "It depends on where they are declared, not on the type. A local int is on the stack; an int field inside a class object is on the heap inside that object; a captured variable in a closure moves to the heap too." },
    { q: "What is boxing?", a: "Putting a value type into an object or a non-generic interface — the runtime allocates a heap object and copies the value in. Each box is an allocation, which is why generics exist." }
  ]
},

"cs-async-await": {
  script: "async and await let a thread walk away from slow work instead of standing and waiting for it. When I mark a method async and await something, the compiler builds a state machine: at the await point the method returns to its caller, the thread goes back to the pool, and when the awaited task completes the rest of the method is scheduled to carry on. The important thing is that it does not make one request faster — it means the server handles many more at once, because threads are not blocked sitting on database and HTTP calls. The rules I stick to are async all the way down, return Task rather than void except for event handlers, and never call .Result or .Wait, because that blocks a thread and can deadlock.",
  followups: [
    { q: "What actually deadlocks with .Result?", a: "In classic ASP.NET or WPF there is a synchronisation context that wants the continuation back on the original thread — and .Result is blocking that very thread, so neither side can proceed. ASP.NET Core has no sync context so it usually does not deadlock, but it still wastes a thread." },
    { q: "Does async use more threads?", a: "The opposite. While waiting on I/O there is often no thread at all. It is CPU-bound work via Task.Run that borrows a pool thread." }
  ]
},

"cs-ienumerable-iqueryable": {
  script: "The difference is where the filtering happens. IQueryable holds an expression tree, so anything I chain onto it — Where, OrderBy, Skip, Take — gets translated into the SQL that Entity Framework finally sends, and the database does the work. IEnumerable works on objects already in memory, so the moment I call ToList or cast a DbSet to IEnumerable, everything after that runs in C# on rows that have already been pulled across. That is why the mistake is expensive: a list screen that calls ToList and then filters has dragged the whole table over the wire. So in my repositories, anything still composable returns IQueryable, and once I have the final data I return a list.",
  followups: [
    { q: "How do you spot this in a code review?", a: "A ToList, AsEnumerable or ToArray in the middle of a chain rather than at the end. Everything after it is in-memory." },
    { q: "What is deferred execution?", a: "A LINQ query is a recipe, not the food — nothing runs until you enumerate it with foreach, ToList, First or Count. Which also means enumerating it twice can hit the database twice." }
  ]
},

"cs-result-deadlock": {
  script: "Calling .Result or .Wait blocks the current thread until the async work finishes, and that causes three problems. First, deadlock: in classic ASP.NET or a desktop app there is a synchronisation context that wants the continuation to resume on the original thread, and that thread is the one being blocked, so both sides wait forever. ASP.NET Core has no synchronisation context so it usually will not deadlock, but it is still wrong. Second, thread starvation — the thread sits there doing nothing while the I/O completes, and under load the pool runs out, so the app gets slower and slower rather than failing cleanly. Third, the exception is wrapped in an AggregateException, so the real error is a level down and the stack trace is less useful. The fix is to go async all the way up.",
  followups: [
    { q: "What about ConfigureAwait(false)?", a: "In library code it stops the continuation capturing the context, which avoids the deadlock. It is a mitigation though, not permission to block." },
    { q: "Is there anywhere blocking is fine?", a: "The top of a console Main in older C#, where there is no caller to await you. Nowhere inside a web request." }
  ]
},

"cs-string-sb": {
  script: "A string in .NET is immutable, so every time you append to one the runtime creates a brand new string and the old one becomes garbage. Inside a loop over ten thousand rows that is ten thousand allocations and a lot of GC pressure. StringBuilder keeps a single internal character buffer and appends in place, so the cost stays close to linear. The rule I follow is: a handful of concatenations or anything in one expression, use string interpolation because it reads better; anything inside a loop, or building a report or dynamic SQL row by row, use StringBuilder. In Smart Documents the bulk-upload error report is built that way — with plain concatenation a five thousand row file would have been painful.",
  followups: [
    { q: "Why is string immutable at all?", a: "Safety and sharing — strings can be interned and shared freely, used as dictionary keys, and passed between threads without locking, because nobody can change them underneath you." },
    { q: "Is StringBuilder always faster?", a: "No. For two or three concatenations the StringBuilder allocation costs more than it saves. It wins once you are in a loop." }
  ]
},

/* ---------- ASP.NET Core ---------- */
"net-pipeline": {
  script: "Every request walks through a line of middleware components, and each one can inspect the request, pass it on by calling next, and then do more work as the response comes back. I register them in Program.cs with app.Use, and they run in exactly the order I add them, so order matters a great deal. Exception handling goes first so it wraps everything, then HTTPS redirection and static files, then routing, then authentication and then authorization — and that order matters because authentication works out who the user is and authorization needs that to already have happened. Putting UseAuthorization before UseAuthentication is the classic bug: nothing is identified yet so every request looks anonymous. Custom middleware is where I put the correlation id, request logging and the global exception handler.",
  followups: [
    { q: "Middleware versus a filter?", a: "Middleware is lower level and sees only the HttpContext. A filter is MVC-aware — it knows the action and the model — so I use middleware for pipeline-wide concerns and filters when I need to know about the action." },
    { q: "How do you short-circuit?", a: "Just do not call next. app.Run is terminal by definition. That is how things like a maintenance-mode middleware work." }
  ]
},

"net-jwt": {
  script: "A JWT has three parts — a header, a payload of claims, and a signature — base64url encoded and separated by dots. When a user logs in I validate their credentials and issue a token containing their id, role and expiry, signed with a key only the server knows. The client then sends it on every request as an Authorization Bearer header, and the JWT middleware validates the issuer, audience, lifetime and signature, and builds the ClaimsPrincipal that the Authorize attribute works against. The three things worth saying up front: the payload is encoded, not encrypted, so nothing sensitive goes in it; it is stateless, so you cannot revoke it before it expires, which is why access tokens are short-lived with a refresh token; and it must always go over HTTPS.",
  followups: [
    { q: "How do you log a user out then?", a: "You delete the refresh token server-side and drop the access token on the client. The access token stays technically valid until it expires — which is exactly why it is short." },
    { q: "Where do you store it in the browser?", a: "That is the real trade-off. localStorage is readable by any script so XSS exposes it; an HttpOnly cookie is safe from script but needs CSRF protection. Either way the token is short-lived." },
    { q: "JWT or cookie authentication?", a: "Cookies for a server-rendered app — revocable, HttpOnly. JWT for an SPA or API, because it scales without shared session state." }
  ]
},

"net-di-lifetime": {
  script: "There are three. Transient gives you a new instance every single time it is resolved — fine for small stateless services. Scoped gives you one instance per HTTP request, shared by everything in that request, and that is the right lifetime for a DbContext, repositories and unit-of-work services, because everyone in the request then shares the same transaction boundary. Singleton gives you one instance for the whole process, so it must be stateless and thread safe — configuration, caches, HttpClient setup. The mistake to watch for is the captive dependency: injecting a scoped DbContext into a singleton. The singleton holds that DbContext forever, so it ends up shared across requests and threads, and you get concurrency errors and stale data. ASP.NET Core actually throws on that at startup in development.",
  followups: [
    { q: "What lifetime for a background job?", a: "Hangfire jobs run outside an HTTP request, so there is no scope. I create one explicitly inside the job so the DbContext lifetime is still correct." },
    { q: "Why is DbContext scoped and not singleton?", a: "It is not thread safe and it tracks changes. A shared one would mix two users' changes and throw 'a second operation was started on this context'." }
  ]
},

"net-ef-tracking": {
  script: "By default Entity Framework tracks every entity it loads so SaveChanges knows what changed, and that costs memory and CPU. On a read-only screen I turn it off with AsNoTracking, which on a big list makes a real difference. The bigger problem is N+1: you load a list and then touch a navigation property per row, so you get one query for the list and one more for every single row. The fix is either Include to eager load, or better, a projection with Select straight into a DTO, because that generates a narrower SELECT and only fetches the columns the screen shows. I also keep lazy loading switched off, because it is the usual accidental cause of N+1. And paging always happens in SQL with Skip and Take, never in memory.",
  followups: [
    { q: "How did you find an N+1 in practice?", a: "The query count. Logging shows hundreds of near-identical queries for one page load, or the profiler shows the same statement with a different id over and over." },
    { q: "Include or Select?", a: "Select if I only need a few columns — it is less data and no tracking. Include when I genuinely need the whole related entity." }
  ]
},

"net-owasp": {
  script: "The three I dealt with most are SQL injection, XSS and CSRF. SQL injection you prevent by never concatenating user input into SQL — use parameters, or Entity Framework, which parameterises for you, and remember that dynamic SQL inside a stored procedure is still injectable. XSS you prevent by encoding on output: Razor encodes by default, so the risk is Html.Raw, innerHTML in jQuery and dangerouslySetInnerHTML in React. CSRF you prevent with an anti-forgery token on every state-changing form post, plus SameSite cookies — and with a token-based API in an Authorization header, the browser does not send it automatically, which removes most of the risk. I did this at volume: over five hundred findings on a live production system, fixed in batches with regression testing, with no business downtime.",
  followups: [
    { q: "How did you approach five hundred of them?", a: "By pattern, not one at a time. I grouped them — concatenated SQL, unencoded output, missing anti-forgery tokens, missing authorisation checks — and fixed each class across the codebase, then made the patterns part of our review checklist so they stopped coming back." },
    { q: "What else is in the OWASP top ten that you hit?", a: "Broken access control — endpoints that checked you were logged in but not that the record was yours. And security misconfiguration: stack traces returned to the user and plain-text connection strings in config." }
  ]
},

/* ---------- SQL ---------- */
"sql-index": {
  script: "An index is like the index at the back of a book — without one SQL Server has to read every row to find yours. A clustered index defines the physical order of the rows, so there is only one per table and it is usually the primary key; its leaf level is the actual data. A non-clustered index is a separate structure holding the key columns plus a pointer back to the row, and you can have many. The thing to mention is the key lookup: if a non-clustered index finds the row but the query needs columns it does not hold, it has to jump back to the table for each one — and adding those columns with INCLUDE makes it a covering index and removes that. The cost is that every index speeds reads and slows inserts and updates, so I index what the WHERE, JOIN and ORDER BY clauses actually use, not every column.",
  followups: [
    { q: "How do you decide the column order in a composite index?", a: "The leading column must be the one you filter on. An index on VendorId, Status helps a search by VendorId, and does not help a search by Status alone." },
    { q: "How do you know an index is being used?", a: "The execution plan — a seek rather than a scan on that index — and the logical reads dropping in STATISTICS IO. I check before and after rather than assuming." }
  ]
},

"sql-slow-query": {
  script: "The first thing I do is get the actual execution plan, not guess. I look for scans where a seek should be, key lookups, and the fat arrows that show where the row counts explode. Then I check the WHERE clause is SARGable — a function wrapped around an indexed column, like YEAR on a date, kills the seek, and so does a leading wildcard or an implicit type conversion. Next I make it return less: name the columns instead of SELECT star, page with OFFSET FETCH, and filter before joining. Then indexes — add or fix the covering index and check the statistics are current. After that I would look at rewriting a cursor or correlated subquery as a set-based join or window function. And if it is only slow sometimes, I suspect blocking or parameter sniffing.",
  followups: [
    { q: "Give me a real example.", a: "On the purchase order screens it was the same three things every time: a date function applied to an indexed column, SELECT star feeding a grid that showed eight columns, and a missing covering index on the filter columns. Those screens went to sub-second." },
    { q: "It was fine yesterday and slow today — what changed?", a: "Most often statistics went stale after a bulk load, so the plan was built for the wrong row count. That is why I compare estimated against actual rows in the plan before I start adding indexes." }
  ]
},

"sql-transaction": {
  script: "A transaction is all or nothing — either every statement in it succeeds and commits, or one fails and the whole thing rolls back. ACID stands for atomicity, consistency, isolation and durability: atomic means all or nothing, consistent means the constraints still hold afterwards, isolated means concurrent transactions do not corrupt each other, and durable means a committed change survives a crash. The practical part is isolation levels — read committed is the default and stops dirty reads; read uncommitted, which is what NOLOCK gives you, allows them and I do not use it on anything financial; and read committed snapshot lets readers see a consistent version without blocking writers, which is usually the right answer to blocking. The rules I follow are keep transactions short, never wait for user input inside one, and always pair try-catch with a rollback.",
  followups: [
    { q: "Where do you set the transaction boundary in code?", a: "In the service layer, not the controller and not the repository — that is the layer that knows the unit of work. With EF Core a single SaveChangesAsync is already one transaction." },
    { q: "What happens on a deadlock?", a: "SQL Server picks a victim and rolls it back with error 1205. The operation needs to be retry-safe, and I prevent most of them by accessing tables in the same order everywhere and keeping transactions short." }
  ]
},

"sql-joins": {
  script: "An inner join returns only the rows that match in both tables. A left outer join returns everything from the left table and fills the right side with NULLs where there is no match — and that is the one I use to find missing data, by adding WHERE the right side IS NULL. A right join is the mirror of that and people usually rewrite it as a left. A full outer join gives you everything from both sides, which is useful for reconciliation. A cross join is a Cartesian product, every row paired with every row, which is deliberate for something like a calendar and accidental when you forget the join condition. And a self join is a table joined to itself, for hierarchies like employee to manager. The classic trap is putting a condition on the right table in the WHERE clause of a left join — that quietly turns it back into an inner join, because the NULL rows fail the test. It belongs in the ON clause.",
  followups: [
    { q: "Where have you used a full outer join?", a: "Reconciling our documents against the SAP-synced table — it shows what exists on one side and not the other, in both directions, which is exactly what a reconciliation report needs." },
    { q: "Does join order matter for performance?", a: "Not the order you write them in — the optimiser decides. What matters is having indexes on the join columns and filtering early." }
  ]
},

"sql-deadlock": {
  script: "A deadlock is when two transactions each hold a lock the other one needs, so neither can move. Blocking is normal and temporary — one waits for the other — but a deadlock is a cycle that cannot resolve itself, so SQL Server picks one as the victim, rolls it back and returns error 1205. The main cause is accessing tables in a different order in two places: one procedure updates A then B while another updates B then A. So the fixes are: access tables in the same order everywhere, keep transactions short, make sure the UPDATE and DELETE filters are indexed because a scan locks far more rows than a seek, and consider read committed snapshot to remove reader-writer contention. And the operations that can legitimately collide should retry on 1205 rather than failing the user.",
  followups: [
    { q: "How do you diagnose one?", a: "The deadlock graph from Extended Events or the system health session — it shows exactly which two resources were held and which statements were involved." },
    { q: "Where did you hit this?", a: "Concurrent posting against the same stock and document tables from the UI and the SAP sync jobs. We ordered the updates consistently, tightened the transaction scope, and made the sync handlers retry-safe." }
  ]
},

/* ---------- ADO.NET ---------- */
"ado-what": {
  script: "ADO.NET is the data access layer built into .NET — System.Data and the SQL Server client. It gives you a direct connection to the database: you open a connection, give it a command, and read the result with a data reader. There is no mapping, no change tracking and no query translation, so there is no overhead and no surprises — the SQL that runs is exactly the SQL I wrote. Everything else sits on top of it: Entity Framework and Dapper both use ADO.NET underneath, they just add mapping and, in EF's case, LINQ translation and change tracking. In our platform we use both — EF Core for the entity CRUD, and ADO.NET for the heavy report queries where I want to control the exact execution plan.",
  followups: [
    { q: "Why not use EF everywhere?", a: "For the tuned reports I want the SQL and the plan I tested in SSMS, not whatever the ORM generates. On the Vendor Portal that is three repositories — account statement, outstanding and payment reports — and EF everywhere else." },
    { q: "What are the main objects?", a: "SqlConnection, SqlCommand, SqlDataReader, SqlDataAdapter and DataSet, plus SqlParameter and SqlTransaction." }
  ]
},

/* ---------- React ---------- */
"re-props-state": {
  script: "Props are the read-only inputs a component receives from its parent, and state is data the component owns and can change. Data flows one way — down through props — which is what makes the UI predictable, because you can always trace where a value came from. When a component changes its own state with the setter from useState, React re-renders it. If two sibling components need the same value, I lift that state up to their closest common parent and pass it down as props, with a callback prop so the child can ask for it to change. The rule I never break is that state updates are immutable — I replace the object or array rather than mutating it, because React compares references and mutating in place means it may not see a change at all.",
  followups: [
    { q: "Why does mutating state not work?", a: "React compares the old and new values by reference. Pushing to an array leaves the reference identical, so a memoised component sees no change and does not re-render." },
    { q: "When do you reach for Context instead?", a: "When something genuinely global — the logged-in user, roles, theme — is being passed through levels that do not use it. Not for screen state." }
  ]
},

"re-useeffect": {
  script: "useEffect runs code after the render — fetching data, subscribing, setting a timer. The dependency array controls when it runs again: no array at all means after every render, which is almost always a bug; an empty array means once after mount; and listing a value means whenever that value changes. The function you return from it is the cleanup, and it runs before the next effect and on unmount — so that is where I cancel timers, unsubscribe, and abort in-flight requests. The two problems to watch for are an infinite loop, when the effect sets state that is also in its dependency array, and a stale closure, when you leave a dependency out so the effect keeps using values from the first render. And you cannot pass an async function directly — you declare one inside and call it.",
  followups: [
    { q: "How do you fetch data in it properly?", a: "Declare an async function inside, keep loading, data and error state, pass an AbortController signal, and abort in the cleanup so a slow response cannot set state on a screen the user already left." },
    { q: "Why does my effect run twice in development?", a: "React 18 StrictMode mounts, unmounts and remounts components in development on purpose, to surface effects that are missing a cleanup. It does not happen in production." }
  ]
},

"prj-all": {
  script: "I have worked on five products at Spark IT Tech, and I will give you one line each rather than talk for ten minutes. The Vendor Portal is a .NET 8 self-service portal for suppliers — they log in, see their own purchase orders, invoices and payment status, and watch approvals move. SCM Data Exchange is the .NET 8 integration service between our systems and SAP Business One. Smart Documents is the accounts-payable document system on MVC 5, and that is where the security remediation work happened. The Work Flow Engine is our common approval engine, which I pulled out of its own UI so several applications can call it. And SparkBI is the reporting product. So two on .NET 8 and three on MVC 5. Which of those would be most useful to go into?"
},

"prj-vendor-portal": {
  script: "The Vendor Portal is the one I know best, so I will take that. The problem was that all vendor communication ran on email — buyers re-sending purchase orders, finance answering the same payment questions, no single source of truth. Now a supplier logs in and sees their own documents, submits their registration, uploads papers and watches approvals move. Behind it is an ASP.NET Core 8 Web API, versioned and Swagger-documented, secured with JWT where the vendor code travels as a claim. The business rules sit in a service layer, so the controllers hold none. EF Core 8 for the entity work, and tuned stored procedures through ADO.NET for the heavy statement and outstanding-payment screens. Hangfire runs the background jobs and a SignalR hub pushes progress back to the browser. It is hosted on IIS. I built the front end, designed and secured the API, designed the schema and tuned the T-SQL, and I lead that module."
},

"prj-smart-documents": {
  script: "Smart Documents is our accounts-payable document system — invoices, receipts, the approval trail on each one. The interesting part is that it is configurable. Before, every new document type meant a code change, a test cycle and a release. So there is an abstract base document holding the shared audit and header behaviour, and each type supplies its own validation through an interface. The engine resolves the right handler by type code and never references a concrete class. That is Open/Closed with Factory and Strategy doing the work, and it means a new document type goes live without touching the engine. It is MVC 5 with Entity Framework 6 and ADO.NET, DevExtreme grids, and it integrates with SAP Business One for vendor and invoice master data. I also cut database round trips by about half on it, mostly by removing per-row queries and returning several result sets from one procedure."
},

"prj-sap-sync": {
  script: "Our system and SAP Business One both hold the same vendors, items and invoices, and before this someone reconciled them by hand. I built the service that keeps them in step, in near real time, both directions. The design decision that matters is that it is asynchronous. The user saves locally and the document posts to SAP in the background, because SAP being briefly unavailable must never stop someone saving an invoice. That makes it eventually consistent, which is a deliberate trade, so the reliability work is the real content. Hangfire owns the jobs and its storage is in SQL Server, so a queued job survives an app pool recycle. The handlers are idempotent, keyed on the document id, so a retry cannot post the same invoice twice. There is retry with backoff, an alert when something keeps failing, and a reconciliation query that lists anything which never made it across."
},

"prj-data-exchange": {
  script: "SCM Data Exchange is a standalone .NET 8 service — it is the single door between our systems and SAP Business One. The endpoints are the integration surface: business partners, purchase indents, goods receipt notes, supplier allocation, and project tasks. It is EF Core 9, JWT bearer authentication, Swashbuckle with the bearer scheme documented so a consumer can test from Swagger, and Serilog shipping to Seq so the logs are searchable. It is its own service because it has different availability and scheduling needs from the UI — the portal has to stay up for users even when SAP is down. Two honest notes on it: the code is mostly synchronous, which is the first thing I would change, and there is a Dockerfile in the repository but it is deployed to IIS, so I have not run it as a container in production."
},

"prj-workflow-engine": {
  script: "The Work Flow Engine is our common approval engine. The problem was that approval logic — who signs off, in what order, what happens on a reject — had been written again inside every module that needed it. Three implementations, three sets of bugs, and one rule change meant three code changes. So I separated the engine from its own UI and exposed it over a Web API with CORS, and now more than one application drives the same approval logic. It is MVC 5 with Entity Framework 6.1.3, a Hangfire job moving document transactions, Elmah for error logging and a separate audit logger so every approval action is traceable. I will be straight that it is synchronous code — no async in that one — which is fine for its load. The reason it was worth separating is that it had more than one consumer, and that is the test I apply before extracting anything."
},

"prj-bi-reporting": {
  script: "SparkBI is our reporting product, and the shape is what makes it interesting. There are three consumers of the same figures — the web UI people browse reports in, a data API other systems call, and a scheduler that emails reports out on a timetable. All three have to return identical numbers. So the data access is one reusable helper rather than three copies of connection-and-command code, and the reports themselves are tuned stored procedures. That helper owns the connection, the typed parameters and the disposal, which is exactly why none of the three leaks connections. One detail I would mention: the connection string is not stored in plain text in the deployed config — the application decrypts it at startup, because a plain-text connection string is an audit finding in its own right."
},

"prj-procurement": {
  script: "The procurement and supply chain side is the multi-module enterprise application the operations team lives in all day — raising purchase orders, receiving goods, tracking inventory, and the approvals over all of it. It is C# on ASP.NET MVC 5 with a RESTful Web API layer, Entity Framework for the entity work and tuned T-SQL stored procedures for the heavy screens, SQL Server underneath, and a server-rendered UI in jQuery and Bootstrap with AJAX grids, cascading dropdowns and modal forms. I was Technical Lead on the module — the task breakdown, estimation, design discussions, code reviews and mentoring — and I did the index tuning that brought the high-traffic screens to sub-second. And if you ask why it is still MVC rather than React: it works, it is maintained, and rewriting a working high-volume module would be risk without benefit. New modules go on .NET 8; that one gets extended and hardened."
},

"prj-services-split": {
  script: "I will answer that precisely, because the word gets stretched. I have done two genuine service splits. The workflow engine was separated from its own UI and is consumed over a Web API, so several applications drive the same approval logic instead of each one re-implementing it. And the data exchange service runs on its own with its own API contract and DTOs, because it has different availability and scheduling needs from the UI. What I would not claim is that the estate is microservices. Those services do not have separate databases, separate deployment pipelines or separate teams — so it is service-oriented design inside a monolith, and that is the honest description. I know the patterns, API gateway, service discovery, saga, eventual consistency, and I have read them properly, but I have not run them in production and I would not pretend otherwise."
},

"prj-request-flow": {
  script: "Take a vendor saving an invoice. In the browser the form validates on the client, the submit button disables so a double click cannot post twice, and the AJAX call sends JSON with the JWT in the Authorization header. It goes over HTTPS to the API. The middleware pipeline runs — exception handler, HTTPS redirection, routing, CORS, then authentication where the token is validated and the claims principal is built, then authorization. Model binding turns the JSON into my DTO and the data annotations run; a failure returns a 400 with field errors the form maps straight back onto its inputs. The controller is thin and calls the service. The service holds the business rules plus the ownership check that the record belongs to the vendor code on the user's claims. Then one transaction writes the header, the lines, the balance update and the audit row — all of it or none of it. A Hangfire job is queued to post it to SAP so the user is not made to wait, and the response comes back as a 201. If anything throws, the global handler logs it with a correlation id and returns a clean message, never a stack trace."
},

"prj-db-design": {
  script: "I start from the documents rather than the screens. A purchase order is a header and lines, and that shape drives the tables. The transactional tables go to third normal form, so a vendor, an item and a tax code live once and are referenced by key — a vendor address change does not have to be chased through ten thousand rows. Where I denormalise, it is deliberate and it is for two reasons: reporting speed, and history. Storing the vendor name on the document means the report does not join five tables per row, and more importantly the invoice keeps the name it was actually raised against. Every table has an integer surrogate primary key plus a unique constraint on the real business key, declared foreign keys, and the audit columns — created by, created on, modified by, modified on, and an active flag, because a deleted purchase order still has to appear in last year's report. Indexes I add after reading the execution plan, not upfront."
},

"prj-improve": {
  script: "Four things, and they are real rather than modest-sounding. First, automated tests. There is no suite. The design is testable — repositories behind interfaces, constructor injection — but the tests were never written and regressions were caught by manual QA. I would start with unit tests on the business rules and integration tests on the critical endpoints. Second, async all the way. The .NET 8 work is async but the older MVC 5 code and the workflow engine are fully synchronous, and under real concurrency that holds threads for no reason. Third, a caching layer. Master data — vendors, items, tax codes — is read on nearly every request and changes rarely, and I never got to it. Fourth, secrets. One application encrypts its connection string and the others do not; that should have been consistent from the start. And one design regret: the services I pulled out still share a database with their callers, which is what stops them being genuinely independent."
},

"prj-decision": {
  script: "The one I would pick is making the SAP integration asynchronous rather than posting inside the user's save. The simpler alternative is to post to SAP in the same request, and it does give the user an immediate confirmation that both systems agree. I did not do that because it couples our uptime to theirs — if SAP is slow every save is slow, and if SAP is down nobody can raise an invoice. A maintenance window on their side becomes an outage on ours. The cost of my choice, and I think naming the cost is the point, is that the two systems are eventually consistent: for a short window our database says the invoice exists and SAP does not. So the design has to carry that. Every document shows a sync status, the handlers are idempotent so a retry cannot double-post, there is retry with backoff and an alert, and a reconciliation query lists anything that never made it across. I would rather have a system that stays up and tells you what has not synced than one that is always consistent and sometimes refuses to work."
},

"prj-release": {
  script: "Releases go out in a planned off-peak window, and nothing reaches production that has not been rehearsed somewhere else first. The order matters: database scripts first, application second. I generate the migration script rather than letting EF run itself against production, and I read it — because EF will happily script a drop-and-recreate for what is really a column rename and take the data with it. There is a tested rollback script ready before we start, not written afterwards. After the deployment there is a validation pass on the critical paths, and I watch the logs for the first hour. If something is wrong, the decision is rollback first and diagnose afterwards, because the business being down while you debug is the wrong trade. We deploy to IIS on Windows Server, with Git and Azure DevOps holding the work items."
},

"prj-draw": {
  script: "Let me draw it top to bottom in the order a request travels. At the top the client — Razor with jQuery and Bootstrap across most of it, plus the React feature screens in the Vendor Portal. Below that the API layer: ASP.NET Core 8, versioned, Swagger, and the JWT validated here. Below that the service layer, and I would say out loud that the controllers hold no business rules. Below that data access, and I would draw two boxes because the split is a decision I made — EF Core for entity work, ADO.NET with stored procedures for the tuned reports. Then SQL Server. And off to the side, Hangfire jobs going out to SAP, a SignalR hub pushing back to the browser, and IIS on Windows Server underneath all of it. Then let me trace one real request through it — a vendor opening their purchase order list — so you can see I have actually worked in it."
},

"prj-users": {
  script: "Three roles use it day to day. The vendor is the external user — they log in to see their own purchase orders, invoices and payment status, submit their registration and upload documents. Before the portal they were emailing our buyers to ask where an invoice was. The buyer is internal — they raise purchase orders, chase deliveries, and resolve the queries that used to come in by email. And the approver signs off, usually by value band, and that is what the workflow engine routes. Then there is finance, who care about the outstanding and statement screens, which are the heaviest queries in the system and the reason those particular screens are tuned stored procedures rather than EF. The business value is simple: the follow-up that used to happen over email now happens in one place with an audit trail on it."
},

/* ---------- Scenario rounds ----------
   The answer field on each of these is notes — headings and a numbered
   order, which is right for revising and wrong for speaking. Nobody
   says "firstly, comma, bold heading" out loud. This is the same
   judgement said the way a person says it: one breath, no list, and
   the trade-off named rather than bulleted.

   Kept to roughly a minute. A scenario answer earns more room than a
   definition does, but past about ninety seconds you are monologuing
   and the interviewer stops hearing the good part. */

"scn-slow-prod": {
  script: "The first thing I would do is nothing to the code. Something was fast and now it is not, so I want to know what changed before I change anything myself. So I ask when it started, whether it is everyone or one user, and whether it is that screen or the whole application — intermittent and user-specific usually points at parameter sniffing or blocking, constant and global at a release or at the data having simply grown. Then I check what shipped around that date, and honestly that answers it more often than anything clever does. If it is still open I find out where the time is going, database or application, which the logs with a correlation id settle in minutes. If it is the database I pull the actual plan and compare estimated rows against actual. If it is the application it is usually an N plus one, a missing AsNoTracking, or something pulling the whole table back and filtering in memory. On our procurement screens it was nearly always a date function wrapped around an indexed column killing the seek, or a SELECT star feeding a grid that showed eight columns. Then I measure the same way again, because that is the only way to prove the fix was the fix.",
  followups: [
    { q: "What if nothing changed in the code?", a: "Then it is the data or the plan — row growth, stale statistics, or parameter sniffing giving a plan built for a different parameter. Updating statistics or OPTION RECOMPILE on that one query tells you quickly which." },
    { q: "Would you restart the server?", a: "Only to restore service if the business is stopped, and I would say plainly it is a workaround. It clears the plan cache, so it often fixes it and destroys the evidence at the same time." },
    { q: "How do you catch it earlier next time?", a: "Slow-query logging with a threshold and timing around the external calls. A page crossing a limit should show up on a dashboard, not in a phone call from a user." }
  ]
},

"scn-ten-million": {
  script: "Before I touch an index I ask what the user actually does with that screen, because very often they only ever look at the last ninety days, and then the fix is a default date filter rather than anything technical. If the query is genuinely needed, I work in order. First, return less — page it in SQL, name the columns instead of SELECT star, filter before joining. Most slow screens are slow because they ask for far more than a person can read. Second, index what I am filtering on, a covering index over the WHERE and JOIN and ORDER BY columns, and I check the plan turned the scan into a seek rather than assuming it did. Third, make the predicate SARGable — no function wrapped around the indexed column, no leading wildcard, no implicit conversion. After that it is rewriting cursors set-based, pre-aggregating anything recomputed on every page load, and archiving, which nobody thinks of and is often the biggest single win. Hardware is last. On the procurement modules it was the first three that got those screens under a second — server-side paging, explicit columns, covering indexes on vendor, status and date.",
  followups: [
    { q: "What about partitioning?", a: "Real, but heavier, and not a performance feature on its own. It earns its place when the data slices naturally by date and you want to switch partitions in and out for archiving." },
    { q: "Would you add an index for every slow query?", a: "No. Every index costs you on write and in storage, and a near-duplicate of an existing one is usually worse than extending that one. I check what is already there first." },
    { q: "How do you know the index helped?", a: "The plan and the logical reads, before and after. Wall-clock time on its own lies to you because of caching." }
  ]
},

"scn-concurrent-edit": {
  script: "By default the second save quietly wins and the first user's changes disappear with nobody told — the lost update problem. The standard fix is optimistic concurrency: a rowversion column on the table, sent to the client with the record and included in the WHERE clause of the update. If zero rows come back, someone changed that row since I read it, and EF Core raises a DbUpdateConcurrencyException. But the part they are really asking about is what happens next, and that is a business decision rather than a technical one. You either reject and make them reload, which is what I would do for anything financial or already approved; or show both versions and let them merge, which is the nicest experience and the most work; or let the last write win, which is fine for low-value fields as long as somebody decided that and it is not an accident. What I would not do in a web application is lock the row while the screen is open, because the user goes to lunch with it locked. For counters and stock it is a different fix — one atomic statement with a guard in the WHERE clause, so there is no window between reading and writing. That is what we do on stock movement, so two concurrent posts cannot drive stock negative.",
  followups: [
    { q: "Optimistic or pessimistic?", a: "Optimistic for anything a user has open on screen. Pessimistic only for a short server-side critical section, where I hold the lock for milliseconds and never across a user's thinking time." },
    { q: "What does the user see?", a: "Not a raw exception. A clear message that someone else changed the record, with a reload, and where it matters, which fields differ." },
    { q: "Does a transaction solve it?", a: "No, and that is a common mix-up. A transaction protects one unit of work; this is two separate requests minutes apart. The version check is what spans them." }
  ]
},

"scn-bad-deploy": {
  script: "Service first, diagnosis second — and I would say that out loud, because doing those two in the wrong order is how an hour becomes a day. So first the blast radius, whether it is everyone or one module and whether any data has been damaged, and I tell the business within minutes rather than waiting for them to ring me. Then I roll back: the previous build goes back on and the rollback script runs if the release had database changes. That script is tested before the release goes out, not written during the incident. The thing to watch is the one-way door — if a migration dropped a column or transformed data, rolling back is not clean, which is why destructive changes get staged across releases: add the new thing, migrate, ship the code that uses it, drop the old one a release later. Once it is stable I diagnose, with the logs around the deployment time and the diff of what actually shipped. Then the uncomfortable question, which is why UAT did not catch it, and the answer is almost always data — UAT had fifty rows and production has five million. I write it up blameless but specific. Naming a person fixes nothing.",
  followups: [
    { q: "What if you cannot roll back?", a: "Then it is a fix forward under pressure, which is the worst place to be, so I shrink the blast radius first — disable the feature or the screen if I can, and get the business on a workaround while I fix it." },
    { q: "How do you avoid it next time?", a: "Stage against a production-sized copy, and add a post-deployment validation pass. Ours checks the app responds, the database connects and the jobs are running, and it has caught things while users were still asleep." },
    { q: "Who decides to roll back?", a: "I make the recommendation with the facts and the business owner calls it — but for a total outage I would not wait for a meeting to start the rollback." }
  ]
},

"scn-data-leak": {
  script: "I treat it as a security incident from the first minute, and I do not start by arguing about whether the user is mistaken. So first I capture the evidence before anything is cleared — the screenshot, the URL, who and when — and then decide whether to take that screen down while I investigate, because exposed data is worse than a missing feature. Then the cause, and it is nearly always broken object-level authorisation: an endpoint filtering by an id that came from the request instead of from the user's identity, so changing the number in the URL gives you somebody else's record. The fix is to filter by a value from the token or the claims and never from the request, plus an explicit ownership check on every endpoint that takes a record id — an Authorize attribute proves who you are, only the ownership check proves the record is yours. Then I scope it from the logs, how long it was possible and who accessed what, because that decides whether this is a bug fix or something that has to be disclosed. Then I sweep every other endpoint, because if one had it others will. That was exactly the pattern in our security remediation, and it is why the Vendor Portal carries the vendor code as a claim now.",
  followups: [
    { q: "How soon do you tell people?", a: "The business and whoever owns compliance the same day, before it is fixed rather than after. Whether it is reportable is their call and they need the facts early." },
    { q: "How do you stop it recurring?", a: "Make it structural rather than remembered — the ownership filter lives in the repository or a base query, so a new endpoint gets it by default instead of relying on the next developer." },
    { q: "What if the logs cannot tell you the scope?", a: "Then I say so plainly. Assuming the smallest scope because you cannot see further is how an incident becomes a bigger one." }
  ]
},

"scn-add-column": {
  script: "The fact the question is testing is that adding a nullable column with no default is a metadata-only change in SQL Server — it completes instantly whether the table has fifty rows or fifty million. What is not instant is NOT NULL with a default on older versions, or anything that rewrites every page, because that takes a schema modification lock and blocks the table. So I use expand and contract across more than one release. Expand first: add the column nullable and deploy that on its own. Then backfill in batches, a few thousand rows at a time with a small delay, so the transaction log does not explode and other users are not blocked — never one UPDATE across fifty million rows, because that is how a ten-minute deployment turns into a blocked database. Then deploy the code that writes the new column while still tolerating nulls. And only then, once everything is populated and nothing writes null, contract: add the NOT NULL constraint and the index, built ONLINE if the edition supports it. Every step gets a rollback script, and that last one gets the most attention because it is the painful one to undo.",
  followups: [
    { q: "Why not do it in one release?", a: "Because the application and the schema go out at slightly different moments, and for that gap one of them is wrong. Staging it means every intermediate state is valid." },
    { q: "How big should the batch be?", a: "Small enough that each commits quickly — a few thousand is a reasonable start. I watch the log growth and the blocking and tune from there rather than picking a number and hoping." },
    { q: "What about adding a default?", a: "On SQL Server 2012 Enterprise and later a NOT NULL with a constant default is also metadata-only, but I would not rely on that across versions and editions. Nullable then backfill works everywhere." }
  ]
},

"scn-failing-job": {
  script: "There are three separate problems in that sentence. The first is the data gap, because a week of work did not happen — so I write a reconciliation query between the two sides to find exactly what is missing, then decide whether to replay it. Replaying is only safe if the handler is idempotent, and if it is not then making it idempotent is the first thing I fix, otherwise I have just double-posted a week of records. The second is the job itself, which is usually a change at the other end, an expired credential, a schema change, or an unhandled exception inside a loop that killed the whole run instead of skipping one bad row. The third is the silence, and that is the actual defect. A job that fails loudly is an incident; one that fails quietly is a week of missing data. So it needs failure alerting and a heartbeat — alert when it has not succeeded recently, not only when it throws, because a job that stops being scheduled never throws at all. That is why our SAP sync carries retry with alerting and a dashboard rather than retrying quietly in the dark.",
  followups: [
    { q: "How do you make a handler idempotent?", a: "A natural key or a message id checked before the work happens, so processing the same item twice is a no-op. Without that, retry is a liability rather than a safety net." },
    { q: "Catch per record or per batch?", a: "Per record. One malformed row should not stop the other nine hundred and ninety nine — it should land on an exception report and the rest should go through." },
    { q: "Would you replay a week automatically?", a: "Not blindly. I reconcile first, show the business what is missing, and replay in batches with the counts checked. An automatic replay of something you have not measured is how you make it worse." }
  ]
},

"scn-legacy-refactor": {
  script: "I would not rewrite it, and I would say that first, because a big-bang rewrite of code that has survived years in production is how you reintroduce every bug it quietly handles. The weird branch you want to delete is usually there for a real customer. So I start by understanding what it actually does for the business. Then I get a safety net, and with no unit tests that means characterisation tests on just the paths I am about to touch, or at minimum a written manual test script with a known-good output to compare against. Then I refactor only what I am already touching — the boy-scout rule — pulling the method I need into a service with the data access behind an interface, and leaving the rest alone. Moving in layers does the real work: business logic out of the controller into a service, SQL out of the service into a repository, and that alone turns an untestable class into a testable one. And I ship it in small reviewable pieces rather than one three-thousand-line pull request nobody can honestly review. The closest real version I have done was Smart Documents — sixty-five review findings across thirty-seven files, roughly halving the database round-trips, in batches with regression testing between them rather than as one rewrite.",
  followups: [
    { q: "How do you get time for it?", a: "I do not ask for a three-week cleanup, because that is a hard sell and it stops feature work. It rides along with the features that touch that code, which also spreads the risk." },
    { q: "What if it has no seams at all?", a: "Then the first change is to create one — extract an interface, or wrap the dependency, purely so a test can get in. That first seam is usually the hardest single step." },
    { q: "When would you rewrite?", a: "When the platform is genuinely dead or it cannot meet a hard requirement like security or compliance. Even then I would strangle it piece by piece rather than switch over in one night." }
  ]
},

"scn-impossible-deadline": {
  script: "I would not say yes, and I would not just say no either. Agreeing to a date I do not believe buys two calm days and then a far worse conversation with the trust gone. What I actually do is break it down and show them the breakdown, because people argue with an estimate but they engage with a task list, and quite often they look at it and find half of it is not needed. Then I find out what the real deadline is for — a demo, a go-live, a compliance date — because a demo needs the happy path working and a go-live needs the error handling too, and those are very different pieces of work. Then I offer options rather than a refusal: in two days you can have this working end to end, with these two following next week. A phased delivery is usually acceptable, because something working beats everything promised. And if they want all of it, I name the trade plainly and put it in writing — what gets cut is testing, error handling or security hardening, and that debt is paid back later with interest. I would rather have an uncomfortable conversation on day one than an undeliverable promise on day fourteen.",
  followups: [
    { q: "What if they insist anyway?", a: "Then it escalates with facts rather than feelings — the breakdown, the options and the risks go to the lead or the manager, and the decision is theirs to make with their eyes open." },
    { q: "Would you work the weekend?", a: "Occasionally, for something genuinely exceptional. Not as the standing answer, because a team that is always rescuing the plan stops being able to." },
    { q: "How do you estimate better?", a: "Break to tasks small enough to be sure about, add what people forget — testing, review, deployment, fixes — and give a range rather than a single number, because a single number gets heard as a promise." }
  ]
},

"scn-flaky-integration": {
  script: "I design on the assumption that it will fail, and the goal is that its failure does not become mine. So first, a timeout on every call, always — a call with no timeout holds a thread and a connection, and under load that is how one slow dependency takes your whole application down with it. Then retry with backoff and jitter, but only for transient faults, capped, and only where repeating is safe, because retrying a payment that actually succeeded is worse than failing. Then a circuit breaker, so after a run of failures I fail fast for a cooling period instead of queueing threads against something clearly dead — in .NET that is a few lines with Polly or the standard resilience handler. But the big one is getting it off the request path entirely. If the call does not have to happen while the user waits, I queue it and do it in the background, and then their outage is my delay instead of my outage. Our SAP integration is exactly that — documents post asynchronously through Hangfire with retry and alerting, so a SAP outage delays the sync and never stops someone saving. When SAP comes back the queue drains on its own.",
  followups: [
    { q: "What do you tell the user?", a: "That it is saved and the sync is pending, with a visible status on the document. Not a spinner and not a lie — if they can see the state they stop ringing to ask." },
    { q: "How many retries?", a: "A small number with growing gaps, three to five, then stop and alert. Retrying forever hides the problem and keeps load on something already struggling." },
    { q: "Is a circuit breaker not just hiding failures?", a: "It makes them fast and visible instead of slow and hidden. The alternative is every request waiting thirty seconds to fail, which is how one dead dependency exhausts your thread pool." }
  ]
},

"scn-memory-leak": {
  script: "First I would check it is actually a leak rather than a cache behaving normally or the collector not being under enough pressure to bother yet — a leak is memory that grows and never comes back down after the load stops. Then I measure instead of guessing, because guessing at this costs you a day: a dump taken at a high point, or a profiler, then compare two snapshots an hour apart and look at what grew. In a .NET web application the usual suspects are a static collection that only ever gets added to, typically a cache with no expiry and no bound; event handlers never unsubscribed, so the publisher keeps the subscriber alive forever; disposables never disposed, especially connections and streams, or an HttpClient created per request, which also exhausts sockets; a captive dependency where something scoped got captured by a singleton; and large object heap pressure from report or file processing. The fix is nearly always bounds — expiry and a size limit on caches, using blocks on everything disposable, unsubscribing, and streaming large files rather than buffering them. Recycling the app pool on a schedule hides it, it does not fix it. In our data layer every connection, command and reader sits inside a using block, which is what prevents most of this in the first place.",
  followups: [
    { q: "How do you take a dump on production?", a: "Procdump on the worker process, at a high point rather than after a recycle, and analyse it off the box. It is a short pause, so I would agree the window with the business first." },
    { q: "Is it always a leak?", a: "No. Sometimes it is the server having plenty of memory and the collector having no reason to run. The tell is whether it ever comes back down and whether the pool actually recycles." },
    { q: "How does a captive dependency happen?", a: "Injecting a scoped service like a DbContext into a singleton. The singleton holds it for the life of the process, so it leaks and gets shared across threads. ASP.NET Core throws on that at startup in development." }
  ]
},

"scn-report-timeout": {
  script: "The first question is what they actually need, because people ask for an export of everything when what they want is a total and a top ten, and that conversation sometimes ends the problem entirely. If it genuinely needs that data, I try to make it fast enough to run live — plan, covering indexes, SARGable predicates, a set-based rewrite, only the columns needed. A report that goes from ninety seconds to three can stay on the screen. If it genuinely cannot, then it should stop running while a user waits with a spinner. Pre-aggregating is usually the answer, a summary table refreshed nightly or hourly, and the key question for the business is how stale it is allowed to be, because most reporting figures do not need to be to the second. Otherwise run it asynchronously — the user asks for it, a background job builds it, and they get a link when it is ready, and the command timeout can be generous there because nobody is sat waiting. What I would not do is set CommandTimeout to zero on a user-facing request and call it fixed; the user left long ago and all you have done is hold a connection open. Our statement and outstanding screens are the make-it-fast branch — tuned stored procedures through ADO.NET rather than the ORM, because those are the screens where I want the plan to be mine.",
  followups: [
    { q: "Nightly summary or indexed view?", a: "Indexed view when the aggregate is simple and must be current, because the engine maintains it — at a write cost. A scheduled summary table when the logic is complex or the write cost matters more than freshness." },
    { q: "How do you deliver an async report?", a: "A job builds it, writes the file to storage, and the user gets a link. I keep it for a defined period and I do not email a large attachment, because mail servers reject them and it is a copy you no longer control." },
    { q: "What if they want it live and it cannot be?", a: "I show them the numbers — what it costs and what it does to everyone else on the system — and offer the staleness trade. It is a business decision once they can see the price." }
  ]
},

"scn-data-migration": {
  script: "What goes wrong with migrations is not the code, it is discovering the data during the cutover. So I profile the source first — row counts, duplicates, missing and bad values, encoding, and the fields nobody documented. Five-year-old data is always worse than anyone expects. Then I map the fields explicitly, including what happens to values with no home in the new schema, and I get the business to sign that mapping, because those are their decisions and not mine. Then I load into staging tables rather than straight into live, validate there set-based, and produce an exception report of what could not be mapped. Then I reconcile with actual numbers — row counts per entity, control totals on money and quantity columns, spot checks the business will recognise — because it ran without errors is not evidence that it is correct. I rehearse the whole thing on a production-sized copy and time it, and that timing tells me whether it fits the cutover window at all. I make it restartable and idempotent, batched with a processed marker, so a failure at eighty per cent resumes rather than starting again. And afterwards I keep the source read-only for a while, because somebody will eventually ask a question only the old data can answer.",
  followups: [
    { q: "How long do you run both systems?", a: "If the business can afford a parallel run, long enough to cover a full cycle — a month-end for finance data — comparing the two. If not, a longer validation window immediately after cutover." },
    { q: "What about data that will not map?", a: "It goes on an exception report and the business decides: fix it at source, accept a default, or leave it behind with a note. I never invent a value to make the count balance." },
    { q: "How do you handle the downtime?", a: "The rehearsal gives me the real number, and then it is either a window the business accepts or I migrate the history first and only the delta during the window." }
  ]
},

"scn-traffic-spike": {
  script: "I would measure before changing anything, because the first bottleneck is almost never where people guess, and in a database-backed application it is almost always the database. So a load test against production-like data, and find where it actually falls over. Then in the order it usually goes: the database first, because queries that are fine today are quadratic at ten times the volume — indexes, paging, getting rid of N plus one. Then caching for the lookup and master data that is read constantly and changes rarely, distributed rather than in-process, because the moment you scale out an in-memory cache is per instance. Then making sure nothing is still blocking a thread on I/O. Then getting work off the request path — email, reports, integrations into background jobs. Then scale out rather than up, and that one has a real constraint attached: the application has to be stateless, so no in-process session, no writing to local disk, and background jobs that do not run duplicated on every instance. That last one is live for us — with multiple worker processes in IIS a recurring job must not double-post, which is why our SAP sync workers claim their work through a status flag in the database. Then re-test, because fixing the first bottleneck just reveals the second.",
  followups: [
    { q: "Scale up or scale out?", a: "Up is quicker and buys time with no code change, and it has a ceiling. Out is where you end up, but it forces statelessness, so I would be honest about which parts are not ready for it yet." },
    { q: "What breaks first in practice?", a: "The database, usually through connection pool exhaustion or a query doing a scan nobody noticed at current volume. The application layer is rarely the first to give." },
    { q: "How do you load test realistically?", a: "Production-sized data, not an empty database, and a mix of journeys weighted the way real users behave. A test that hammers one fast endpoint tells you nothing useful." }
  ]
},

"scn-recurring-bug": {
  script: "If it has come back three times then it was never actually fixed — somebody patched where it showed up rather than where it comes from, and at that point the recurrence is the bug. So I stop asking what is wrong with the screen and start asking why this keeps happening. Usually it is one of a few things. The same rule implemented in four places and fixed in one, in which case the fix is to make it exist once rather than to fix the other three. Or a fix at the wrong layer — validation patched in the UI while the API still accepts the bad value, so it comes back in through a different door. Or the real cause is data, bad rows being created upstream, and every fix is just cleaning up after them. Or it is a race condition and the fix only made it rarer, which is why it reappears under load. Then I make it permanent — fix the real cause, and where the data is the problem put a constraint at the database level, because a check or a unique constraint cannot be bypassed by a code path somebody forgets. And leave a regression test behind, and write it down, because if three people fixed it three times then nobody knew it had happened before.",
  followups: [
    { q: "What if you cannot reproduce it?", a: "Then I improve the evidence before I touch the code — logging around that path with a correlation id and the inputs. A fix for something you cannot reproduce is a guess, and that is how it comes back a fourth time." },
    { q: "Database constraint or code validation?", a: "Both, for different reasons. Code gives the user a decent message; the constraint is what makes it actually true, because it cannot be bypassed." },
    { q: "How do you stop it being reintroduced?", a: "A test that fails if it comes back, and if it is a pattern rather than a one-off, a review checklist item or an analyser rule so it is caught before merge. That is what we did with the security fix patterns." }
  ]
},

"scn-junior-pr": {
  script: "I would not post thirty comments, because people stop reading at about six and nothing gets learned — it just demoralises someone. So I sort by severity first. Security and correctness are not negotiable. Performance matters where it will matter at real data volume. Design problems that will cost later are worth raising. And style should be handled by a formatter and an analyser, not by a person, because a human arguing about braces is a waste of both of us. Then I comment on the top few and group the repeated ones — this same issue is in five places, here is the pattern — because one explanation beats five identical comments. And I explain the why with an example, since telling someone to use parameters teaches far less than showing them what a crafted input actually does. If it is thirty problems off, that is not a comment thread, that is a fifteen-minute call, and when I do that it usually turns out the real problem was an unclear requirement or a design nobody agreed before the code was written. I also say what is good, because if every review is only criticism people start avoiding review instead of seeking it. Mentoring is part of my lead role, and ten minutes agreeing the approach beforehand saves the rewrite afterwards.",
  followups: [
    { q: "What if they push back?", a: "On security or correctness I hold the line and explain the consequence. On style or preference I let it go, because spending credibility on a brace position means not having it when it matters." },
    { q: "Do you ever just fix it yourself?", a: "For something trivial under deadline, with a message saying what I changed and why. Not habitually, because then they never learn it and I have quietly taken their work off them." },
    { q: "How do you review without it feeling personal?", a: "Comment on the code, not the person, ask rather than instruct where there is genuine doubt, and be the person who takes the same feedback well on your own pull requests." }
  ]
},

"scn-file-integration": {
  script: "I would design it assuming the file will eventually be late, malformed, duplicated or simply missing, because over a year each of those happens. So a scheduled job picks it up rather than a file watcher, because a watcher misses files while the service is restarting. Then I make sure the write has finished before reading — a half-written file is a classic bug — using a trigger file, a rename-when-complete convention, or checking the size has stopped changing. Then I archive the original immediately and untouched with a timestamp, because when somebody disputes the data in three weeks that copy is the only answer. Then load into staging rather than straight into live, and validate there set-based, producing an exception report rather than failing the whole file because one row is bad. I guard against duplicates with a file hash or a processed-files table, because the same file will absolutely be dropped twice. And I alert on absence, which is the hardest failure — nothing throws when a file never arrives, so the alert has to fire when nothing has been processed by the time it should have been. Our Excel bulk upload modules follow that shape, and the error report saying which rows failed and why is what made the feature usable, because the first version rejected the whole file over one bad row.",
  followups: [
    { q: "What if the file is enormous?", a: "Stream it rather than loading it into memory, and bulk insert in chunks with a resume marker so a failure part-way through does not mean starting again." },
    { q: "How do you handle a bad row?", a: "Skip it, record it with the row number and the reason, carry on, and report it at the end. One bad row should never cost the other ten thousand." },
    { q: "Can you make it near real-time?", a: "Not beyond the drop frequency, and I would say that clearly upfront. If the source is nightly then the data is nightly, and everyone downstream needs to know before somebody designs a screen implying it is live." }
  ]
},

"scn-no-requirements": {
  script: "I would not guess silently and I would not stop working either, because both are avoidable with one email. Most vague requirements have a clear core and a few ambiguous edges, so I separate them — the core I can build today. Then I write the assumptions down and send them: I am proceeding on the basis of this, this and this, tell me if any of it is wrong. Silence is not agreement, but having it in writing changes the conversation entirely when one of them turns out to be wrong. And I ask about the edges specifically rather than generally, because asking what should happen when a vendor has no bank details gets an answer, while asking someone to clarify the requirement gets ignored. Then I build the certain part first and structure the uncertain part so it is cheap to change — behind an interface or in configuration rather than hard-coded through five files. And I show something early, because a screen people can look at generates more precise feedback in five minutes than a specification does in a week. The line I hold is that I do not invent business rules. Technical defaults are mine to choose, but approval limits, tax treatment, who is allowed to see what — those are theirs, and guessing at them is how you end up rewriting.",
  followups: [
    { q: "What if the assumption turns out wrong?", a: "Then it is a change with a date on it rather than an argument about what was agreed, and because the uncertain part stayed behind an interface it is usually a small change." },
    { q: "Who do you ask if the business is away?", a: "Whoever has the domain knowledge — a senior developer who has been there, support tickets, or the existing code, which records decisions somebody made even when nobody documented them." },
    { q: "Do you ever refuse to start?", a: "Only when the ambiguity is the entire requirement and anything I build would be thrown away. Then I say so and ask for the thirty minutes it would take to settle it." }
  ]
},

"scn-first-90-days": {
  script: "The first thirty days I would spend understanding rather than proposing. Getting the environment running locally and deploying something small end to end, because that one exercise teaches you the whole pipeline faster than reading about it. Reading the code around whatever I am given, learning the words the business actually uses for things, and finding out who to ask about what. I would take the small tickets deliberately, because they are the quickest way to touch a lot of the system, and I would ask a lot of questions while it is still expected of a new joiner. Thirty to sixty I would want to own a feature end to end and start taking part in code reviews, which is also how you learn a team's real standards rather than the written ones. Sixty to ninety is where I would bring one concrete improvement with evidence behind it rather than a list of opinions — usually a slow query, a manual step worth automating, or a missing check in the release process. What I would deliberately not do is propose an architecture change in month one. Everything that looks wrong in a mature codebase usually has a history, and the fastest way to lose a team's trust is to tell them their system is bad before you understand why it is the way it is.",
  followups: [
    { q: "What if you find something seriously wrong early?", a: "Security I raise immediately, whatever week it is. Everything else I note and bring up once I understand the context, because being right about a problem and wrong about why it exists still loses the argument." },
    { q: "How do you learn a large codebase?", a: "Follow one real request all the way through, and read the tests and the database schema. The schema tells you what the business actually is faster than the code does." },
    { q: "What would success look like at ninety days?", a: "Shipping features without needing my hand held, knowing who to ask for what, and having made one improvement the team agrees was worth it." }
  ]
},

"scn-dynamic-grid": {
  script: "The first thing I would do is push back on the requirement gently, because nobody reads two hundred columns. What it nearly always means is that different users need different subsets, and that is a much easier problem. So the design is metadata-driven: a table describing each column — the key, the caption, the data type, the format, the order, and who is allowed to see it — and the grid renders from that, which makes adding a column configuration instead of a code change. Then a saved layout per user, so each person picks and orders the columns they actually use, and two hundred becomes the twelve they care about. Everything happens server-side, paging and sorting and filtering in SQL, and that matters more than usual here because the rows are wide. And I build the projection from the chosen columns rather than SELECT star, so the columns nobody picked never leave the database. In the UI I would virtualise both directions and freeze the key columns so people do not lose their place scrolling sideways. If they genuinely need all two hundred, that is a background export, not a screen. Our configurable document engine is the same shape — the document types and their fields are configuration, so a new type needs no code.",
  followups: [
    { q: "Why not EAV?", a: "It is genuinely flexible, and then every query becomes a pivot and nothing indexes well. I would only reach for it when the attributes are truly unbounded and the reporting need is small. A fixed core plus a JSON extension column is usually the better trade." },
    { q: "How do you keep the metadata honest?", a: "It is schema, so it is versioned and deployed like schema, not edited straight in production. A column definition that does not match the underlying data is a bug that only shows up in front of a user." },
    { q: "What about sorting on a JSON field?", a: "A computed column over the JSON property, persisted and indexed. Otherwise every sort is a scan with a parse on each row." }
  ]
},
};
