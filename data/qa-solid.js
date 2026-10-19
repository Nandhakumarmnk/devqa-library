/* OOP, SOLID and design patterns pack */
window.QA = (window.QA || []).concat([

{
  id: "sol-solid", topic: "solid", star: true,
  q: "What are the SOLID principles?",
  tags: ["solid", "solid principles", "srp ocp lsp isp dip", "design principles"],
  simple: "SOLID is five habits that keep classes small, replaceable and easy to change. S: one job per class. O: extend, do not edit. L: a child must behave like its parent. I: small focused interfaces. D: depend on interfaces, not concrete classes.",
  answer: "- **S — Single Responsibility**: a class should have one reason to change. A controller takes the request, a service holds the rules, a repository talks to the database.\n- **O — Open/Closed**: open for extension, closed for modification. Add a new type by adding a class, not by editing a switch statement.\n- **L — Liskov Substitution**: any derived class must work wherever the base is expected, without surprising the caller.\n- **I — Interface Segregation**: many small interfaces beat one fat interface, so nobody is forced to implement methods they do not need.\n- **D — Dependency Inversion**: high-level code depends on abstractions; concrete implementations are injected. This is what ASP.NET Core DI gives you out of the box.\nThe payoff is testability and safe change — I can replace one piece without touching the rest.",
  code: "// D in practice — the controller never sees the concrete class\npublic class VendorController : ControllerBase\n{\n    private readonly IVendorService _service;      // abstraction\n    public VendorController(IVendorService service) => _service = service;\n}\n// Program.cs\nbuilder.Services.AddScoped<IVendorService, VendorService>();",
  project: "I apply this most visibly in the Vendor Portal and the procurement APIs: controller → service → repository, each with its own interface registered in DI, so the controller holds no business rules and no SQL. The Smart Documents engine is my Open/Closed example — a new document type is a new class implementing the document contract, with no change to the engine, which is why new document types go live without a code change to the core. It is also what I look for when I review the team's code.",
  remember: "S one job · O add do not edit · L child behaves like parent · I small interfaces · D depend on abstractions."
},

{
  id: "sol-srp", topic: "solid", star: true,
  q: "Single Responsibility Principle (SRP) with example",
  tags: ["srp", "single responsibility", "one reason to change", "separation of concerns", "how do you refactor legacy code", "single responsibility in methods"],
  simple: "One class, one job. If you can describe a class only by using the word and — it validates and saves and emails — it is doing too much.",
  answer: "A class should have one reason to change. If validation rules, database schema, and the email template all live in one class, any of those three changing forces me to edit and retest that class.\nSplitting it means each change touches one small file, unit tests are focused, and two developers can work on different concerns without conflicting.\nThe practical test I use: can I name the class without the word and?",
  code: "// before: three reasons to change\nclass OrderService { void Place(Order o){ Validate(o); SaveToDb(o); SendMail(o); } }\n\n// after\nclass OrderValidator  { ... }\nclass OrderRepository { ... }\nclass OrderMailer     { ... }\nclass OrderService    { /* orchestrates the three */ }",
  project: "In the procurement modules the purchase-order flow is split exactly this way — validator, repository, and a notification service behind `IEmailSender` using SMTP. When the business changed the approval notification wording and recipients, only the notification class changed; the PO rules and queries were untouched.",
  remember: "If you need and to describe the class, split it."
},

{
  id: "sol-ocp", topic: "solid",
  q: "Open/Closed Principle (OCP) with example",
  tags: ["ocp", "open closed principle", "extend without modifying", "strategy switch"],
  simple: "Open for new features, closed for edits. Add a new class instead of adding another case to a growing if-else.",
  answer: "Software should be open for extension but closed for modification. The smell is a switch or if-else chain that grows every time the business adds a type — every edit risks breaking the cases that already worked and forces a full regression.\nThe fix is polymorphism: define an interface, put each variant in its own class, and resolve the right one at runtime from DI or a factory. Adding variant number eleven then means adding a file, not editing tested code.",
  code: "public interface IDocumentRule { bool AppliesTo(string type); bool Validate(Document d); }\n\npublic class InvoiceRule : IDocumentRule { ... }\npublic class GrnRule     : IDocumentRule { ... }\n\n// engine never changes\nvar rule = _rules.First(r => r.AppliesTo(doc.Type));\nreturn rule.Validate(doc);",
  project: "This is literally the design of the Smart Documents engine — it is configurable so new document types are added without code changes to the core. Same idea in the Excel bulk upload: each upload type plugs in its own column map and row validator while the upload pipeline, error report and SAP sync stay the same.",
  remember: "Growing switch statement = OCP violation. Replace it with classes behind an interface."
},

{
  id: "sol-lsp", topic: "solid",
  q: "Liskov Substitution Principle (LSP) with example",
  tags: ["lsp", "liskov substitution", "inheritance contract", "square rectangle"],
  simple: "If code works with the parent, it must still work when you hand it a child. A child that throws NotImplementedException breaks that promise.",
  answer: "Any derived type must be usable through its base reference without the caller needing to know the difference. Violations look like:\n- an override that throws `NotSupportedException`\n- an override that tightens the input rules or weakens the output guarantee\n- a child whose behaviour contradicts the base, like a ReadOnlyList inheriting from List and throwing on Add.\nWhen that happens the inheritance was wrong: those types are not really an is-a family, and composition or a narrower interface is the right fix.",
  code: "// LSP violation\nclass ArchivedDocument : BaseDocument {\n    public override void Save() => throw new NotSupportedException();\n}\n// fix: do not inherit a Save it cannot honour — split IReadableDocument / ISavableDocument",
  project: "In the document engine every type that inherits `BaseDocument` genuinely supports the whole contract — validate, save, audit. Read-only archived views do not inherit it; they are a separate query model. That is deliberate, because a type that throws on half the base methods makes the engine unsafe to call generically.",
  remember: "A child must never surprise code that was written for the parent."
},

{
  id: "sol-isp", topic: "solid",
  q: "Interface Segregation Principle (ISP) with example",
  tags: ["isp", "interface segregation", "fat interface", "small interfaces"],
  simple: "Do not force a class to implement methods it does not need. Several small interfaces are better than one giant one.",
  answer: "No client should depend on members it does not use. A fat `IRepository` with Add, Update, Delete, Bulk, Export and Archive forces every implementation to supply all of them, and read-only consumers end up with methods they must stub out.\nSmaller role-based interfaces — `IVendorReader`, `IVendorWriter` — keep implementations honest and make mocking in tests trivial because you only stub what the method under test actually uses.",
  code: "public interface IVendorReader { Task<Vendor> GetAsync(int id); }\npublic interface IVendorWriter { Task SaveAsync(Vendor v); }\n// a reporting service takes only IVendorReader",
  project: "The reporting services in the procurement platform depend only on read interfaces — they physically cannot write, which is both a design and a safety benefit on a live system. The SAP client is also split: the sync jobs use the write side, the lookup screens use a read-only interface.",
  remember: "Fat interface = classes implementing methods they throw on. Split by role."
},

{
  id: "sol-dip", topic: "solid", star: true,
  q: "Dependency Inversion Principle and Dependency Injection",
  tags: ["dip", "dependency inversion", "dependency injection", "di", "ioc", "loose coupling"],
  simple: "Your business code should talk to an interface, and somebody else should decide which real class is plugged in. That is dependency injection.",
  answer: "Dependency Inversion is the principle: high-level modules and low-level modules should both depend on abstractions. Dependency Injection is the technique that delivers it — a class declares what it needs in its constructor and the container supplies it.\nWhy it matters: I can swap the implementation (SQL today, a cached or mocked version tomorrow) without touching the consumer, unit tests inject fakes, and lifetimes are managed centrally.\nIn ASP.NET Core the container is built in — `AddScoped` for per-request things like a DbContext or repository, `AddSingleton` for stateless shared services, `AddTransient` for lightweight short-lived ones. The classic bug is injecting a scoped DbContext into a singleton.",
  code: "builder.Services.AddScoped<IVendorRepository, VendorRepository>();\nbuilder.Services.AddScoped<IVendorService, VendorService>();\nbuilder.Services.AddSingleton<ISapSettingsProvider, SapSettingsProvider>();\n\npublic VendorService(IVendorRepository repo, ILogger<VendorService> log) { ... }",
  project: "Every service and repository in the Vendor Portal and the procurement APIs is wired this way with constructor injection and `private readonly` fields. It is also what let us put the SAP client behind `ISapClient` — during development and testing we point at a stub implementation instead of hitting the live SAP Business One instance.",
  remember: "Depend on the interface; let the container hand you the implementation."
},

{
  id: "sol-oop-4", topic: "solid", star: true,
  q: "What are the four pillars of OOP?",
  tags: ["oop", "four pillars", "encapsulation inheritance polymorphism abstraction", "oops concepts", "where have you used oop in your project"],
  simple: "Encapsulation — hide the inside. Abstraction — show only what matters. Inheritance — reuse a parent. Polymorphism — the same call behaves differently per type.",
  answer: "- **Encapsulation**: keep fields private and expose controlled properties/methods, so an object protects its own state.\n- **Abstraction**: expose what a type does and hide how. Interfaces and abstract classes give you this.\n- **Inheritance**: a derived class reuses and specialises a base class. Powerful but easy to overuse — prefer composition when the relationship is not genuinely is-a.\n- **Polymorphism**: one interface, many implementations — compile-time via overloading, runtime via overriding.\nThe point of all four together is that calling code can stay the same while the implementation behind it changes.",
  code: "public abstract class BaseDocument            // abstraction\n{\n    private readonly List<string> _audit = new();   // encapsulation\n    public IReadOnlyList<string> Audit => _audit;\n    public abstract bool Validate();                // polymorphism\n}\npublic class Invoice : BaseDocument { ... }         // inheritance",
  project: "The document engine shows all four in one place: `BaseDocument` is the abstraction, audit state is encapsulated behind a read-only property, each document type inherits, and the engine calls `Validate()` polymorphically without knowing the concrete type.",
  remember: "Hide it, simplify it, reuse it, swap it."
},

{
  id: "sol-encap-abstract", topic: "solid",
  q: "Abstraction vs encapsulation — what is the difference?",
  tags: ["abstraction vs encapsulation", "encapsulation", "abstraction", "data hiding", "how do you actually achieve encapsulation in c#"],
  simple: "Abstraction is about design — deciding what to show. Encapsulation is about protection — keeping the inside safe from outside meddling.",
  answer: "Abstraction happens at design time: I expose `ISapClient.PostInvoice()` and the caller never learns about the connection, retries, or payload format. It answers what.\nEncapsulation is implementation level: private fields, validation inside setters, no public mutable collections. It answers how it is protected.\nThey work together — abstraction gives a clean surface, encapsulation stops anyone reaching behind it and putting the object in an invalid state.",
  code: "public class PurchaseOrder {\n    private readonly List<PoLine> _lines = new();\n    public IReadOnlyList<PoLine> Lines => _lines;      // nobody can Add from outside\n    public void AddLine(PoLine l) {                     // rules enforced here\n        if (l.Qty <= 0) throw new ArgumentException(\"Qty must be positive\");\n        _lines.Add(l);\n    }\n}",
  project: "Both are in the document engine and they do different jobs. ISapClient is abstraction — it says what the SAP side can do without saying how, so the engine depends on the contract. The purchase order keeping its lines private behind AddLine is encapsulation — it protects its own state so nobody can reach in and skip the rules. Abstraction gives you the clean surface, encapsulation stops anyone going around it.",
  remember: "Abstraction = what you show. Encapsulation = what you protect."
},

{
  id: "sol-inherit-compose", topic: "solid",
  q: "Inheritance vs composition — which do you prefer?",
  tags: ["inheritance vs composition", "composition over inheritance", "has-a is-a"],
  simple: "Inheritance is is-a. Composition is has-a. Composition is usually the safer choice because it does not lock you into someone else's class.",
  answer: "Inheritance gives reuse but creates tight coupling — a base change ripples into every child, and C# allows only one base class. Composition builds behaviour by holding other objects behind interfaces, which can be swapped and mocked.\nMy rule: inherit only for a genuine is-a with a stable contract (document types sharing a base). For everything else — logging, caching, validation, notification — compose by injecting the collaborator.",
  code: "// composition\npublic class VendorService {\n    private readonly IVendorRepository _repo;\n    private readonly IEmailSender _mail;\n    public VendorService(IVendorRepository repo, IEmailSender mail) { _repo = repo; _mail = mail; }\n}",
  project: "Nearly every service I write in the portal is composition — repository, mailer, logger, SAP client injected in. The only real inheritance in my code is the document base class, where the types genuinely are documents.",
  remember: "Prefer composition; inherit only for a true is-a."
},

{
  id: "sol-polymorphism", topic: "solid",
  q: "Explain polymorphism with a real example",
  tags: ["polymorphism", "runtime polymorphism", "compile time polymorphism", "virtual method"],
  simple: "Same call, different behaviour depending on the actual object. The caller does not need to know which type it holds.",
  answer: "Compile-time polymorphism is overloading — the compiler picks by signature.\nRuntime polymorphism is overriding — the CLR picks by the real object type behind the reference. That is what lets me write one line of calling code against an interface or base class and support many implementations.\nIt is the mechanism behind Open/Closed and behind DI: `IEnumerable<IDocumentRule>` injected into the engine means adding a rule class is enough.",
  code: "foreach (var exporter in _exporters)       // IExporter: Excel, Pdf, Csv\n    if (exporter.Supports(format))\n        return exporter.Export(rows);",
  project: "The export options on the procurement reports work this way — Excel, PDF and CSV exporters implement one interface and the controller just picks the one matching the requested format. Adding a new format did not change the report code.",
  remember: "One call, many implementations, chosen at runtime."
},

{
  id: "sol-repository", topic: "solid", star: true,
  q: "Repository pattern — what is it and do you use it?",
  tags: ["repository pattern", "unit of work", "data access layer", "generic repository", "where does business logic go", "do you use the repository pattern", "explain the repository and unit of work patterns", "do you need a repository with ef"],
  simple: "A repository is a class that owns all the database code for one entity, so the rest of the app asks it for data instead of writing queries everywhere.",
  answer: "The repository sits between the business layer and the data layer and exposes collection-like methods — Get, Find, Add, Update. The service calls `IVendorRepository` and has no idea whether it is EF Core, Dapper or ADO.NET behind it.\nBenefits: query logic in one place, consumers are testable with a mocked interface, and the data technology can change without touching business code.\nFair criticism: EF Core's DbContext already is a Unit of Work plus repositories, so a thin generic repository over it can be pure ceremony. I use it where it earns its place — complex or reused queries — rather than wrapping everything blindly.",
  code: "public interface IVendorRepository {\n    Task<Vendor> GetAsync(int id);\n    Task<IReadOnlyList<Vendor>> SearchAsync(VendorFilter f);\n    Task AddAsync(Vendor v);\n}",
  project: "The procurement and vendor modules use repositories for all reusable and complex queries, with Unit of Work semantics coming from `SaveChangesAsync` on the DbContext so a multi-table operation commits as one transaction. Simple masters go through a generic repository; the tuned, index-sensitive queries get a dedicated one so the SQL is visible and reviewable.",
  remember: "Repository = all the queries for one entity in one place, behind an interface."
},

{
  id: "sol-singleton", topic: "solid",
  q: "Singleton pattern — and what is wrong with it",
  tags: ["singleton", "singleton pattern", "thread safe singleton", "static instance", "explain singleton any risk"],
  simple: "Singleton means exactly one instance for the whole application. Useful for shared, stateless things — dangerous when it holds data that changes.",
  answer: "Classic implementation uses a private constructor plus a `Lazy<T>` static instance, which is thread-safe without manual locking. In ASP.NET Core I almost never hand-roll it — I register the service with `AddSingleton` so the container owns the lifetime and the class stays injectable and testable.\nProblems with the hand-rolled version: hidden global state, hard to mock, and any mutable field inside it is shared across all concurrent requests. Also remember a static singleton is per worker process, so it is not a cluster-wide guarantee.",
  code: "builder.Services.AddSingleton<ISapSettingsProvider, SapSettingsProvider>();  // preferred\n\n// hand-rolled, if ever needed\npublic sealed class Config {\n    private static readonly Lazy<Config> _i = new(() => new Config());\n    public static Config Instance => _i.Value;\n    private Config() { }\n}",
  project: "Configuration providers and the HttpClient setup for the SAP integration are singletons through DI. Anything per-user or per-request — DbContext, repositories, the current-user accessor — is scoped, because a singleton holding request data would leak one vendor's data into another vendor's request.",
  remember: "Use AddSingleton, not a static Instance. Never put request data in a singleton."
},

{
  id: "sol-factory", topic: "solid",
  q: "Factory pattern with example",
  tags: ["factory pattern", "factory method", "object creation pattern"],
  simple: "A factory is a class whose job is to decide which object to create, so the caller does not need a new statement or a switch.",
  answer: "Factory Method / Simple Factory centralises object creation. The caller asks for a type by key and gets back an interface, so adding a new implementation touches only the factory (or nothing at all if resolution comes from DI).\nIt pairs with Open/Closed — the calling code never changes. In ASP.NET Core I often skip a hand-written factory and inject `IEnumerable<IHandler>`, then pick the handler that supports the input, which is the same idea with less code.",
  code: "public interface IDocumentFactory { IDocument Create(string type); }\n\npublic class DocumentFactory : IDocumentFactory {\n    private readonly IServiceProvider _sp;\n    public IDocument Create(string type) => type switch {\n        \"INV\" => _sp.GetRequiredService<InvoiceDocument>(),\n        \"GRN\" => _sp.GetRequiredService<GrnDocument>(),\n        _     => throw new NotSupportedException(type)\n    };\n}",
  project: "Smart Documents resolves the handler for a document type this way, which is what makes the engine configurable — the controller passes the type code and never references a concrete document class.",
  remember: "Factory hides which concrete class gets created."
},

{
  id: "sol-strategy", topic: "solid",
  q: "Strategy pattern with example",
  tags: ["strategy pattern", "behaviour pattern", "replace if else with strategy"],
  simple: "Strategy means putting each way of doing something into its own class, then choosing one at runtime — instead of a long if-else.",
  answer: "Define an interface for the operation, implement each variant, and inject or select the one you need. The context class holds the interface and calls it without knowing the variant.\nTypical uses: different pricing or discount rules, different export formats, different approval workflows. It is how I remove a switch statement that keeps growing, and it keeps each rule independently testable.",
  code: "public interface IDiscountStrategy { decimal Apply(decimal amount); }\npublic class NoDiscount   : IDiscountStrategy { public decimal Apply(decimal a) => a; }\npublic class SlabDiscount : IDiscountStrategy { public decimal Apply(decimal a) => a > 100000 ? a * 0.95m : a; }",
  project: "The export format selection on the procurement reports and the per-type validation rules in the document engine are both Strategy in practice — one interface, several implementations, picked at runtime.",
  remember: "Strategy = one interface, several swappable algorithms."
},

{
  id: "sol-clean-code", topic: "solid",
  q: "What do you look for in a code review?",
  tags: ["code review", "clean code", "code review checklist", "dry kiss yagni", "mentoring"],
  simple: "Does it work, is it safe, is it readable, and will the next person be able to change it without fear.",
  answer: "My checklist, roughly in order:\n- **Correctness**: edge cases, null handling, transaction boundaries, async used properly, no `.Result`.\n- **Security**: parameterised queries, output encoding, authorisation attribute present, no secret in code, no stack trace returned to the user.\n- **Data**: N+1 queries, missing index, SELECT *, unbounded result sets with no paging.\n- **Design**: single responsibility, no business logic in the controller, no duplicated block that should be shared (DRY), and not over-engineered for a need that does not exist yet (YAGNI).\n- **Readability**: honest names, small methods, no commented-out code, meaningful log messages.\n- **Tests and rollback**: is it testable, and does a database change ship with its rollback script.",
  project: "As Technical Lead I run reviews for the team, and that list is close to what I use. On Smart Documents I worked through 65 review issues across 37+ files and cut database round-trips by around half in the process. I also use Claude Code and ChatGPT as a first pass to catch the mechanical issues, so the human review can focus on design and business correctness.",
  remember: "Correct, secure, fast enough, readable, reversible."
},

{
  id: "sol-patterns-used", topic: "solid",
  q: "Which design patterns have you actually used?",
  tags: ["design patterns", "patterns used in project", "which patterns"],
  simple: "Name only the ones you really used and say where. Repository, Dependency Injection, Factory, Strategy, Unit of Work, Singleton via DI.",
  answer: "The ones I genuinely use:\n- **Dependency Injection** everywhere — controllers, services, repositories.\n- **Repository + Unit of Work** for data access, with `SaveChangesAsync` as the commit boundary.\n- **Factory** to resolve a document handler by type code.\n- **Strategy** for pluggable validation and export formats.\n- **Singleton** through `AddSingleton` for configuration and HTTP clients.\n- **Options pattern** (`IOptions<T>`) for strongly typed settings.\n- **Middleware / chain of responsibility** in the ASP.NET Core pipeline for logging, exception handling and auth.\nI would not claim patterns I have only read about — interviewers follow up with where did you use it.",
  project: "All of these sit in the procurement platform and the Vendor Portal. The combination that mattered most was Factory plus Strategy in the Smart Documents engine, because that is what makes a new document type a configuration exercise rather than a code change.",
  remember: "Name the pattern, then immediately name the file it lives in."
},

{
  id: "sol-dry", topic: "solid",
  q: "DRY, KISS and YAGNI",
  tags: ["dry", "kiss", "yagni", "clean code principles", "dont repeat yourself"],
  simple: "DRY — do not write the same logic twice. KISS — keep it simple. YAGNI — do not build what nobody asked for yet.",
  answer: "DRY: one authoritative place for each rule. The caveat is that two blocks that merely look alike are not duplication — forcing them together creates a method with five flags, which is worse.\nKISS: the simplest thing that works and reads clearly. A clever one-liner nobody can debug at 2 am is a liability.\nYAGNI: do not add configuration, abstraction or caching for a requirement that does not exist. Abstractions added speculatively are the ones that end up wrong.\nTogether they are the counterweight to over-engineering — SOLID tells you how to structure what you need, these tell you not to build what you do not.",
  project: "Where DRY paid off for us was the React side of the Vendor Portal — the shared form, grid, modal and validation components mean a new vendor screen reuses tested pieces instead of copying markup, which keeps behaviour consistent across registration, onboarding and approval.",
  remember: "DRY once, KISS always, YAGNI until someone asks."
},

{
  id: "sol-testing", topic: "solid", star: true,
  q: "Do you write unit tests?",
  tags: ["unit tests", "xunit nunit", "test coverage", "tdd", "moq", "testable code"],
  simple: "Answer this one honestly. If there is no test suite, say so plainly and then say what you do have — manual QA, and a design that would be testable. Never bluff it, because the next question is always what framework and how you mock.",
  answer: "The honest answer first: **no automated test suite**. Testing was done manually by our QA team, and defects came back to me as Azure DevOps work items.\nThen what is actually true: I know xUnit and NUnit as concepts, and the repository-behind-an-interface design I use is exactly what makes code testable — constructor injection means a service can be built with a mocked repository, with no database and no HTTP context. I have written code that is testable without having written the tests.\nAnd what I would do given the chance: start with unit tests on the business rules and the validators, where the value is highest and the setup is cheapest, then integration tests on the critical API endpoints. I would not chase a coverage percentage — a suite that tests getters to hit 80% tells you nothing.\nInterviewers respect this answer. They do not respect a claimed test suite that falls apart when they ask how you mocked the DbContext.",
  code: "// this is what DI buys you - no database needed\nvar repo = new Mock<IVendorRepository>();\nrepo.Setup(r => r.GetAsync(1)).ReturnsAsync(new Vendor { Id = 1, Status = \"BLOCKED\" });\n\nvar service = new VendorService(repo.Object, Mock.Of<IEmailSender>());\nvar result  = await service.ApproveAsync(1);\n\nAssert.False(result.Success);   // a blocked vendor cannot be approved",
  project: "There is no test project in our solutions — that is the point of the answer, and saying it plainly is better than being caught. What I do point at is the design: every service takes its dependencies through the constructor behind interfaces, so the seam a test would need is already there.",
  remember: "No suite — say so. Then: the design is testable, and here is where I would start."
},

{
  id: "sol-chain", topic: "solid", star: true,
  q: "Chain of Responsibility pattern",
  tags: ["chain of responsibility", "handler chain", "approval chain", "behavioural pattern", "middleware pattern"],
  simple: "A request is passed along a line of handlers until one of them deals with it. The sender does not know which handler will take it, and each handler only has to know whether the request is its business.",
  answer: "Each handler holds a reference to the next one. It either handles the request or passes it on; the caller just hands it to the front of the chain.\nThe textbook example is **approval by amount** — a manager approves up to a limit, above that it goes to a director, above that to finance. Adding a new level is a new handler inserted in the chain, not an edit to a growing if-else, which makes it Open/Closed in practice.\nThe benefit is decoupling: the sender does not know who handles it, and each handler has one rule.\nThe risks: a request can fall off the end unhandled (so decide deliberately whether that is an error or a no-op), and a long chain is harder to follow in a debugger than a switch statement — so it earns its place when the chain genuinely changes, not when there are two fixed cases.\n**You already use it every day**: the ASP.NET Core middleware pipeline *is* this pattern — each component inspects the request, optionally does work, and calls `next()` or short-circuits.",
  code: "public abstract class Approver\n{\n    protected Approver Next;\n    public Approver SetNext(Approver next) { Next = next; return next; }\n    public abstract void Handle(PurchaseRequest r);\n}\n\npublic class Manager : Approver\n{\n    public override void Handle(PurchaseRequest r)\n    {\n        if (r.Amount <= 50000) Approve(r);\n        else Next?.Handle(r);          // pass it up\n    }\n}\n// manager.SetNext(director).SetNext(finance);",
  project: "The approval workflow in the procurement platform is this shape — a request moves up by value and type until someone is authorised to decide, and the workflow engine was later separated from its UI so more than one application could drive the same chain. The middleware pipeline in the Vendor Portal API is the same pattern in framework form.",
  remember: "Each handler either deals with it or calls the next. ASP.NET Core middleware is exactly this."
},

{
  id: "sol-soc", topic: "solid", star: true,
  q: "What is Separation of Concerns? (and layered architecture)",
  tags: ["separation of concerns", "soc", "layered architecture", "n-tier", "layers", "presentation business data layer", "separate concerns"],
  simple: "Each part of the system should deal with one kind of problem. The screen deals with showing things, the service deals with business rules, the repository deals with the database. Mixing them is what makes code impossible to change safely.",
  answer: "Separation of Concerns is the broad principle; SOLID's Single Responsibility is the same idea applied to one class. In a typical .NET application it shows up as **layers**:\n- **Presentation** — controllers, Razor views, React components. Takes input, shows output. No business rules, no SQL.\n- **Business / service** — the rules, validation, orchestration, transaction boundaries. Knows nothing about HTTP or about SQL syntax.\n- **Data access** — repositories, EF Core, stored procedures. Knows nothing about business rules.\n- **Cross-cutting** — logging, authentication, caching, exception handling. These cut across every layer, which is why they live in middleware and filters rather than being copied into each one.\n**The dependency rule**: each layer depends downward, never upward, and the dependencies are on interfaces so the direction can be inverted where it matters.\n**Why it earns its keep**: a database change touches one layer, a UI change touches another, two developers can work on the same feature without colliding, and the business layer becomes testable because it has no HTTP or SQL attached.\n**The honest limit**: layers are not free. A tiny CRUD application with four strict layers is ceremony. Separate when the concerns are genuinely different, not because a diagram says five boxes.",
  code: "// presentation - no rules, no SQL\n[HttpPost]\npublic async Task<IActionResult> Approve(int id)\n    => Ok(await _service.ApproveAsync(id));\n\n// business - rules and the transaction boundary\npublic async Task<Result> ApproveAsync(int id) {\n    var po = await _repo.GetAsync(id);\n    if (po.Total > _limits.Max) return Result.Fail(\"Above approval limit\");\n    po.Approve(_user.Id);\n    await _repo.SaveAsync();\n    return Result.Ok();\n}\n\n// data - queries only\npublic Task<PurchaseOrder> GetAsync(int id) => _db.PurchaseOrders.FindAsync(id).AsTask();",
  project: "This is how the Vendor Portal and the procurement APIs are structured — controller → service → repository, each behind its own interface and registered in DI. The controllers hold no business rules and no SQL, which is also what makes the services testable with a mocked repository and what let the heavy report queries drop to ADO.NET without the rest of the code noticing.",
  remember: "UI shows, service decides, repository fetches. Dependencies point downward, through interfaces."
},

{
  id: "sol-new-class", topic: "solid", star: true,
  q: "When should you create a separate class?",
  tags: ["create separate class", "when to create a new class", "class design", "god class", "extract class", "how to split a class"],
  simple: "When the class is doing a second job. The clearest signal is that you cannot name it without the word and, or that two unrelated reasons keep making you edit the same file.",
  answer: "The signals I act on:\n- **A second reason to change.** If validation rules and the email template both force edits to the same class, that is two concerns and should be two classes.\n- **The name needs an *and*** — `OrderValidatorAndMailer` is telling you something. If the honest name is `Manager`, `Helper` or `Utils`, it has no single responsibility at all.\n- **A group of fields only some methods use.** That cluster is a class trying to escape — extract it with the methods that use it.\n- **Repeated logic across classes** — pull it into one place rather than copying it a third time.\n- **Hard to test** — if a unit test needs six mocks, the class is coordinating six things.\n- **Primitive obsession** — a string passed everywhere with the same validation repeated around it wants to be a small type (`Gstin`, `Money`) that validates itself once.\n**When NOT to split**: a class is not too long just because it has many lines of genuinely cohesive logic, and splitting one class into five that must all change together makes things worse, not better. Cohesion is the test, not line count.\n**And the practical route**: extract into a new class, keep the old method delegating to it, verify, then move callers. Small steps, each one shippable.",
  code: "// one class, three reasons to change\nclass OrderService {\n    void Place(Order o) { Validate(o); SaveToDb(o); SendMail(o); }\n}\n\n// three classes, one reason each - OrderService now only orchestrates\nclass OrderValidator  { ... }\nclass OrderRepository { ... }\nclass OrderMailer     { ... }",
  project: "The purchase-order flow is split exactly this way, and the payoff showed when the business changed the approval notification wording and recipients — only the notification class changed, and the PO rules and queries were not even opened. That is the whole argument for the split in one sentence.",
  remember: "Second reason to change, a name needing and, a field cluster, or six mocks in a test. Cohesion, not line count."
},

{
  id: "sol-custom-patterns", topic: "solid", star: true,
  q: "Have you written any custom implementations of patterns? (custom middleware, filters, attributes)",
  tags: ["custom design pattern", "custom middleware", "custom action filter", "custom validation attribute", "custom exception", "extend the framework", "own implementation"],
  simple: "This asks whether you have extended the framework yourself rather than only consuming it. The honest list is custom middleware, custom filters and attributes, custom validation, custom exceptions, and a custom data-access helper.",
  answer: "I would not claim to have invented a design pattern — nobody has, and saying so sounds naive. What I *have* done is implement the framework's extension points, which is what the question actually means.\n- **Custom middleware** — correlation id, request logging, and global exception handling. This is Chain of Responsibility: do work, call `next()`, or short-circuit.\n- **Custom action filter** — auditing who called which action, so each action does not write its own audit code.\n- **Custom validation attribute** — a reusable rule like GSTIN or PAN format, declared on the DTO once instead of repeated in every controller. That is the Strategy pattern in attribute form.\n- **Custom exception types** — domain exceptions the global handler maps to the right status code, instead of throwing `Exception` and parsing messages.\n- **Custom extension methods** — `AddProcurementServices(this IServiceCollection)` to keep Program.cs readable; a Facade over a pile of registrations.\n- **A reusable data-access helper** — one place owning connection, parameters and disposal for the ADO.NET code.\n**The framing that scores**: name the pattern each one is, and say what it replaced. \"I wrote custom middleware\" is a fact; \"I wrote custom middleware so the correlation id is attached once instead of in forty controllers\" is an engineer.",
  code: "// custom validation attribute - declare the rule once\npublic class GstinAttribute : ValidationAttribute\n{\n    public override bool IsValid(object value) =>\n        value is string s && s.Length == 15 && s.All(char.IsLetterOrDigit);\n}\npublic class VendorDto { [Gstin] public string Gstin { get; set; } }\n\n// custom middleware - Chain of Responsibility\npublic class CorrelationIdMiddleware\n{\n    private readonly RequestDelegate _next;\n    public async Task InvokeAsync(HttpContext ctx)\n    {\n        ctx.Items[\"cid\"] = Guid.NewGuid().ToString(\"N\");\n        await _next(ctx);\n    }\n}",
  project: "In the Vendor Portal the pipeline carries custom correlation-id and exception-handling middleware, the approval actions carry an audit filter, and the DTOs carry reusable validation attributes for the formats that appear on several screens. The document engine is the bigger one — Factory plus Strategy written by hand so a new document type is a class rather than a release.",
  remember: "Name the extension point and the pattern it is, then say what it replaced."
}
,

{
  id: "sol-test-types", topic: "solid",
  q: "Unit, integration and end-to-end tests — what is the difference? What is mocking?",
  tags: ["unit test", "integration test", "end to end test", "mocking", "Moq", "xUnit", "NUnit", "MSTest", "test pyramid", "code coverage", "unit vs integration vs end to end test", "nunit vs xunit vs mstest", "what is mocking", "what do moq and xunit do", "what code coverage should a project have", "have you done test driven development", "can you write a simple nunit test", "what testing do you follow"],
  simple: "A unit test checks one class with everything around it faked. An integration test checks two or more real pieces together, usually including the database. End-to-end drives the whole application the way a user would. Mocking is how you fake the things around the unit.",
  answer: "A unit test takes one class and tests its logic with every dependency replaced by a fake. No database, no HTTP, no file system. It should run in milliseconds and fail for exactly one reason.\nAn integration test puts real pieces together — a service against a real database, or an API endpoint through the real pipeline. Slower, and it catches the things unit tests cannot, like a wrong mapping or a migration that did not run.\nEnd-to-end drives the whole stack through the UI, usually with something like Selenium or Playwright. It catches the most and it is the most brittle, so you want a handful of those covering the critical paths, not hundreds.\nThat is the test pyramid: many unit tests, fewer integration, a few end-to-end.\nMocking is the technique that makes unit tests possible. Because my services take interfaces through the constructor, a test can hand in a fake repository that returns whatever the test needs — including throwing, so you can test the error path, which is nearly impossible against a real database. Moq is the usual library for that in .NET. xUnit, NUnit and MSTest are the test frameworks themselves; they are more alike than different, and xUnit is the common default on new .NET projects.\nI have to be straight about this though. I know these as concepts and my code is designed to be testable, but there is no automated test suite on my projects — testing was manual, through a QA team. I would rather say that than describe a suite I have not written.",
  project: "The repository-behind-an-interface design in the Vendor Portal is exactly what makes a unit test possible — the service can be built with a fake and no database. The tests themselves were never written, and that is the first thing I would add.",
  remember: "Unit fakes everything, integration uses the real thing, end-to-end drives the UI. And be honest: no suite yet."
},

{
  id: "sol-coupling-cohesion", topic: "solid",
  q: "What is coupling and cohesion?",
  tags: ["coupling", "cohesion", "loose coupling", "high cohesion", "tight coupling", "class design", "separation", "what is coupling and cohesion"],
  simple: "Cohesion is how well the things inside one class belong together. Coupling is how much one class depends on the details of another. You want high cohesion and loose coupling.",
  answer: "Cohesion is about the inside of a class. A class with high cohesion does one job — an invoice service that validates, posts and queries invoices. A class with low cohesion is the one everybody has seen, called something like Helper or Manager, where someone put a date formatter next to an email sender next to a tax calculation. Nothing in it belongs together and nobody can safely change it.\nCoupling is about the wires between classes. Tight coupling is when my service does new SqlConnection inside a method — now it depends on that exact class, I cannot swap it, and I cannot test the service without a database. Loose coupling is when it takes an interface in its constructor and the container supplies the implementation.\nThe two work against each other if you push either too far. Split everything into tiny classes for the sake of cohesion and you get hundreds of files and a lot of plumbing. Decouple everything behind an interface and you get indirection for things that will never have a second implementation. I use the interface where there is a real reason — a second implementation, or wanting to test the class.\nThe practical test I apply in reviews is this: if I change the rule for how a document number is generated, how many files do I have to open? One means the design is right.",
  project: "The document engine in Smart Documents is the good example — each document type is its own class behind one interface, so the engine knows nothing about any of them. Adding a type touches one new file.",
  remember: "High cohesion inside, loose coupling between. Change one rule, open one file."
},

{
  id: "sol-clean-onion", topic: "solid",
  q: "What is Clean or Onion architecture?",
  tags: ["clean architecture", "onion architecture", "layered architecture", "dependency rule", "domain layer", "infrastructure", "ports and adapters", "what is clean architecture", "what is onion architecture"],
  simple: "Layers arranged so that every dependency points inwards, towards the business rules. The domain at the centre knows nothing about the database or the web; the outer layers depend on it, never the other way round.",
  answer: "Picture rings. At the centre is the domain — the entities and the business rules, plain C# with no framework in it. Around that the application layer, with the use cases and the interfaces it needs, like IInvoiceRepository. Outside that the infrastructure — EF Core, SQL Server, the SAP client, the file system — and the presentation layer, the API or the UI.\nThe one rule that makes it work is that dependencies only ever point inwards. The domain does not reference EF. The application layer declares the interface it needs and the infrastructure implements it, so the arrow points in even though the data flows out. That is dependency inversion applied to the whole solution instead of one class.\nWhat you get is that the rules can be tested with no database at all, and swapping the data access does not touch the domain.\nWhat it costs is files and indirection. On a small service it is more ceremony than it is worth, and I would not apply it to a CRUD API with twelve endpoints.\nMy own projects are layered rather than strictly Clean — presentation, service, data access, with interfaces between them and the business rules kept out of the controllers. That is the same instinct without the full structure, and I would rather describe it accurately than claim the pattern by name.",
  project: "The Vendor Portal is layered with interfaces between every layer and no business logic in the controllers. It is not Clean Architecture by the book, and I say so.",
  remember: "All arrows point inwards. Domain knows nothing. Good for big; ceremony for small."
},

{
  id: "sol-code-quality", topic: "solid",
  q: "How do you enforce code quality and standards across a team?",
  tags: ["code quality", "coding standards", "code review", "definition of done", "static analysis", "analyzers", "EditorConfig", "pull request", "technical debt", "how do you enforce coding standards across a team", "what does your code review process look like", "how do you ensure code quality across the team"],
  simple: "Agree the standard once, let the tooling catch the mechanical things, and use the review for the things only a person can see. Then actually hold the line, kindly.",
  answer: "I split it into three.\nThe mechanical part should not be argued about in reviews at all. An EditorConfig file and the built-in analyzers handle naming, formatting, unused variables, async methods without await. If a tool can catch it, a human should not be spending review time on it.\nThe review is for what tooling cannot see — is the business rule in the right layer, is this going to fall over at a thousand rows, is there a query inside a loop, what happens when this throws, has anyone thought about who is allowed to call it. On Smart Documents I raised sixty-five issues across thirty-seven files, and most of them were the same few patterns repeating, which told me the problem was shared understanding, not individual carelessness.\nThe third part is agreeing what done means before anyone starts — the design discussion at the top of a task, where we settle the API contract, the table changes and which layer owns which rule. Most review disagreements are really design disagreements that happened too late.\nOn tone, because this is the part that decides whether it works: I review the code, not the person, I explain why rather than just asking for a change, and I separate the things that must change from the things that are my preference. If I cannot say why, it is a preference and I let it go.\nAnd for repeated issues I pair on the first one rather than leaving the same comment five times.",
  project: "This is what I actually do as Technical Lead. The sixty-five review issues on Smart Documents are the concrete example, and the fix was a short written standard plus pairing, not more comments.",
  remember: "Tooling for the mechanical, review for the design, agree done up front. Review the code, not the person."
}

]);
