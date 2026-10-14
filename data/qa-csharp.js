/* C# / .NET language pack */
window.QA = (window.QA || []).concat([

{
  id: "cs-value-ref", topic: "csharp", star: true,
  q: "Difference between value type and reference type",
  tags: ["value type vs reference type", "stack heap", "struct class", "pass by value"],
  simple: "A value type carries the actual data. A reference type carries the address of the data. Copy a value type and you get a second independent copy; copy a reference type and both names point at the same object.",
  answer: "Value types — `int`, `decimal`, `bool`, `DateTime`, `struct`, `enum` — hold the data directly and normally live on the stack or inline inside the containing object. Reference types — `class`, `string`, arrays, collections — hold a reference to an object on the managed heap.\n- Assigning a value type copies the data; assigning a reference type copies only the pointer.\n- A value type can never be null unless I make it `int?` (Nullable).\n- Equality: value types compare content by default, reference types compare identity unless the class overrides Equals.\n`string` is the usual trick question — it is a reference type but behaves like a value because it is immutable.",
  code: "int a = 5;  int b = a;  b = 9;          // a is still 5\nvar l1 = new List<int>{1}; var l2 = l1;\nl2.Add(2);                              // l1.Count is now 2 as well",
  project: "This bites in DTO mapping. In the Vendor Portal APIs I pass entity objects into service methods — because they are reference types, a change inside the service is visible to the caller, so for anything I must not mutate I map to a fresh DTO first. For money and quantity fields on purchase orders I use `decimal` (value type) rather than double so rounding stays exact.",
  remember: "Value = the thing itself. Reference = the address of the thing."
},

{
  id: "cs-string-sb", topic: "csharp", star: true,
  q: "String vs StringBuilder — when do you use which?",
  tags: ["string vs stringbuilder", "immutable string", "string concatenation performance"],
  simple: "A string can never be changed. Every time you add to a string, .NET quietly makes a brand new string. StringBuilder keeps one editable buffer, so a loop does not create thousands of throwaway objects.",
  answer: "`string` is immutable. `s += x` inside a loop allocates a new string every pass and the old ones become garbage, so 10,000 rows means 10,000 allocations and heavy GC pressure.\n`StringBuilder` keeps an internal char buffer and appends in place, so the cost is close to linear.\nRule I follow: a handful of concatenations, or anything inside one expression — use string interpolation. A loop or dynamic SQL/HTML built row by row — use StringBuilder.",
  code: "var sb = new StringBuilder();\nforeach (var item in items)\n    sb.AppendLine($\"<tr><td>{item.Code}</td></tr>\");\nreturn sb.ToString();",
  project: "In Smart Documents I build the document body and the bulk-upload error report row by row — a 5,000 row Excel upload would have been a disaster with plain string concatenation, so that whole builder uses StringBuilder. For short things like a cache key or a log line I still use interpolation because readability wins.",
  remember: "One or two joins = string. Inside a loop = StringBuilder."
},

{
  id: "cs-abstract-interface", topic: "csharp", star: true,
  q: "Abstract class vs interface",
  tags: ["abstract class vs interface", "interface", "abstract", "when to use interface"],
  simple: "An interface is a contract — only what must exist. An abstract class is a half-built parent — it can also carry shared code and state.",
  answer: "An interface declares members with no implementation (default interface methods aside) and a class can implement many interfaces. An abstract class can hold fields, constructors, and concrete methods, but a class can inherit only one.\n- Use an interface when unrelated types must honour the same contract — `IEmailSender`, `IVendorRepository` — and for anything I want to inject or mock in tests.\n- Use an abstract class when several types share real logic and state and genuinely form an is-a family.\nIn day-to-day .NET work I reach for interfaces far more, because DI and unit testing both depend on them.",
  code: "public interface IVendorRepository {\n    Task<Vendor> GetAsync(int id);\n}\npublic abstract class BaseDocument {\n    public int Id { get; set; }\n    protected void Audit(string by) { /* shared code */ }\n    public abstract bool Validate();\n}",
  project: "In Smart Documents the document engine has an abstract `BaseDocument` holding the common audit and header logic, and each document type overrides `Validate()`. The storage and SAP sides sit behind interfaces — `IDocumentRepository`, `ISapClient` — so the controller depends on the contract and I can swap or stub the SAP side without touching the engine.",
  remember: "Interface = what it must do. Abstract class = what it must do plus what it already knows."
},

{
  id: "cs-async-await", topic: "csharp", star: true,
  q: "How does async await work in C#?",
  tags: ["async await", "task", "asynchronous programming", "async programming"],
  simple: "async/await lets a thread walk away from a slow job — a database call or an HTTP call — instead of standing and waiting. When the result arrives, the method carries on from the same line.",
  answer: "Marking a method `async` lets me use `await`. At the await point, the compiler builds a state machine: the method returns to the caller, the thread goes back to the pool, and when the awaited Task completes the remainder is scheduled to continue.\nThe gain is throughput, not raw speed — one request is not faster, but the server handles many more at once because threads are not blocked on I/O.\nRules I stick to: async all the way down, return `Task`/`Task<T>` not `void` except for event handlers, and never call `.Result` or `.Wait()` on an async call because that can deadlock and wastes a thread.",
  code: "public async Task<IActionResult> GetVendor(int id)\n{\n    var vendor = await _repo.GetAsync(id);      // thread is released here\n    if (vendor == null) return NotFound();\n    return Ok(vendor);\n}",
  project: "All the Vendor Portal API endpoints are async end to end — controller, service, and EF Core calls use `ToListAsync`/`FirstOrDefaultAsync`. The portal is used by many suppliers at once and the reporting screens hit big tables, so keeping threads free is what lets a single IIS worker hold the load.",
  remember: "await does not make it faster — it frees the thread while waiting."
},

{
  id: "cs-task-thread", topic: "csharp",
  q: "Task vs Thread",
  tags: ["task vs thread", "threadpool", "parallel", "task"],
  simple: "A Thread is one real worker you create and manage. A Task is a unit of work you hand to the pool, and .NET decides which worker runs it.",
  answer: "`Thread` is a low-level OS thread — expensive to create (around 1 MB stack), and I own its lifetime. `Task` is a higher-level promise of work, usually scheduled on the thread pool, and it gives me continuations, cancellation tokens, exception capture, and `async/await` support for free.\nFor I/O-bound work a Task may use no thread at all while it waits. For CPU-bound work `Task.Run` borrows a pool thread.\nI only create a raw Thread for a long-running dedicated loop; otherwise Task is the right default.",
  project: "For background work in SAP Synchronization Services I did not hand-roll threads at all — Hangfire owns the worker side and my job methods are async Tasks. Inside a sync batch I use `await Task.WhenAll(...)` for a controlled set of independent calls instead of looping one by one.",
  remember: "Thread = a worker. Task = a job. Hand over jobs, not workers."
},

{
  id: "cs-ienumerable-iqueryable", topic: "csharp", star: true,
  q: "IEnumerable vs IQueryable",
  tags: ["ienumerable vs iqueryable", "iqueryable", "linq to sql", "deferred execution"],
  simple: "IQueryable builds the SQL and makes the database do the filtering. IEnumerable pulls the rows into memory first and then filters in C#. Picking the wrong one can drag a whole table across the wire.",
  answer: "`IQueryable<T>` holds an expression tree. Any Where/OrderBy/Skip/Take I chain is translated into the SQL that EF Core finally sends, so filtering and paging happen on the server.\n`IEnumerable<T>` works on objects already in memory with LINQ to Objects. The moment I cast a DbSet to IEnumerable — or call `.ToList()` early — the rest of the query runs in C# after the full result set has been fetched.\nSo repository methods that are still composable return IQueryable; once I have the final data I return IEnumerable or a List.",
  code: "// Good — one filtered, paged SQL statement\nvar page = await _db.PurchaseOrders\n    .Where(p => p.VendorId == id && p.Status == \"OPEN\")\n    .OrderByDescending(p => p.CreatedOn)\n    .Skip(skip).Take(50).ToListAsync();\n\n// Bad — pulls every PO into memory, then filters\nvar bad = _db.PurchaseOrders.ToList().Where(p => p.VendorId == id);",
  project: "This was a real fix on the Vendor Portal PO listing. The original code materialised the list and filtered in C#; moving the filter and paging into the IQueryable chain so SQL Server did the work with a supporting index is part of how those screens got to sub-second response.",
  remember: "IQueryable = filter in SQL. IEnumerable = filter in memory."
},

{
  id: "cs-deferred", topic: "csharp",
  q: "What is deferred execution in LINQ?",
  tags: ["deferred execution", "lazy evaluation linq", "tolist", "linq execution"],
  simple: "A LINQ query is a recipe, not the food. Nothing runs until something asks for the results.",
  answer: "LINQ operators like Where, Select, OrderBy are lazy — they only build the query. Execution happens when I enumerate it: `foreach`, `ToList()`, `ToArray()`, `First()`, `Count()`, `Any()`.\nTwo consequences I watch for: the query can run twice if I enumerate it twice (two database round trips), and with EF Core a deferred query enumerated after the DbContext is disposed throws. So I compose freely, then materialise once with `ToListAsync()` at the point where I actually need the data.",
  project: "In the procurement reports I build the base query, conditionally add filters from the search panel, and only then call `ToListAsync()` — one trip, one SQL statement. The bug I had to fix in older code was a query being enumerated once for `Count()` and again for the grid, which doubled the database hits on a heavy screen.",
  remember: "Query is built lazily; ToList() is the trigger."
},

{
  id: "cs-dispose", topic: "csharp",
  q: "Garbage collection, IDisposable and the using statement",
  tags: ["garbage collection", "idisposable", "using statement", "dispose", "memory management"],
  simple: "The garbage collector cleans up memory for you, but it knows nothing about files, connections or sockets. Those you must close yourself — that is what IDisposable and using are for.",
  answer: "The GC manages the heap in generations: Gen 0 collects often and cheaply, survivors move to Gen 1 and Gen 2, and large objects go to the LOH. I do not free managed memory myself.\nUnmanaged resources — SQL connections, file handles, HttpClient streams — are different. A class that owns one implements `IDisposable`, and I wrap it in `using` so Dispose runs even if an exception is thrown. `using var x = ...` disposes at end of scope.\nThe classic leaks I look for are undisposed connections, event handlers never unsubscribed, and static collections that keep growing.",
  code: "using (var conn = new SqlConnection(_cs))\nusing (var cmd  = new SqlCommand(sql, conn))\n{\n    await conn.OpenAsync();\n    using var rdr = await cmd.ExecuteReaderAsync();\n    while (await rdr.ReadAsync()) { /* map */ }\n}   // connection returned to the pool here, even on error",
  project: "Smart Documents still has ADO.NET code for the heavy report queries, and every connection, command and reader there is inside a using block — without it, connections stay out of the pool and the app starts failing under load. On the EF Core side the DbContext is disposed by the DI container with a scoped lifetime, so I do not dispose it myself.",
  remember: "GC handles memory. using handles everything else."
},

{
  id: "cs-exception", topic: "csharp",
  q: "How do you handle exceptions in C#?",
  tags: ["exception handling", "try catch finally", "throw vs throw ex", "global exception handling"],
  simple: "Catch only what you can actually deal with, never swallow an error silently, and keep the original stack trace.",
  answer: "try/catch/finally: finally always runs, so cleanup goes there (or use `using`). Rules I follow:\n- Catch specific exceptions before general ones — `SqlException` before `Exception`.\n- Use `throw;` to rethrow, never `throw ex;` — the second one resets the stack trace and you lose the original line.\n- Never catch and ignore. If there is nothing to do, let it bubble to a global handler.\n- Do not use exceptions for normal flow — validate instead; exceptions are expensive.\n- Log with context (user, record id, correlation id) and return a clean message to the caller, never the raw stack trace.",
  code: "try { await _sap.PostInvoiceAsync(doc); }\ncatch (SapConnectionException ex)\n{\n    _log.Error(ex, \"SAP down for invoice {Id}\", doc.Id);\n    throw;                      // keep the original stack trace\n}\nfinally { _metrics.Record(doc.Id); }",
  project: "Across the enterprise platform we use ELMAH and log4net plus a global exception filter, so an unhandled error is logged with full detail and the user sees a friendly page instead of a yellow screen. Leaking a stack trace to the browser is also an OWASP finding, and information-disclosure items like that were part of the 500+ security findings I cleared.",
  remember: "throw; keeps the trace. throw ex; destroys it."
},

{
  id: "cs-boxing", topic: "csharp",
  q: "What is boxing and unboxing?",
  tags: ["boxing unboxing", "object casting", "performance boxing"],
  simple: "Boxing wraps a value type inside an object so it can live on the heap. Unboxing unwraps it. Both cost time, and in a big loop that cost adds up.",
  answer: "Boxing happens when a value type is assigned to `object` or to a non-generic interface — the runtime allocates a heap object and copies the value in. Unboxing is the explicit cast back, which also checks the type and can throw `InvalidCastException`.\nIt matters because each box is an allocation and therefore GC work. The usual cause in legacy code is non-generic collections like `ArrayList` or `Hashtable`; generics (`List<int>`, `Dictionary<int,string>`) avoid boxing completely, which is the main reason generics exist.",
  code: "object boxed = 42;          // boxing\nint back = (int)boxed;      // unboxing\n\nArrayList old = new ArrayList(); old.Add(1);   // boxes every int\nList<int> now = new List<int>(); now.Add(1);   // no boxing",
  remember: "Value type into object = boxing = an allocation. Generics avoid it."
},

{
  id: "cs-generics", topic: "csharp",
  q: "What are generics and why use them?",
  tags: ["generics", "generic class", "type constraint", "where t"],
  simple: "Generics let you write the logic once and use it with any type, while the compiler still checks the type for you.",
  answer: "A generic type or method takes the type as a parameter — `List<T>`, `Repository<T>`, `Result<T>`. The benefits are type safety at compile time, no casting, and no boxing of value types.\nConstraints narrow what T can be: `where T : class`, `where T : BaseEntity`, `where T : new()`. That lets me use the members of the constrained type inside the generic code.\nIt is the standard answer to repeated code that differs only by type — one generic repository instead of twelve copies.",
  code: "public class Repository<T> where T : BaseEntity\n{\n    private readonly AppDbContext _db;\n    public Repository(AppDbContext db) { _db = db; }\n    public Task<T> GetAsync(int id) => _db.Set<T>().FirstOrDefaultAsync(e => e.Id == id);\n}",
  project: "The procurement modules share a generic repository over EF Core for the plain CRUD entities (masters, lookups), while the complex transactional queries get their own specific repositories with tuned SQL. That split keeps the boilerplate small without hiding the queries that actually need tuning.",
  remember: "Generics = one implementation, many types, no casting."
},

{
  id: "cs-delegate-event", topic: "csharp",
  q: "Delegates, Func, Action and events",
  tags: ["delegate", "func action predicate", "events", "callback"],
  simple: "A delegate is a variable that holds a method. Func and Action are ready-made delegates. An event is a safe way to let others subscribe to something that happened.",
  answer: "A delegate is a type-safe pointer to a method, so behaviour can be passed as a parameter. Instead of declaring my own I normally use the built-ins: `Action` (no return), `Func<T,TResult>` (returns a value), `Predicate<T>` (returns bool). LINQ is built entirely on them — the lambda in `Where(x => x.IsActive)` is a `Func<T,bool>`.\nAn `event` wraps a delegate so subscribers can only `+=` and `-=`, not overwrite or invoke it. Classic publisher/subscriber. The one gotcha is to unsubscribe, otherwise the publisher keeps the subscriber alive and you leak memory.",
  code: "public Func<decimal, decimal> ApplyTax = amt => amt * 1.18m;\n\nitems.Where(i => i.Qty > 0)            // Func<Item,bool>\n     .ToList()\n     .ForEach(i => Console.WriteLine(i.Code));   // Action<Item>",
  project: "I use Func parameters to pass validation rules into the Smart Documents engine — each document type supplies its own rule set rather than the engine holding a switch statement. That is also how new document types get added without touching the engine code.",
  remember: "Action returns nothing, Func returns something, event = controlled delegate."
},

{
  id: "cs-const-readonly", topic: "csharp",
  q: "const vs readonly vs static",
  tags: ["const vs readonly", "static", "static readonly"],
  simple: "const is fixed at compile time. readonly is fixed once the object is built. static belongs to the class, not to any one object.",
  answer: "`const` must be set at declaration, is implicitly static, and is baked into the calling assembly at compile time — so if a const in a shared library changes, every consumer must be rebuilt.\n`readonly` is set at declaration or in the constructor and resolved at runtime, so it can differ per instance and survives a library update without recompiling callers.\n`static` means one shared copy at class level. `static readonly` is what I use for shared values that could change between releases, and for reference types like a configured HttpClient.",
  code: "public const int MaxRetry = 3;                     // compile-time\npublic static readonly string Env = ReadEnv();     // runtime, shared\nprivate readonly IVendorRepository _repo;          // set in the constructor",
  project: "Every injected dependency in my services is a `private readonly` field set in the constructor — that is the DI pattern and it guarantees nothing reassigns the repository mid-request. Real configuration like connection strings and SAP endpoints never goes in a const; it comes from appsettings through IOptions so it can change per environment.",
  remember: "const = compile time, readonly = construction time, static = shared by all."
},

{
  id: "cs-collections", topic: "csharp",
  q: "List vs Dictionary vs HashSet — which collection do you pick?",
  tags: ["list vs dictionary", "hashset", "collections", "lookup performance"],
  simple: "List is an ordered line of items. Dictionary is a key-to-value lookup. HashSet is a bag of unique items. The difference shows up when you search.",
  answer: "`List<T>` keeps insertion order; finding an item by value is O(n).\n`Dictionary<K,V>` gives near O(1) lookup by key — the right choice whenever I search repeatedly by id or code.\n`HashSet<T>` gives near O(1) Contains and automatically drops duplicates.\nThe common performance mistake is a nested loop doing `list.Any(x => x.Code == y.Code)` — that is O(n*m). Converting the inner list to a Dictionary or HashSet first turns it into O(n).",
  code: "// slow for large sets\nvar dup = rows.Where(r => existing.Any(e => e.Code == r.Code));\n\n// fast\nvar codes = new HashSet<string>(existing.Select(e => e.Code));\nvar dup2  = rows.Where(r => codes.Contains(r.Code));",
  project: "Exactly this change in the Excel bulk upload validator. Checking each uploaded row against the existing item master with a nested loop was the bottleneck on big files; loading the codes into a HashSet once and checking against that made a several-thousand-row upload validate in seconds.",
  remember: "Searching by key? Dictionary. Checking existence? HashSet."
},

{
  id: "cs-null", topic: "csharp",
  q: "How do you handle null in C#?",
  tags: ["null check", "null coalescing", "null conditional", "nullable reference types", "nullreferenceexception"],
  simple: "Null means no object at all. Touching a member of null throws the most common error in .NET, so you check first or use the short null operators.",
  answer: "Tools I use:\n- `?.` null-conditional — `vendor?.Address?.City` returns null instead of throwing.\n- `??` null-coalescing and `??=` — `var name = dto.Name ?? \"Unknown\";`\n- `int?` Nullable value types with `HasValue` / `GetValueOrDefault()`.\n- Nullable reference types (`#nullable enable` in .NET 6+) so the compiler warns at build time.\n- Guard clauses at the top of a method: `ArgumentNullException.ThrowIfNull(dto);`\nFor APIs I prefer returning an empty list over null, so callers never have to null-check a collection.",
  code: "var city = vendor?.Address?.City ?? \"-\";\nArgumentNullException.ThrowIfNull(request);\nif (!order.ApprovedOn.HasValue) return BadRequest(\"Not approved yet\");",
  project: "A lot of the defensive null work in the Vendor Portal is around optional vendor master fields coming from SAP — GST details, bank details, alternate contacts. The API maps them with `?.` and `??` so a half-filled SAP record renders as a dash on the React screen instead of crashing the endpoint.",
  remember: "?. means stop safely, ?? means use this instead."
},

{
  id: "cs-record-class-struct", topic: "csharp",
  q: "record vs class vs struct",
  tags: ["record", "record vs class", "struct", "immutable dto", "init only"],
  simple: "class = a normal object compared by identity. record = an object compared by its values, meant for data you do not change. struct = a small value type.",
  answer: "A `record` (C# 9+) is a reference type with value-based equality, a built-in ToString, `with` expressions for non-destructive copies, and usually `init`-only properties. That makes it ideal for DTOs, API request/response models, and anything I want immutable.\nA `class` is the general-purpose reference type — entities with behaviour and identity.\nA `struct` is a value type for small, short-lived data (a point, a money amount). Keep structs small and preferably readonly, otherwise copying costs more than it saves.",
  code: "public record VendorDto(int Id, string Name, string Gstin);\n\nvar v2 = v1 with { Name = \"Updated name\" };   // copy with one change",
  project: "New API contracts I add to the Vendor Portal use records for the request and response DTOs — equality and immutability come free, and it makes it obvious which objects are EF entities (classes, tracked, mutable) and which are wire models.",
  remember: "record = data, class = behaviour, struct = small value."
},

{
  id: "cs-override-overload", topic: "csharp",
  q: "Method overloading vs overriding",
  tags: ["overloading vs overriding", "virtual override", "compile time polymorphism", "runtime polymorphism"],
  simple: "Overloading = same method name, different parameters, decided while compiling. Overriding = a child class replaces the parent behaviour, decided while running.",
  answer: "Overloading is compile-time (static) polymorphism — several methods share a name but differ in parameter type, count or order. The return type alone is not enough.\nOverriding is runtime (dynamic) polymorphism — the base marks a method `virtual` or `abstract`, the child uses `override`, and the actual object type decides which runs.\n`new` hides a base member instead of overriding it, so the call depends on the reference type, not the object — that is almost always a bug rather than a design choice.",
  code: "public virtual decimal Total() => Qty * Rate;              // base\npublic override decimal Total() => base.Total() - Discount; // child\n\npublic void Log(string msg) { }\npublic void Log(string msg, Exception ex) { }               // overload",
  project: "The Smart Documents engine uses overriding for exactly this — `BaseDocument.Validate()` is abstract and each document type supplies its own rules, so the controller calls `doc.Validate()` without knowing which type it holds. Overloads show up in the service helpers where the same operation takes either an id or the full entity.",
  remember: "Overload = same name, different signature. Override = same signature, different class."
},

{
  id: "cs-extension", topic: "csharp",
  q: "What are extension methods?",
  tags: ["extension method", "this keyword parameter", "add method to existing class"],
  simple: "An extension method lets you add a method to a type you did not write — like adding your own helper to string — without changing or inheriting from it.",
  answer: "A static method in a static class whose first parameter is marked `this`. The compiler lets you call it as if it were an instance method. All of LINQ is extension methods on `IEnumerable<T>`.\nI use them for small cross-cutting helpers — formatting, validation, service registration. Caveats: they cannot access private members, an instance method with the same signature always wins, and the namespace must be in scope.",
  code: "public static class StringExtensions {\n    public static bool IsValidGstin(this string s) =>\n        !string.IsNullOrWhiteSpace(s) && s.Length == 15;\n}\n// usage\nif (!dto.Gstin.IsValidGstin()) return BadRequest(\"Invalid GSTIN\");",
  project: "I keep a small extensions file in the shared layer — GSTIN and PAN checks, a safe decimal parser for Excel cells, and `AddProcurementServices(this IServiceCollection)` to keep Program.cs readable. The Excel parser extension is used by every bulk-upload module.",
  remember: "static class + static method + this on the first parameter."
},

{
  id: "cs-sealed-virtual", topic: "csharp",
  q: "virtual, override, sealed and new keywords",
  tags: ["virtual override sealed new", "method hiding", "inheritance keywords"],
  simple: "virtual says children may change this. override is the child actually changing it. sealed says nobody may change it further. new hides it, which is usually a mistake.",
  answer: "- `virtual` — base provides an implementation that a derived class may replace.\n- `abstract` — base provides no implementation and the derived class must supply one.\n- `override` — the derived implementation; it participates in runtime polymorphism.\n- `sealed` — on a class it blocks inheritance, on an override it stops further overriding.\n- `new` — hides the base member. The method called then depends on the reference type, so the same object behaves differently through a base reference. I avoid it.",
  code: "public class Base      { public virtual string Name() => \"base\"; }\npublic class Child : Base { public sealed override string Name() => \"child\"; }\n\nBase b = new Child();\nb.Name();   // \"child\" — because it is a real override",
  remember: "virtual + override = polymorphism. new = hiding, and it lies to the caller."
},

{
  id: "cs-static-class", topic: "csharp",
  q: "When should a class be static?",
  tags: ["static class", "static method", "singleton vs static", "utility class"],
  simple: "Make it static only when it has no state of its own — a pure helper. The moment it needs settings or a database it should become a normal injected service.",
  answer: "A static class cannot be instantiated or inherited and holds only static members. It fits stateless utilities — maths, formatting, extension method containers.\nWhat it is bad at: it cannot be injected, cannot be mocked, and cannot easily be swapped per environment, so it fights unit testing. Static mutable state is also a thread-safety hazard in a web app, where many requests share the same process.\nSo when something needs a connection string, a logger, or a repository, I register it in DI as a scoped or singleton service instead of making it static.",
  project: "In the older MVC modules there were static helper classes doing database work directly. Where I touch those during security or performance fixes I move them behind an interface and register them in DI, which is also what made it possible to test and review them properly.",
  remember: "Static is fine for pure helpers, wrong for anything with state or dependencies."
},

{
  id: "cs-lock", topic: "csharp",
  q: "How do you make code thread-safe?",
  tags: ["thread safety", "lock", "race condition", "concurrentdictionary", "deadlock"],
  simple: "Two threads touching the same data at the same time can corrupt it. You either stop sharing the data, or you let only one thread in at a time.",
  answer: "Preferred order:\n1. Avoid shared mutable state — in ASP.NET Core most state is per request anyway.\n2. Use immutable objects.\n3. Use concurrent collections — `ConcurrentDictionary`, `ConcurrentQueue`.\n4. Only then `lock` on a private readonly object, around the smallest possible block.\nNever lock on `this`, a string, or a public object. Do not `await` inside a `lock` — use `SemaphoreSlim` for async mutual exclusion. Deadlock comes from two locks taken in different order, so if I need two I always take them in the same order.",
  code: "private static readonly object _gate = new object();\nlock (_gate) { _counter++; }\n\n// async version\nawait _semaphore.WaitAsync();\ntry { await DoWorkAsync(); } finally { _semaphore.Release(); }",
  project: "Where it mattered for us was the SAP sync jobs — two Hangfire workers could pick up overlapping work, so the protection is at the data level: a status flag updated in a transaction so only one worker claims a batch, plus idempotent handlers. That is safer than in-process locking, because locks do not survive multiple IIS worker processes.",
  remember: "Best thread safety is no shared state; lock is the last resort."
},

{
  id: "cs-dotnet-core-framework", topic: "csharp",
  q: ".NET Framework vs .NET Core / .NET 8",
  tags: [".net framework vs .net core", ".net 8", "cross platform", "migration"],
  simple: ".NET Framework is the old Windows-only one. .NET Core and now .NET 8 are the rebuilt, cross-platform, faster version, and that is where all new work goes.",
  answer: "Framework 4.8 is Windows-only, tied to IIS and the machine-wide install, and is in maintenance — it gets security fixes only.\n.NET 8 is cross-platform, side-by-side versioned, can be self-contained, has built-in DI, configuration and logging, Kestrel, and much better performance. It is an LTS release.\nDifferences that show up in real work: `Startup.cs`/`Program.cs` and the middleware pipeline instead of Global.asax and modules, built-in DI instead of Unity or Ninject, appsettings.json instead of web.config, and `System.Web`/HttpContext.Current being gone.",
  project: "Our platform is a mixed estate and I work across it — .NET 8 / ASP.NET Core for the Vendor Portal APIs and new services, MVC 5 on .NET Framework 4.8 for the established procurement modules we still maintain. New modules go on .NET 8; the legacy ones get maintained and hardened rather than rewritten wholesale.",
  remember: ".NET 8 = cross-platform, DI built in, config in JSON. Framework = Windows and IIS only."
}

]);
