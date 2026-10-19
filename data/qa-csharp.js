/* C# / .NET language pack */
window.QA = (window.QA || []).concat([

{
  id: "cs-value-ref", topic: "csharp", star: true,
  q: "Difference between value type and reference type",
  tags: ["value type vs reference type", "stack heap", "struct class", "pass by value", "where does each type live", "value type vs reference type and what is boxing"],
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
  tags: ["abstract class vs interface", "interface", "abstract", "when to use interface", "can an interface have method code now", "virtual method vs abstract method", "can you create an object of an abstract class", "why an interface why not call the class directly"],
  simple: "An interface is a contract — only what must exist. An abstract class is a half-built parent — it can also carry shared code and state.",
  answer: "An interface declares members with no implementation (default interface methods aside) and a class can implement many interfaces. An abstract class can hold fields, constructors, and concrete methods, but a class can inherit only one.\n- Use an interface when unrelated types must honour the same contract — `IEmailSender`, `IVendorRepository` — and for anything I want to inject or mock in tests.\n- Use an abstract class when several types share real logic and state and genuinely form an is-a family.\nIn day-to-day .NET work I reach for interfaces far more, because DI and unit testing both depend on them.",
  code: "public interface IVendorRepository {\n    Task<Vendor> GetAsync(int id);\n}\npublic abstract class BaseDocument {\n    public int Id { get; set; }\n    protected void Audit(string by) { /* shared code */ }\n    public abstract bool Validate();\n}",
  project: "In Smart Documents the document engine has an abstract `BaseDocument` holding the common audit and header logic, and each document type overrides `Validate()`. The storage and SAP sides sit behind interfaces — `IDocumentRepository`, `ISapClient` — so the controller depends on the contract and I can swap or stub the SAP side without touching the engine.",
  remember: "Interface = what it must do. Abstract class = what it must do plus what it already knows."
},

{
  id: "cs-async-await", topic: "csharp", star: true,
  q: "How does async await work in C#?",
  tags: ["async await", "task", "asynchronous programming", "async programming", "what is async await and why does it matter", "explain async await what actually happens", "how do you implement async in c#", "is that project fully async", "is this project fully async", "cpu-bound vs io-bound which needs async", "what problem does async solve"],
  simple: "async/await lets a thread walk away from a slow job — a database call or an HTTP call — instead of standing and waiting. When the result arrives, the method carries on from the same line.",
  answer: "Marking a method `async` lets me use `await`. At the await point, the compiler builds a state machine: the method returns to the caller, the thread goes back to the pool, and when the awaited Task completes the remainder is scheduled to continue.\nThe gain is throughput, not raw speed — one request is not faster, but the server handles many more at once because threads are not blocked on I/O.\nRules I stick to: async all the way down, return `Task`/`Task<T>` not `void` except for event handlers, and never call `.Result` or `.Wait()` on an async call because that can deadlock and wastes a thread.",
  code: "public async Task<IActionResult> GetVendor(int id)\n{\n    var vendor = await _repo.GetAsync(id);      // thread is released here\n    if (vendor == null) return NotFound();\n    return Ok(vendor);\n}",
  project: "All the Vendor Portal API endpoints are async end to end — controller, service, and EF Core calls use `ToListAsync`/`FirstOrDefaultAsync`. The portal is used by many suppliers at once and the reporting screens hit big tables, so keeping threads free is what lets a single IIS worker hold the load.",
  remember: "await does not make it faster — it frees the thread while waiting."
},

{
  id: "cs-task-thread", topic: "csharp",
  q: "Task vs Thread",
  tags: ["task vs thread", "threadpool", "parallel", "task", "how do you run long tasks without blocking the user"],
  simple: "A Thread is one real worker you create and manage. A Task is a unit of work you hand to the pool, and .NET decides which worker runs it.",
  answer: "`Thread` is a low-level OS thread — expensive to create (around 1 MB stack), and I own its lifetime. `Task` is a higher-level promise of work, usually scheduled on the thread pool, and it gives me continuations, cancellation tokens, exception capture, and `async/await` support for free.\nFor I/O-bound work a Task may use no thread at all while it waits. For CPU-bound work `Task.Run` borrows a pool thread.\nI only create a raw Thread for a long-running dedicated loop; otherwise Task is the right default.",
  project: "For background work in SAP Synchronization Services I did not hand-roll threads at all — Hangfire owns the worker side and my job methods are async Tasks. Inside a sync batch I use `await Task.WhenAll(...)` for a controlled set of independent calls instead of looping one by one.",
  remember: "Thread = a worker. Task = a job. Hand over jobs, not workers."
},

{
  id: "cs-ienumerable-iqueryable", topic: "csharp", star: true,
  q: "IEnumerable vs IQueryable",
  tags: ["ienumerable vs iqueryable", "iqueryable", "linq to sql", "deferred execution", "ienumerable vs iqueryable very commonly asked"],
  simple: "IQueryable builds the SQL and makes the database do the filtering. IEnumerable pulls the rows into memory first and then filters in C#. Picking the wrong one can drag a whole table across the wire.",
  answer: "`IQueryable<T>` holds an expression tree. Any Where/OrderBy/Skip/Take I chain is translated into the SQL that EF Core finally sends, so filtering and paging happen on the server.\n`IEnumerable<T>` works on objects already in memory with LINQ to Objects. The moment I cast a DbSet to IEnumerable — or call `.ToList()` early — the rest of the query runs in C# after the full result set has been fetched.\nSo repository methods that are still composable return IQueryable; once I have the final data I return IEnumerable or a List.",
  code: "// Good — one filtered, paged SQL statement\nvar page = await _db.PurchaseOrders\n    .Where(p => p.VendorId == id && p.Status == \"OPEN\")\n    .OrderByDescending(p => p.CreatedOn)\n    .Skip(skip).Take(50).ToListAsync();\n\n// Bad — pulls every PO into memory, then filters\nvar bad = _db.PurchaseOrders.ToList().Where(p => p.VendorId == id);",
  project: "This was a real fix on the Vendor Portal PO listing. The original code materialised the list and filtered in C#; moving the filter and paging into the IQueryable chain so SQL Server did the work with a supporting index is part of how those screens got to sub-second response.",
  remember: "IQueryable = filter in SQL. IEnumerable = filter in memory."
},

{
  id: "cs-deferred", topic: "csharp",
  q: "What is deferred execution in LINQ?",
  tags: ["deferred execution", "lazy evaluation linq", "tolist", "linq execution", "what is a closure trap in linq"],
  simple: "A LINQ query is a recipe, not the food. Nothing runs until something asks for the results.",
  answer: "LINQ operators like Where, Select, OrderBy are lazy — they only build the query. Execution happens when I enumerate it: `foreach`, `ToList()`, `ToArray()`, `First()`, `Count()`, `Any()`.\nTwo consequences I watch for: the query can run twice if I enumerate it twice (two database round trips), and with EF Core a deferred query enumerated after the DbContext is disposed throws. So I compose freely, then materialise once with `ToListAsync()` at the point where I actually need the data.",
  project: "In the procurement reports I build the base query, conditionally add filters from the search panel, and only then call `ToListAsync()` — one trip, one SQL statement. The bug I had to fix in older code was a query being enumerated once for `Count()` and again for the grid, which doubled the database hits on a heavy screen.",
  remember: "Query is built lazily; ToList() is the trigger."
},

{
  id: "cs-dispose", topic: "csharp",
  q: "Garbage collection, IDisposable and the using statement",
  tags: ["garbage collection", "idisposable", "using statement", "dispose", "dispose pattern", "memory management", "finalizer", "memory leak", "managed vs unmanaged code", "how does garbage collection work", "what are generations and the loh", "what is a destructor"],
  simple: "The garbage collector cleans up memory for you, but it knows nothing about files, connections or sockets. Those you must close yourself — that is what IDisposable and using are for.",
  answer: "The GC manages the heap in generations: Gen 0 collects often and cheaply, survivors move to Gen 1 and Gen 2, and large objects go to the LOH. I do not free managed memory myself.\nUnmanaged resources — SQL connections, file handles, HttpClient streams — are different. A class that owns one implements `IDisposable`, and I wrap it in `using` so Dispose runs even if an exception is thrown. `using var x = ...` disposes at end of scope.\nThe classic leaks I look for are undisposed connections, event handlers never unsubscribed, and static collections that keep growing.",
  code: "using (var conn = new SqlConnection(_cs))\nusing (var cmd  = new SqlCommand(sql, conn))\n{\n    await conn.OpenAsync();\n    using var rdr = await cmd.ExecuteReaderAsync();\n    while (await rdr.ReadAsync()) { /* map */ }\n}   // connection returned to the pool here, even on error",
  project: "Smart Documents still has ADO.NET code for the heavy report queries, and every connection, command and reader there is inside a using block — without it, connections stay out of the pool and the app starts failing under load. On the EF Core side the DbContext is disposed by the DI container with a scoped lifetime, so I do not dispose it myself.",
  remember: "GC handles memory. using handles everything else."
},

{
  id: "cs-exception", topic: "csharp",
  q: "How do you handle exceptions in C#?",
  tags: ["exception handling", "try catch finally", "throw vs throw ex", "global exception handling", "how do you handle exceptions across the application", "exception handling in a real application"],
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
  tags: ["thread safety", "lock", "race condition", "concurrentdictionary", "deadlock", "what is a race condition", "how do you make lazy initialisation thread-safe", "what are your options for thread safety"],
  simple: "Two threads touching the same data at the same time can corrupt it. You either stop sharing the data, or you let only one thread in at a time.",
  answer: "Preferred order:\n1. Avoid shared mutable state — in ASP.NET Core most state is per request anyway.\n2. Use immutable objects.\n3. Use concurrent collections — `ConcurrentDictionary`, `ConcurrentQueue`.\n4. Only then `lock` on a private readonly object, around the smallest possible block.\nNever lock on `this`, a string, or a public object. Do not `await` inside a `lock` — use `SemaphoreSlim` for async mutual exclusion. Deadlock comes from two locks taken in different order, so if I need two I always take them in the same order.",
  code: "private static readonly object _gate = new object();\nlock (_gate) { _counter++; }\n\n// async version\nawait _semaphore.WaitAsync();\ntry { await DoWorkAsync(); } finally { _semaphore.Release(); }",
  project: "Where it mattered for us was the SAP sync jobs — two Hangfire workers could pick up overlapping work, so the protection is at the data level: a status flag updated in a transaction so only one worker claims a batch, plus idempotent handlers. That is safer than in-process locking, because locks do not survive multiple IIS worker processes.",
  remember: "Best thread safety is no shared state; lock is the last resort."
},

{
  id: "cs-dotnet-core-framework", topic: "csharp",
  q: ".NET Framework vs .NET Core / .NET 8",
  tags: [".net framework vs .net core", ".net 8", "cross platform", "migration", "how much of the estate is still net framework", "which asp net have you worked on web forms mvc or core"],
  simple: ".NET Framework is the old Windows-only one. .NET Core and now .NET 8 are the rebuilt, cross-platform, faster version, and that is where all new work goes.",
  answer: "Framework 4.8 is Windows-only, tied to IIS and the machine-wide install, and is in maintenance — it gets security fixes only.\n.NET 8 is cross-platform, side-by-side versioned, can be self-contained, has built-in DI, configuration and logging, Kestrel, and much better performance. It is an LTS release.\nDifferences that show up in real work: `Startup.cs`/`Program.cs` and the middleware pipeline instead of Global.asax and modules, built-in DI instead of Unity or Ninject, appsettings.json instead of web.config, and `System.Web`/HttpContext.Current being gone.",
  project: "Our platform is a mixed estate and I work across it — .NET 8 / ASP.NET Core for the Vendor Portal APIs and new services, MVC 5 on .NET Framework 4.8 for the established procurement modules we still maintain. New modules go on .NET 8; the legacy ones get maintained and hardened rather than rewritten wholesale.",
  remember: ".NET 8 = cross-platform, DI built in, config in JSON. Framework = Windows and IIS only."
},

{
  id: "cs-partial", topic: "csharp",
  q: "What are partial classes and partial methods?",
  tags: ["partial class", "partial method", "sealed static partial", "split class across files", "generated code"],
  simple: "A partial class is one class written across two or more files. The compiler stitches them together. It exists mainly so generated code and your code can live in the same class without overwriting each other.",
  answer: "`partial` lets a class, struct, interface or method be split across files in the same assembly. The compiler merges them into one type, so there is no runtime cost and no separate type.\n**Where it genuinely matters**: generated code. EF scaffolding, Razor, designer files and source generators produce one part of the class; your hand-written logic goes in the other part. Regenerating overwrites only the generated file and leaves your code untouched. Without it, every regeneration would destroy your work.\n**Partial methods** are a declaration in one part with an optional implementation in the other. If nobody implements it, the compiler removes the call entirely — so a hook can exist with zero cost when unused. Classically they had to return void and be private; modern C# relaxes that if the method is implemented.\n**What it is not**: a legitimate way to manage a 3000-line class. Splitting a god class across four files hides the problem rather than fixing it — the fix is separate classes with separate responsibilities.\nOften asked together with `sealed` (no inheritance) and `static` (no instances), so be ready to define all three in one breath.",
  code: "// Vendor.Generated.cs  (regenerated by tooling)\npublic partial class Vendor { public int Id { get; set; } public string Name { get; set; } }\n\n// Vendor.cs  (hand written, survives regeneration)\npublic partial class Vendor {\n    public bool IsApprovable() => !string.IsNullOrWhiteSpace(Gstin) && Status == \"PENDING\";\n}",
  remember: "One class, many files, merged at compile time. For generated code — not for hiding a god class."
},

{
  id: "cs-this-base", topic: "csharp",
  q: "What do the this and base keywords do?",
  tags: ["this keyword", "base keyword", "constructor chaining", "base constructor", "this vs base c#"],
  simple: "this refers to the current object; base refers to the parent class part of it. Both are also used to chain constructors so initialisation code is written once.",
  answer: "**`this`** — the current instance. Used to disambiguate a field from a parameter with the same name, to pass the current object to something else, and as the first parameter of an extension method. `this(...)` in a constructor calls another constructor of the **same** class.\n**`base`** — the base class portion of this object. `base.Method()` calls the parent implementation, which is how an override extends rather than replaces behaviour. `base(...)` in a constructor calls the parent constructor.\n**Constructor chaining order**: the base constructor runs first, then the derived one. That is why a virtual method called from a base constructor can run before the derived fields are initialised — a genuine trap worth mentioning, and the reason you should not call virtual methods from constructors.\nIn practice `base.Method()` inside an override is the common one — take the parent's result and adjust it, rather than copying the parent's logic.",
  code: "public class BaseDocument {\n    protected BaseDocument(int id) { Id = id; }\n    public virtual decimal Total() => Lines.Sum(l => l.Amount);\n}\n\npublic class Invoice : BaseDocument {\n    public Invoice(int id) : base(id) { }                  // parent constructor\n    public Invoice() : this(0) { }                         // same-class constructor\n    public override decimal Total() => base.Total() - Discount;   // extend, not replace\n}",
  project: "The document engine uses `base.Total()` style overriding — each document type adjusts the shared calculation rather than reimplementing it, which is why a change to the base rule reaches every type.",
  remember: "this = this object or this class's other constructor. base = the parent's member or constructor. Base runs first."
},

{
  id: "cs-result-deadlock", topic: "csharp", star: true,
  q: "What is wrong with .Result and .Wait()?",
  tags: [".result deadlock", ".wait deadlock", "async deadlock", "sync over async", "blocking async", "configureawait", "why does result deadlock on the ui thread"],
  simple: "They block the current thread until the async work finishes. In a framework with a synchronisation context that is a classic deadlock, and even where it does not deadlock it wastes a thread and hides the real exception.",
  answer: "**Three separate problems:**\n1. **Deadlock.** In ASP.NET (classic) and WinForms/WPF there is a synchronisation context that wants the continuation to resume on the original thread. `.Result` is blocking that very thread, so the continuation can never run and both sides wait forever. ASP.NET **Core** has no synchronisation context, so it usually does not deadlock — but it is still wrong.\n2. **Thread starvation.** Even without a deadlock, the thread is blocked doing nothing while the I/O completes. Under load that exhausts the thread pool, and the symptom is an application that gets slower and slower rather than one that fails cleanly.\n3. **Worse exceptions.** `.Result` wraps whatever was thrown in an `AggregateException`, so the real exception is one level down and the stack trace is less useful.\n**The fix is to go async all the way** — `await` up through the service and the controller. `ConfigureAwait(false)` in library code avoids capturing the context and prevents the deadlock, but it is a mitigation, not permission to block.\n**The one place blocking is acceptable**: the top of a console `Main` in older C#, where there is no caller to await you.",
  code: "// deadlocks under a synchronisation context, wastes a thread everywhere\nvar vendor = _repo.GetAsync(id).Result;\n\n// correct - async all the way up\nvar vendor = await _repo.GetAsync(id);\n\n// library code that must not capture the context\nvar data = await _http.GetAsync(url).ConfigureAwait(false);",
  project: "This is one of the things I look for in code review, because it is easy to introduce when someone makes an existing synchronous method call a new async one. The Vendor Portal endpoints are async end to end — controller, service and EF Core — specifically so no layer is tempted to block.",
  remember: "Blocks the thread, deadlocks under a sync context, and hides the exception. Async all the way up."
},

{
  id: "cs-access", topic: "csharp", star: true,
  q: "What are the access modifiers in C#?",
  tags: ["access modifiers", "public private protected internal", "protected internal", "private protected", "encapsulation modifiers"],
  simple: "They control who can see a member. public = everyone, private = only this class, protected = this class and its children, internal = anything in this assembly.",
  answer: "- **public** — visible everywhere.\n- **private** — only inside the same class. The **default** for class members, and the one to start from.\n- **protected** — this class and anything deriving from it.\n- **internal** — anywhere in the same assembly. The default for a top-level class.\n- **protected internal** — protected **OR** internal: derived classes anywhere, plus anything in this assembly.\n- **private protected** — protected **AND** internal: derived classes, but only those in this assembly.\n- **file** (C# 11) — visible only within the same file; mostly for source generators.\nThe rule I follow is to start private and widen only when something genuinely needs it. A public field is almost always wrong — expose a property so you keep the option of validating or changing the implementation later.\nFor a library, `internal` plus `InternalsVisibleTo` is how you expose something to your own test project without making it part of the public API.",
  code: "public class Vendor\n{\n    private  readonly List<string> _audit = new();   // nobody outside\n    protected string Code { get; set; }              // this class + children\n    internal  bool IsDirty { get; set; }              // this assembly\n    public    string Name { get; set; }               // everyone\n}",
  project: "In the document engine the base class exposes `protected` members for the derived document types and keeps its audit list private, so a document type can extend behaviour without being able to corrupt the audit trail. Injected dependencies are always `private readonly` — nothing outside the class can reassign them.",
  remember: "Start private, widen only when needed. Members default to private, top-level classes to internal."
},

{
  id: "cs-ref-out", topic: "csharp", star: true,
  q: "ref, out, in, params and optional parameters",
  tags: ["ref vs out", "out parameter", "in parameter", "params keyword", "optional parameters", "named arguments", "pass by reference"],
  simple: "ref passes a variable itself rather than a copy, and it must already have a value. out is the same but the method must assign it. params lets you pass any number of arguments. Optional parameters have a default so the caller can skip them.",
  answer: "- **ref** — passes the variable by reference; it must be initialised **before** the call, and the method may or may not change it.\n- **out** — also by reference, but the caller does **not** need to initialise it and the method **must** assign it before returning. The classic use is `TryParse` and `TryGetValue`, where you want a result plus a success flag.\n- **in** — by reference but **read-only**. Used to avoid copying a large struct without allowing changes.\n- **params** — a variable number of arguments; must be the last parameter, and there can be only one.\n- **Optional parameters** — a default value in the signature. The caveat worth knowing: the default is baked into the **calling** assembly at compile time, so changing it in a library does not affect callers until they recompile. For a public API an overload is safer.\n- **Named arguments** — pass by name to skip optionals or make a call readable: `Save(id: 7, notify: false)`.\nSince C# 7 you can declare an out variable inline, which is how everyone writes TryParse now.",
  code: "if (int.TryParse(text, out var qty))      // out, declared inline\n    Use(qty);\n\nvoid Swap(ref int a, ref int b) => (a, b) = (b, a);\n\ndecimal Total(params decimal[] amounts) => amounts.Sum();\nTotal(10m, 20m, 30m);\n\nTask SaveAsync(int id, bool notify = true, CancellationToken ct = default);\nawait SaveAsync(7, notify: false);        // named argument",
  project: "The pattern that appears most in our code is `TryGetValue` and `TryParse` with `out` — particularly in the Excel bulk upload parser, where a cell that will not convert has to become a row-level validation message rather than an exception that kills the whole file.",
  remember: "ref needs a value going in, out must be set coming back, in is read-only, params is variable count."
},

{
  id: "cs-var-dynamic", topic: "csharp",
  q: "var vs dynamic vs object",
  tags: ["var vs dynamic", "dynamic keyword", "implicitly typed", "object type", "late binding"],
  simple: "var is still strongly typed — the compiler works out the type for you. dynamic skips type checking until the code runs. object is the base type everything inherits from, and you must cast it back.",
  answer: "- **var** — compile-time inference. `var x = 5;` *is* an `int`, and assigning a string to it later will not compile. It is a typing convenience, not a type. It must be initialised on the same line, and it cannot be a field or a parameter.\n- **dynamic** — type resolution is deferred to runtime. The compiler accepts any member call; if it does not exist you get a `RuntimeBinderException` when the line executes. No IntelliSense, slower, and errors surface in front of a user.\n- **object** — the root of every type. You can hold anything but you must cast it back, value types get boxed, and the compiler will not let you call members that are not on object.\nMy position: `var` freely when the type is obvious from the right-hand side, and spelled-out types when it is not (`var result = Process();` tells the reader nothing). `dynamic` only for genuine interop — COM, or a loosely shaped JSON payload — and even there I prefer deserialising into a real class.",
  code: "var list = new List<Vendor>();     // compile-time List<Vendor>\n\ndynamic d = GetPayload();\nd.AnyMethodAtAll();                // compiles; may explode at runtime\n\nobject o = 42;                     // boxed\nint back = (int)o;                 // needs a cast",
  remember: "var = compiler infers, still static. dynamic = checked at runtime. object = cast it back."
},

{
  id: "cs-enum", topic: "csharp",
  q: "What are enums, and what is [Flags]?",
  tags: ["enum", "flags enum", "enum vs const", "bitwise enum", "enum parse"],
  simple: "An enum is a named set of fixed values — Status.Open, Status.Approved — instead of loose numbers or strings scattered through the code. [Flags] lets one value hold a combination.",
  answer: "An enum is a value type backed by `int` by default (changeable to `byte`, `long` and so on). It gives you readable, compile-checked constants and makes a `switch` exhaustive-looking.\nThings worth knowing:\n- The default value is **0**, so always define a sensible zero member (`None`, `Unknown`); an uninitialised enum is 0 whether or not that member exists.\n- An enum is **not** validated on cast — `(Status)99` compiles and runs. Use `Enum.IsDefined` when the value came from outside.\n- `Enum.Parse`/`TryParse` convert from a string; `.ToString()` goes back.\n- **[Flags]** marks it as a bit field: give members powers of two so they can be combined with `|` and tested with `HasFlag`.\n**Storing them**: persisting the `int` is compact but renumbering later silently corrupts history, so for anything long-lived I store the string or keep the numbers frozen with explicit values.",
  code: "public enum PoStatus { None = 0, Draft = 1, Submitted = 2, Approved = 3 }\n\n[Flags]\npublic enum Permissions { None = 0, Read = 1, Write = 2, Approve = 4, Export = 8 }\n\nvar p = Permissions.Read | Permissions.Approve;\nif (p.HasFlag(Permissions.Approve)) { ... }",
  project: "Document and purchase-order statuses are enums in code with explicit values that never get renumbered, because the database holds history against them. The permission side is closer to the Flags idea — a role carries a combination rather than a single value.",
  remember: "Always define 0. Casts are not validated. [Flags] needs powers of two."
},

{
  id: "cs-yield", topic: "csharp",
  q: "What does yield return do?",
  tags: ["yield return", "iterator", "ienumerable yield", "lazy enumeration", "generator"],
  simple: "yield return hands back one item at a time without building the whole list first. The method pauses where it is and continues from there on the next item.",
  answer: "`yield return` makes a method an **iterator**. The compiler turns it into a state machine: nothing runs until you enumerate it, and each `MoveNext()` executes up to the next `yield return` and pauses.\nWhy it is useful:\n- **Memory** — stream a million rows without materialising a million-item list.\n- **Laziness** — combined with `Take(10)`, only ten items are ever produced.\n- **Readability** — filtering or transforming in a loop without building a temporary list.\n`yield break` ends the sequence early.\nThe traps: because it is deferred, an exception in the method surfaces when the caller enumerates, not when it is called — so argument validation belongs in a wrapper method that calls the iterator. And you cannot `yield` inside a try/catch that has a catch block.\nIf you need the results more than once, materialise with `ToList()` — otherwise you re-run the whole thing each time you enumerate.",
  code: "public static IEnumerable<string> ReadLines(string path)\n{\n    using var r = new StreamReader(path);\n    string line;\n    while ((line = r.ReadLine()) != null)\n    {\n        if (line.Length == 0) continue;\n        yield return line;              // one at a time, file stays open\n    }\n}\n\nforeach (var l in ReadLines(p).Take(10)) { }   // reads 10 lines, not the file",
  project: "The bulk-upload parser streams rows this way rather than loading an entire file into a list first — on a large Excel upload that is the difference between a steady memory profile and a spike.",
  remember: "Produces one item at a time, lazily. Validate arguments in a wrapper, because nothing runs until enumeration."
},

{
  id: "cs-equals", topic: "csharp", star: true,
  q: "Equals vs == vs ReferenceEquals, and why override GetHashCode?",
  tags: ["equals vs ==", "gethashcode", "referenceequals", "value equality", "override equals", "object equality"],
  simple: "== compares references for classes and values for structs and strings. Equals can be overridden to mean value equality. If you override Equals you must override GetHashCode, or dictionaries and sets will misbehave.",
  answer: "- **==** is an operator resolved at compile time. For reference types it compares references unless the type overloads it — `string` does, which is why two identical strings compare equal.\n- **Equals(object)** is a virtual method, so it is resolved at runtime and can be overridden to mean value equality. `record` types do this for you.\n- **ReferenceEquals** always compares identity, whatever anyone overloaded.\n**Why GetHashCode matters**: `Dictionary` and `HashSet` find a bucket using the hash code, and only then compare with Equals. If two objects are Equal but return different hash codes they land in different buckets, and the dictionary will insist your key is not there even though an equal key is. That is a genuinely confusing bug.\nThe contract: equal objects **must** return the same hash code; different objects *may* collide. And the hash must be stable — never build it from a mutable property, because mutating a key after inserting it makes the entry unreachable.\nIn modern C# the easy answer is to use a `record`, or implement `IEquatable<T>` and use `HashCode.Combine`.",
  code: "public class Vendor : IEquatable<Vendor>\n{\n    public string Code { get; init; }                       // immutable key\n    public bool Equals(Vendor other) => other is not null && Code == other.Code;\n    public override bool Equals(object o) => Equals(o as Vendor);\n    public override int GetHashCode() => HashCode.Combine(Code);\n}\n\n// or just:\npublic record VendorDto(string Code, string Name);          // value equality for free",
  remember: "Override Equals, override GetHashCode. Hash from an immutable field, or use a record."
},

{
  id: "cs-pattern-matching", topic: "csharp",
  q: "Pattern matching and switch expressions",
  tags: ["pattern matching", "switch expression", "is pattern", "when clause", "property pattern", "modern c#", "what newer c# features do you use", "what newer c# features do you actually use"],
  simple: "Pattern matching lets you test a value's shape and pull data out of it in one step. A switch expression is a switch that returns a value instead of running statements.",
  answer: "The forms I actually use:\n- **Type pattern** — `if (o is Vendor v)` tests and assigns in one line, replacing the old `as` plus null-check.\n- **switch expression** — `=>` arms that produce a value, with `_` as the default. Much tighter than a statement switch full of returns.\n- **Property patterns** — `{ Status: \"OPEN\", Total: > 10000 }` matches on the shape of an object.\n- **Relational and logical patterns** — `> 100`, `is not null`, `is 1 or 2`.\n- **Tuple patterns** — switch on more than one value at once.\n- **List patterns** (C# 11) — match the shape of a collection.\nThe compiler warns on a non-exhaustive switch expression, which catches the enum member somebody added and forgot to handle.\nThe caution: a switch expression that grows ten arms with nested conditions has become business logic in disguise — at that point it probably wants to be polymorphism, which is the Open/Closed argument.",
  code: "var band = po switch\n{\n    { Status: \"DRAFT\" }               => \"Not submitted\",\n    { Total: > 1_000_000 }            => \"Board approval\",\n    { Total: > 100_000, IsUrgent: true } => \"Director, expedited\",\n    null                              => throw new ArgumentNullException(nameof(po)),\n    _                                 => \"Manager\"\n};\n\nif (doc is Invoice inv && inv.Total > 0) Post(inv);   // test and assign",
  remember: "is-pattern tests and assigns. switch expressions return a value and warn when not exhaustive."
},

{
  id: "cs-tuples", topic: "csharp",
  q: "Tuples and deconstruction",
  tags: ["tuple", "valuetuple", "deconstruct", "return two values", "named tuple"],
  simple: "A tuple lets a method return more than one value without defining a class for it. Deconstruction unpacks it straight into variables.",
  answer: "`ValueTuple` (the `(int, string)` syntax from C# 7) is a **struct**, so it avoids the allocation the old `Tuple<T>` class had, and the elements can be **named**: `(bool ok, string error)`.\nWhere it fits: a private or internal method that genuinely returns two related values — a result plus a reason, a min plus a max. It saves inventing a type nobody else needs.\nWhere it does not: a **public API contract**. Tuple element names are compiler sugar and are not part of the runtime type, so a DTO or a record communicates intent far better to a caller. If the two values have meaning together, they want to be a type.\n**Deconstruction** unpacks a tuple — or any type with a `Deconstruct` method — into separate variables, and the same syntax gives you the tuple swap with no temporary variable.",
  code: "private (bool ok, string error) Validate(VendorDto d)\n{\n    if (string.IsNullOrWhiteSpace(d.Gstin)) return (false, \"GSTIN required\");\n    return (true, null);\n}\n\nvar (ok, error) = Validate(dto);          // deconstructed\nif (!ok) return BadRequest(error);\n\n(a, b) = (b, a);                          // swap, no temp",
  remember: "Great for an internal two-value return, wrong for a public contract. Deconstruct with var (x, y) = ..."
},

{
  id: "cs-reflection", topic: "csharp",
  q: "What is reflection, and what are attributes?",
  tags: ["reflection", "attributes", "custom attribute", "gettype", "metadata", "activator createinstance"],
  simple: "Reflection lets code inspect types at runtime — list properties, read attributes, create an object from a type name. Attributes are metadata you stick on a class or member for something else to read.",
  answer: "**Reflection** reads type metadata at runtime: `GetType()`, `GetProperties()`, `GetMethods()`, `Activator.CreateInstance`, and invoking a method by name.\n**Attributes** are declarative metadata — `[Required]`, `[Authorize]`, `[Serializable]`, or your own deriving from `Attribute`. On their own they do nothing; something reads them with reflection and acts.\nTogether they are what makes the frameworks you use every day work: model binding and validation read attributes off your DTO, ASP.NET routing finds controllers and actions, DI scans for registrations, and serializers walk your properties.\n**The honest caveat**: reflection is slow relative to direct calls, it defeats compile-time checking (a renamed property breaks a string-based lookup at runtime), and it can be trimmed away by AOT publishing. So I use it for genuinely generic infrastructure — mapping, a plugin loader, reading an attribute once at startup and caching the result — not inside a hot loop.",
  code: "// a custom attribute, plus reflection that reads it\n[AttributeUsage(AttributeTargets.Property)]\npublic class ExcelColumnAttribute : Attribute\n{\n    public string Name { get; }\n    public ExcelColumnAttribute(string name) => Name = name;\n}\n\npublic class VendorRow { [ExcelColumn(\"Vendor Code\")] public string Code { get; set; } }\n\nforeach (var p in typeof(VendorRow).GetProperties())\n{\n    var col = p.GetCustomAttribute<ExcelColumnAttribute>();\n    if (col != null) map[col.Name] = p;        // built once, then cached\n}",
  project: "The Excel bulk upload mapper is exactly this shape — the column-to-property map is built from attributes once and cached, so the reflection cost is paid at startup rather than per row. That caching is the difference between a neat design and a slow one.",
  remember: "Attributes are metadata; reflection reads them. Build the map once and cache it."
},

{
  id: "cs-json", topic: "csharp", star: true,
  q: "How do you serialize JSON in .NET?",
  tags: ["json serialization", "system.text.json", "newtonsoft", "jsonserializer", "camelcase json", "deserialize"],
  simple: "System.Text.Json is the built-in one and the default for ASP.NET Core. Newtonsoft (Json.NET) is the older library, slower but more forgiving and more featureful.",
  answer: "**System.Text.Json** — built in, fast, low allocation, and what ASP.NET Core uses by default. It is **case-insensitive on read only if you ask**, and serialises camelCase by default in ASP.NET Core via the web defaults.\n**Newtonsoft.Json** — more permissive and more configurable: `TypeNameHandling`, custom contract resolvers, more lenient parsing of odd payloads. Projects on it usually stay on it.\nThings that actually bite:\n- **Property naming** — the API sends camelCase and C# is PascalCase; configure the naming policy rather than renaming your properties.\n- **Circular references** — serialising EF entities with navigation properties loops. Another reason to return DTOs rather than entities.\n- **Dates** — ISO 8601 by default; be explicit about UTC.\n- **Ignoring members** — `[JsonIgnore]` for things that must never go on the wire.\n- **Nulls** — decide whether to omit them, because the client contract depends on it.",
  code: "var opts = new JsonSerializerOptions\n{\n    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,\n    PropertyNameCaseInsensitive = true,\n    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull\n};\n\nvar json = JsonSerializer.Serialize(dto, opts);\nvar back = JsonSerializer.Deserialize<VendorDto>(json, opts);",
  project: "The React front end and the .NET API agree on camelCase, and the API returns DTOs rather than EF entities — which avoids both the circular-reference problem and leaking internal columns into the payload.",
  remember: "System.Text.Json by default. Watch camelCase, circular references from entities, and date handling."
},

{
  id: "cs-cancellation", topic: "csharp",
  q: "What is a CancellationToken and when do you use one?",
  tags: ["cancellation token", "cancellationtoken", "cancel async operation", "cancellationtokensource", "operationcanceledexception", "request aborted"],
  simple: "A CancellationToken is a signal that says stop. The caller can cancel, and well-behaved async code checks the token and gives up instead of finishing work nobody wants.",
  answer: "`CancellationTokenSource` produces the token and triggers the cancellation; the token is passed down through the call chain. Cancellation is **cooperative** — nothing is killed, the work has to check.\nHow to honour it: pass the token into every async call that accepts one (`ToListAsync(ct)`, `ExecuteReaderAsync(ct)`, `HttpClient` calls), and inside a long loop call `ct.ThrowIfCancellationRequested()`.\nWhere it matters most in a web app: **`HttpContext.RequestAborted`**. When a user closes the tab or navigates away during a slow report, that token fires — and if you pass it down, SQL Server stops working on a query whose result nobody will ever see. On a busy server that is real capacity recovered.\nIt also gives you timeouts: `new CancellationTokenSource(TimeSpan.FromSeconds(30))`.\n**Handling**: catch `OperationCanceledException` and treat it as *not an error* — do not log it as a failure, because a user navigating away is normal.",
  code: "[HttpGet]\npublic async Task<IActionResult> Search([FromQuery] Filter f, CancellationToken ct)\n{\n    var rows = await _db.PurchaseOrders\n        .Where(p => p.VendorId == f.VendorId)\n        .ToListAsync(ct);          // abandoned request stops the query too\n    return Ok(rows);\n}",
  project: "The React screens abort in-flight requests on unmount with an AbortController, which arrives at the API as a cancelled request. Passing the token down to EF Core is what makes that saving real rather than cosmetic — the database stops working on the query as well.",
  remember: "Cooperative: pass it down and check it. RequestAborted stops work for a user who already left."
},

{
  id: "cs-collection-interfaces", topic: "csharp",
  q: "IEnumerable vs ICollection vs IList vs IReadOnlyList",
  tags: ["ienumerable vs ilist", "icollection", "ireadonlylist", "collection interfaces", "which interface to return"],
  simple: "They are a ladder of capability. IEnumerable just lets you walk the items. ICollection adds Count and Add/Remove. IList adds indexing. IReadOnly versions give access without mutation.",
  answer: "- **IEnumerable&lt;T&gt;** — iterate, nothing else. No Count, no index. Can be lazy, so enumerating twice may do the work twice.\n- **ICollection&lt;T&gt;** — adds `Count`, `Add`, `Remove`, `Contains`. It is materialised, so Count is cheap.\n- **IList&lt;T&gt;** — adds indexing and ordering (`this[i]`, `Insert`, `IndexOf`).\n- **IReadOnlyCollection&lt;T&gt;** / **IReadOnlyList&lt;T&gt;** — Count, and indexing for the list version, with no mutation methods.\n**The rule I use**: accept the *least* capable type that does the job (take `IEnumerable<T>` as a parameter) and return the *most useful honest* one. For a method that has already materialised its results, returning `IReadOnlyList<T>` tells the caller it is safe to count and index, and that they must not modify it. Returning `List<T>` hands out a mutable reference to your internal state.\nThe practical trap: taking `IEnumerable<T>` and calling `.Count()` then enumerating again can execute a deferred query twice. Materialise once with `ToList()` if you need both.",
  code: "// accept the least, return the most useful honest type\npublic IReadOnlyList<VendorDto> Search(IEnumerable<string> codes)\n{\n    var set = new HashSet<string>(codes);\n    return _db.Vendors.Where(v => set.Contains(v.Code))\n                      .Select(Map).ToList();\n}",
  project: "Repository methods return `IReadOnlyList<T>` for materialised results and `IQueryable<T>` only where the caller is meant to compose further — that distinction is what stops a caller accidentally filtering in memory after the data has already been fetched.",
  remember: "Accept IEnumerable, return IReadOnlyList. Never hand out your internal List."
},

{
  id: "cs-datetime", topic: "csharp", star: true,
  q: "DateTime vs DateTimeOffset, and handling time zones",
  tags: ["datetime", "datetimeoffset", "utc", "timezone", "datetime.now vs utcnow", "date handling"],
  simple: "DateTime does not know what time zone it is in. DateTimeOffset carries the offset from UTC with it. Store UTC, display local — and never use DateTime.Now on a server.",
  answer: "`DateTime` has a `Kind` (Utc, Local or **Unspecified**), and Unspecified is the default — which means most DateTime values in a system carry no zone information at all. That is where the bugs come from.\n`DateTimeOffset` stores the point in time **plus** its offset from UTC, so it is unambiguous. It is the better default for anything timestamped.\n**The rules I follow:**\n- **`DateTime.UtcNow` on the server, never `DateTime.Now`.** `Now` gives the server's local time, which breaks the moment the server moves, the hosting region changes, or daylight saving shifts.\n- **Store UTC**, convert to the user's zone for display only.\n- Use `TimeZoneInfo.ConvertTimeFromUtc` with an IANA/Windows zone id — never a fixed `AddHours(5.5)`, which is wrong for any zone with daylight saving.\n- SQL Server: `datetime2` over the old `datetime` (better range and precision), or `datetimeoffset` when you need the offset.\n- A **date of birth** is a date, not an instant — do not time-zone-convert it. `DateOnly` and `TimeOnly` (.NET 6+) exist for exactly that.\n**And daylight saving**: some local times do not exist and some happen twice. If you schedule anything, schedule it in UTC.",
  code: "var createdOn = DateTimeOffset.UtcNow;          // unambiguous\n\n// display in the user's zone\nvar tz = TimeZoneInfo.FindSystemTimeZoneById(\"India Standard Time\");\nvar local = TimeZoneInfo.ConvertTime(createdOn, tz);\n\n// a birthday is a date, not an instant\npublic DateOnly DateOfBirth { get; set; }",
  project: "Document and audit timestamps are the place this matters for us — a document posted at a boundary has to have one unambiguous time whichever server or user is looking at it. The same rule applies to the Hangfire schedules: scheduled in UTC, because a CRON in local time shifts twice a year.",
  remember: "UtcNow on the server, store UTC, convert for display. DateTimeOffset when the offset matters."
},

{
  id: "cs-class-object", topic: "csharp", star: true,
  q: "What is a class and an object?",
  tags: ["class and object", "what is a class", "what is an object", "instance", "oop basics", "class vs object"],
  simple: "A class is the blueprint. An object is a thing built from that blueprint. One Vendor class, thousands of vendor objects, each with its own data.",
  answer: "A **class** is a type definition — the fields, properties, methods and events a thing has. It is a template and occupies no memory of its own.\nAn **object** (an instance) is what `new` creates from that template on the heap. Each object has its own copy of the instance data and shares the class's code.\nThe parts of a class worth naming:\n- **Fields** — the data, normally private.\n- **Properties** — controlled access to that data.\n- **Methods** — the behaviour.\n- **Constructor** — runs on creation to put the object in a valid state.\n- **static** members — belong to the class, shared by all instances; `Vendor.Count` rather than `thisVendor.Count`.\nA class is a reference type, so a variable holds a reference to the object, not the object itself — which is why assigning one variable to another makes both point at the same instance.",
  code: "public class Vendor                    // the blueprint\n{\n    private readonly List<string> _audit = new();   // field\n    public int Id { get; init; }                     // property\n    public string Name { get; set; }\n    public Vendor(int id, string name)               // constructor\n    { Id = id; Name = name; }\n    public bool IsApprovable() => !string.IsNullOrWhiteSpace(Name);   // method\n}\n\nvar v1 = new Vendor(1, \"Acme\");        // objects — separate data\nvar v2 = new Vendor(2, \"Globex\");",
  remember: "Class = blueprint, no memory. Object = an instance on the heap with its own data."
},

{
  id: "cs-constructor", topic: "csharp", star: true,
  q: "What is a constructor? What types are there?",
  tags: ["constructor", "default constructor", "parameterised constructor", "static constructor", "constructor chaining", "destructor finalizer"],
  simple: "A constructor runs automatically when an object is created, and its job is to leave the object in a valid state. Same name as the class, no return type.",
  answer: "- **Default** — no parameters. The compiler supplies one **only** if you declare no constructor at all; adding any constructor removes it.\n- **Parameterised** — takes the values the object needs. This is how you make invalid objects impossible to create.\n- **Static constructor** — runs once, automatically, before the type is first used. No access modifier, no parameters. For one-time type-level setup.\n- **Copy constructor** — takes an instance of the same type; you write it yourself in C# (records give you `with` instead).\n- **Private constructor** — blocks outside creation; used by singletons and static factory methods.\n**Chaining**: `: this(...)` calls another constructor in the same class, `: base(...)` calls the parent's. The base constructor always runs **first**, which is why calling a virtual method from a constructor is dangerous — the derived fields are not initialised yet.\n**Destructor / finalizer** (`~ClassName`) is the opposite end and is almost never what you want: it is non-deterministic, delays collection, and the right answer for cleanup is `IDisposable` plus `using`.",
  code: "public class PurchaseOrder\n{\n    public PurchaseOrder(int vendorId)      // parameterised - the real one\n    {\n        if (vendorId <= 0) throw new ArgumentException(nameof(vendorId));\n        VendorId = vendorId;\n        CreatedOn = DateTime.UtcNow;\n    }\n    public PurchaseOrder() : this(0) { }    // chains to the one above\n    static PurchaseOrder() { /* once, before first use */ }\n}",
  project: "Every service in our code takes its dependencies through a parameterised constructor into `private readonly` fields — that is both the DI pattern and the guarantee that a half-built service cannot exist.",
  remember: "Runs on creation, same name, no return type. Declare one and you lose the free default."
},

{
  id: "cs-property-field", topic: "csharp", star: true,
  q: "Property vs field — and what are get/set, init and auto-properties?",
  tags: ["property vs field", "auto property", "getter setter", "init only", "backing field", "encapsulation property", "field vs property why not just use public fields"],
  simple: "A field is a plain variable. A property looks like a variable from outside but is really a pair of methods, so you can validate, compute or make it read-only without changing how callers use it.",
  answer: "A **field** stores data directly. A **property** exposes it through a `get` and optionally a `set`, which the compiler turns into methods.\nWhy that matters: a public field is a commitment you cannot take back. The day you need validation, logging or a computed value, changing a field to a property is a **binary breaking change** for any assembly compiled against it. So fields stay private and properties are the public surface.\nForms:\n- **Auto-property** — `public string Name { get; set; }` with a hidden backing field.\n- **Read-only** — `{ get; }`, settable only in the constructor.\n- **init-only** — `{ get; init; }` settable during object initialisation then frozen. The modern way to express immutability.\n- **Computed** — `public decimal Total => Qty * Rate;` with no stored value.\n- **Different accessibility** — `{ get; private set; }` is public to read, private to write.\nAlso: properties cannot be used as `ref`/`out` arguments, and data binding, serialisers and EF work with properties rather than fields.",
  code: "public class PoLine\n{\n    private decimal _qty;\n    public decimal Qty                      // validated on the way in\n    {\n        get => _qty;\n        set => _qty = value < 0 ? throw new ArgumentException(\"Qty cannot be negative\") : value;\n    }\n    public decimal Rate { get; init; }      // set once, then frozen\n    public decimal Total => Qty * Rate;     // computed, nothing stored\n}",
  remember: "Fields private, properties public. A public field cannot later become a property without breaking callers."
},

{
  id: "cs-clr-jit", topic: "csharp", star: true,
  q: "What is the CLR, IL and JIT? What does managed code mean?",
  tags: ["clr", "jit", "il", "msil", "managed code", "cts cls", "common language runtime", "assembly dll", "bcl"],
  simple: "Your C# is compiled to an intermediate language, not machine code. The CLR runs that, converting it to machine code as it goes and handling memory for you. Code the CLR manages is called managed code.",
  answer: "The pipeline: **C# → compiler → IL** (intermediate language) packaged in an **assembly** (.dll or .exe) with its **metadata** and manifest. At run time the **CLR** loads it and the **JIT** compiles each method to native machine code the first time it is called, then caches it — so you pay the compilation cost once per method, and the JIT can optimise for the actual processor it is running on.\n**What the CLR gives you**: garbage collection, type safety, exception handling, security, and language interoperability.\n**Managed vs unmanaged**: managed code runs under the CLR with those guarantees. Unmanaged code — a C++ library, a COM component, a file handle — does not, which is exactly why `IDisposable` exists: the GC can clean up managed memory but knows nothing about an unmanaged resource.\nTerms that pair with it: **CTS** (the common type system all .NET languages share), **CLS** (the subset every language must support, so C# and VB.NET can interoperate), **BCL/FCL** (the built-in class libraries), and **AOT** compilation as the alternative to JIT when startup time matters.",
  code: "// what actually ships is IL, not machine code:\n//   C#  ->  csc  ->  IL + metadata (assembly)  ->  CLR loads  ->  JIT  ->  native\n\n// managed memory: the GC handles it\nvar list = new List<int>();\n\n// unmanaged resource: you must release it\nusing var conn = new SqlConnection(cs);",
  remember: "C# → IL → assembly → CLR loads → JIT compiles per method → native. Managed = the CLR looks after it."
},

{
  id: "cs-namespace-assembly", topic: "csharp",
  q: "What is a namespace and an assembly?",
  tags: ["namespace", "assembly", "dll", "using directive", "nuget package", "project reference"],
  simple: "A namespace is a naming folder that stops two classes called Vendor from clashing. An assembly is the actual compiled file — a .dll or .exe — that gets deployed.",
  answer: "A **namespace** is compile-time organisation only. It groups related types and prevents name collisions; `using` just saves you typing the full name. Namespaces do not affect deployment and do not have to match assemblies — though matching them to folder structure is the convention everybody follows.\nAn **assembly** is the unit of deployment and versioning: a .dll or .exe containing IL, metadata and a manifest (its identity, version and dependencies). It is also the boundary that `internal` respects — `internal` means *this assembly*, which is why `InternalsVisibleTo` exists for test projects.\nIn practice: a solution has several projects, each compiling to one assembly, and a project reference or NuGet package is how one assembly uses another.\nSmall detail worth knowing: two different namespaces can live in one assembly, and one namespace can be spread across several assemblies — `System.Collections` is exactly that.",
  code: "namespace Procurement.Vendors.Services;   // file-scoped, C# 10+\n\npublic class VendorService { }\n\n// elsewhere\nusing Procurement.Vendors.Services;       // just saves typing the full name",
  remember: "Namespace = naming, compile time only. Assembly = the deployed .dll, and the boundary internal respects."
},

{
  id: "cs-stack-heap", topic: "csharp", star: true,
  q: "Stack vs heap — where does memory actually go?",
  tags: ["stack vs heap", "memory allocation", "stack memory", "heap memory", "stack overflow", "memory management basics"],
  simple: "The stack is a small, fast, strictly ordered area for method calls and local values. The heap is a large pool where objects live until the garbage collector removes them.",
  answer: "**Stack** — one per thread, around 1 MB. It holds method call frames: parameters, local value-type variables, and the reference variables themselves. It is allocated and freed automatically as methods enter and exit, which makes it extremely fast and completely deterministic. Infinite recursion exhausts it and throws `StackOverflowException`, which cannot be caught.\n**Heap** — shared, large, and managed by the GC. Every `new` on a class goes here, and the stack holds the reference pointing to it.\nThe nuance worth stating, because it is the follow-up: it is not \"value types go on the stack\". **Where a value type lives depends on where it is declared.** A local `int` is on the stack; an `int` field inside a class object is on the heap inside that object; a captured variable in a closure or an async method moves onto the heap too.\nThe GC generations sit on the heap: Gen 0 collects often and cheaply, survivors are promoted to Gen 1 and Gen 2, and objects over about 85 KB go to the Large Object Heap, which is collected far less often.",
  code: "void Example()\n{\n    int a = 5;                     // stack - local value type\n    var v = new Vendor();          // object on the heap, 'v' (the reference) on the stack\n    var big = new byte[100_000];   // Large Object Heap\n}   // stack frame disappears here; the heap objects wait for the GC",
  remember: "Stack = call frames, automatic, fast. Heap = objects, GC-managed. Where a value type lives depends on where it is declared."
},

{
  id: "cs-array-list", topic: "csharp",
  q: "Array vs List — and what is a jagged array?",
  tags: ["array vs list", "jagged array", "multidimensional array", "fixed size", "array basics", "list resize"],
  simple: "An array is a fixed-size block decided when you create it. A List grows as you add to it, because it keeps an array inside and replaces it with a bigger one when it fills up.",
  answer: "**Array** — fixed length, set at creation, zero-based, contiguous in memory, slightly faster to index and lighter in memory. Resizing means creating a new array and copying.\n**List&lt;T&gt;** — a wrapper around an array with `Add`, `Remove`, `Insert` and `Capacity`. When it runs out of room it allocates a new array at double the size and copies, so adding is amortised O(1) but has occasional expensive moments. Passing an expected size to the constructor avoids those copies.\n**Multidimensional `[,]`** — a true rectangle, every row the same length, one allocation.\n**Jagged `[][]`** — an array of arrays, so each row can differ in length. Usually faster than a rectangular array in .NET, and the form you see more often.\nMy default is `List<T>` for anything that grows, an array for fixed data and interop, and I return `IReadOnlyList<T>` rather than exposing a mutable list.",
  code: "int[]   fixedSize = new int[5];            // length locked at 5\nvar     grow      = new List<int>(500);    // pre-sized, avoids re-allocation\n\nint[,]  grid      = new int[3, 4];          // rectangular - always 3 x 4\nint[][] jagged    = new int[3][];           // rows can differ\njagged[0] = new int[2];\njagged[1] = new int[7];",
  remember: "Array fixed, List grows by doubling its internal array. Jagged = rows of different lengths."
},

{
  id: "cs-oop-basics", topic: "csharp",
  q: "What is method overloading, and what is a static vs instance member?",
  tags: ["method overloading", "static vs instance", "static member", "instance member", "method signature", "basics overloading"],
  simple: "Overloading is several methods with the same name but different parameters. A static member belongs to the class itself; an instance member belongs to each object.",
  answer: "**Overloading** — same name, different parameter list (type, count or order). The compiler picks by the arguments at the call site, so it is compile-time polymorphism. **The return type alone is not enough** — two methods differing only by return type will not compile. Neither will two differing only by `ref`/`out` naming, though `ref` vs value does count.\n**Static vs instance:**\n- A **static** member belongs to the type. One copy exists, shared by everyone; it is called as `Math.Max(...)`, cannot use `this`, and cannot touch instance members.\n- An **instance** member belongs to each object and gets its own data.\nUse static for genuinely stateless helpers. The moment something needs configuration, a connection or test substitution it should be an injected instance instead — static is the enemy of both DI and unit tests, and static *mutable* state in a web app is a thread-safety bug waiting to be found.",
  code: "public void Log(string msg) { }\npublic void Log(string msg, Exception ex) { }      // overload: different count\npublic void Log(int code) { }                      // overload: different type\n// public string Log(string msg) { }               // NOT an overload - return type only\n\npublic static decimal Round2(decimal d) => Math.Round(d, 2);   // stateless helper",
  remember: "Overload = same name, different signature; return type does not count. Static = one copy on the type."
},

{
  id: "cs-exception-types", topic: "csharp",
  q: "What are the common exception types, and how do you make your own?",
  tags: ["exception types", "custom exception", "nullreferenceexception", "argumentexception", "invalidoperationexception", "exception hierarchy"],
  simple: "Everything derives from Exception. The ones you meet constantly are NullReference, ArgumentNull, InvalidOperation, FormatException and InvalidCast. You write your own when the caller needs to catch your specific failure.",
  answer: "The hierarchy is `Exception` → `SystemException` and `ApplicationException` → everything else. The ones that actually turn up:\n- **NullReferenceException** — using a member on null. Almost always your bug, not an expected condition.\n- **ArgumentException / ArgumentNullException / ArgumentOutOfRangeException** — bad input; throw these yourself at the top of a method.\n- **InvalidOperationException** — the call is valid but the object is in the wrong state for it.\n- **FormatException**, **InvalidCastException**, **IndexOutOfRangeException**, **KeyNotFoundException**.\n- **DivideByZeroException** for integers; floating point gives you Infinity instead.\n- **TimeoutException**, **SqlException**, **DbUpdateConcurrencyException** from the infrastructure.\n**Custom exceptions**: derive from `Exception`, give it the three standard constructors, and only create one when a caller would genuinely `catch` it specifically — a domain error the API layer maps to a particular status code. Otherwise an existing type is clearer than a new one.\n**Do not** use exceptions for normal flow: they are expensive, and `TryParse`-style methods exist precisely so the common failure is not an exception.",
  code: "public class SapUnavailableException : Exception\n{\n    public SapUnavailableException() { }\n    public SapUnavailableException(string message) : base(message) { }\n    public SapUnavailableException(string message, Exception inner) : base(message, inner) { }\n}\n\n// guard clauses at the top, before any work\nArgumentNullException.ThrowIfNull(dto);\nif (dto.Qty <= 0) throw new ArgumentOutOfRangeException(nameof(dto.Qty));",
  project: "The document and SAP layers use a small set of domain exceptions that the global handler maps onto status codes — so the API returns a 409 or a 503 with a readable message instead of the controller parsing exception text to work out what went wrong.",
  remember: "Throw Argument* for bad input, InvalidOperation for bad state. Custom only when someone will catch it specifically."
}
,

{
  id: "cs-indexer", topic: "csharp",
  q: "What is an indexer in C#?",
  tags: ["indexer", "this keyword indexer", "square bracket operator", "custom collection access", "indexed property"],
  simple: "An indexer lets your own class be used with square brackets, the way a list or a dictionary is. You write a special property called `this` that takes a key.",
  answer: "An indexer is a property that takes arguments, so an instance of your class can be read and written with `obj[key]` instead of `obj.GetItem(key)`.\nYou declare it with the `this` keyword:\n- **The syntax** — a property named `this` that takes a parameter, written as `public string this[string code]` with a get and a set\n- The parameter can be any type and there can be more than one — `this[int row, int col]` for a grid.\n- You can **overload** indexers, so the same class accepts both an `int` position and a `string` key.\n- It can be get-only, and in an interface it is declared the same way.\n**When it is worth it**: when the class genuinely *is* a collection or a lookup. A settings class, a typed wrapper over a configuration section, a matrix. `row[\"VendorCode\"]` on a DataRow is exactly this feature.\n**When it is not**: when the class is not a collection. Square brackets on something that is not indexable reads badly, and a named method is clearer.\n**The difference from an array**: an array index must be an integer and is bounds-checked by the runtime; an indexer is your code, so you decide the key type and what happens when it is not found — return null, return a default, or throw `KeyNotFoundException`.",
  project: "The closest thing in my code is the configuration wrapper in the document engine, where a type code looks up its handler. I use the framework's indexers constantly — DataRow by column name in the ADO.NET mapping code, and Dictionary lookups.",
  remember: "A property called this, taking a key. Only when the class really is a collection."
}
,

{
  id: "cs-static-danger", topic: "csharp",
  q: "Why are static fields dangerous in a web application?",
  tags: ["static field", "static variable", "shared state", "thread safety web", "memory leak static", "per request", "singleton state", "why are static fields dangerous in a web app"],
  simple: "Because a web application serves every user from the same process. A static field is shared by all of them at once — so it is both a data leak and a thread-safety bug waiting to happen.",
  answer: "In a desktop application a static field is one value for one user, which feels harmless. On a web server it is one value for everybody, and several requests are touching it at the same moment on different threads.\nTwo things go wrong. The first is correctness: if someone caches the current user, or the selected company, in a static field, then user A's request can overwrite it between user B reading it and using it. That is a data leak, and it shows up as an occasional impossible bug that nobody can reproduce — the worst kind.\nThe second is thread safety. A static List or Dictionary being written to by many threads will throw, or silently corrupt itself, because those collections are not thread-safe for concurrent writes.\nAnd there is a slower problem: a static collection is never garbage collected, because the type root keeps it alive. If something is added to it per request, memory climbs until the app pool recycles, and it looks like a leak because it is one.\nWhere static is fine: genuinely constant values, pure static methods that hold no state, and a thread-safe cache using ConcurrentDictionary or IMemoryCache with a sensible eviction policy.\nFor anything per-user, the right answer is scoped dependency injection, so the container gives each request its own instance.",
  project: "This is the same mistake as injecting a scoped DbContext into a singleton, which is the bug I watch for in reviews — it gives you stale data and threading errors that only appear under load.",
  remember: "Static is shared by every user at once. Per-user state belongs in a scoped service."
},

{
  id: "cs-multiple-inheritance", topic: "csharp",
  q: "Does C# support multiple inheritance?",
  tags: ["multiple inheritance", "diamond problem", "multiple interfaces", "single base class", "default interface methods", "composition over inheritance", "what is inheritance does c# support multiple inheritance"],
  simple: "Not for classes — a class can only inherit one base class. It can implement as many interfaces as you like, and that is how C# gives you the useful part without the problem.",
  answer: "C# deliberately does not allow a class to inherit from two classes. The reason is the diamond problem: if B and C both inherit from A and both override the same method, and D inherits from B and C, nobody can say which version D gets. C++ allows it and the rules you need to resolve it are not worth the trouble.\nInterfaces are different, and a class can implement any number of them, because traditionally an interface carried no implementation — just a contract — so there was nothing to be ambiguous about.\nThat changed slightly in C# 8 with default interface methods, where an interface can supply a body. If you implement two interfaces that both provide a default for the same member, the compiler makes you say which one you mean, so the ambiguity is caught rather than guessed.\nIn practice when I want behaviour from two places I use composition rather than reaching for inheritance — the class holds the two things it needs and delegates to them. Inheritance is for a genuine is-a relationship, and I use a lot less of it than interfaces.",
  project: "The document engine uses one abstract base for the shared audit and header behaviour, and interfaces for everything a type can do. One base class, several interfaces — which is exactly the shape the language pushes you towards.",
  remember: "One base class, many interfaces. The diamond problem is why."
}

]);
