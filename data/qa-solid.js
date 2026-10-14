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
  tags: ["srp", "single responsibility", "one reason to change", "separation of concerns"],
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
  tags: ["oop", "four pillars", "encapsulation inheritance polymorphism abstraction", "oops concepts"],
  simple: "Encapsulation — hide the inside. Abstraction — show only what matters. Inheritance — reuse a parent. Polymorphism — the same call behaves differently per type.",
  answer: "- **Encapsulation**: keep fields private and expose controlled properties/methods, so an object protects its own state.\n- **Abstraction**: expose what a type does and hide how. Interfaces and abstract classes give you this.\n- **Inheritance**: a derived class reuses and specialises a base class. Powerful but easy to overuse — prefer composition when the relationship is not genuinely is-a.\n- **Polymorphism**: one interface, many implementations — compile-time via overloading, runtime via overriding.\nThe point of all four together is that calling code can stay the same while the implementation behind it changes.",
  code: "public abstract class BaseDocument            // abstraction\n{\n    private readonly List<string> _audit = new();   // encapsulation\n    public IReadOnlyList<string> Audit => _audit;\n    public abstract bool Validate();                // polymorphism\n}\npublic class Invoice : BaseDocument { ... }         // inheritance",
  project: "The document engine shows all four in one place: `BaseDocument` is the abstraction, audit state is encapsulated behind a read-only property, each document type inherits, and the engine calls `Validate()` polymorphically without knowing the concrete type.",
  remember: "Hide it, simplify it, reuse it, swap it."
},

{
  id: "sol-encap-abstract", topic: "solid",
  q: "Abstraction vs encapsulation — what is the difference?",
  tags: ["abstraction vs encapsulation", "encapsulation", "abstraction", "data hiding"],
  simple: "Abstraction is about design — deciding what to show. Encapsulation is about protection — keeping the inside safe from outside meddling.",
  answer: "Abstraction happens at design time: I expose `ISapClient.PostInvoice()` and the caller never learns about the connection, retries, or payload format. It answers what.\nEncapsulation is implementation level: private fields, validation inside setters, no public mutable collections. It answers how it is protected.\nThey work together — abstraction gives a clean surface, encapsulation stops anyone reaching behind it and putting the object in an invalid state.",
  code: "public class PurchaseOrder {\n    private readonly List<PoLine> _lines = new();\n    public IReadOnlyList<PoLine> Lines => _lines;      // nobody can Add from outside\n    public void AddLine(PoLine l) {                     // rules enforced here\n        if (l.Qty <= 0) throw new ArgumentException(\"Qty must be positive\");\n        _lines.Add(l);\n    }\n}",
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
  tags: ["repository pattern", "unit of work", "data access layer", "generic repository"],
  simple: "A repository is a class that owns all the database code for one entity, so the rest of the app asks it for data instead of writing queries everywhere.",
  answer: "The repository sits between the business layer and the data layer and exposes collection-like methods — Get, Find, Add, Update. The service calls `IVendorRepository` and has no idea whether it is EF Core, Dapper or ADO.NET behind it.\nBenefits: query logic in one place, consumers are testable with a mocked interface, and the data technology can change without touching business code.\nFair criticism: EF Core's DbContext already is a Unit of Work plus repositories, so a thin generic repository over it can be pure ceremony. I use it where it earns its place — complex or reused queries — rather than wrapping everything blindly.",
  code: "public interface IVendorRepository {\n    Task<Vendor> GetAsync(int id);\n    Task<IReadOnlyList<Vendor>> SearchAsync(VendorFilter f);\n    Task AddAsync(Vendor v);\n}",
  project: "The procurement and vendor modules use repositories for all reusable and complex queries, with Unit of Work semantics coming from `SaveChangesAsync` on the DbContext so a multi-table operation commits as one transaction. Simple masters go through a generic repository; the tuned, index-sensitive queries get a dedicated one so the SQL is visible and reviewable.",
  remember: "Repository = all the queries for one entity in one place, behind an interface."
},

{
  id: "sol-singleton", topic: "solid",
  q: "Singleton pattern — and what is wrong with it",
  tags: ["singleton", "singleton pattern", "thread safe singleton", "static instance"],
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
}

]);
