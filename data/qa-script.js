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
}
};
