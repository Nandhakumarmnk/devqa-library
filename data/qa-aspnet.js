/* ASP.NET Core, Web API and EF Core pack */
window.QA = (window.QA || []).concat([

{
  id: "net-pipeline", topic: "aspnet", star: true,
  q: "What is middleware and how does the ASP.NET Core request pipeline work?",
  tags: ["middleware", "request pipeline", "request lifecycle", "use vs run", "app.use", "what does middleware do and does order matter", "what is middleware and why does order matter", "how do security checks become a pipeline gate"],
  simple: "Every request walks through a line of small components. Each one can look at the request, pass it on, and then look at the response on the way back. That line is the pipeline, and each component is middleware.",
  answer: "Middleware components are registered in `Program.cs` with `app.Use...` and run in the order they are added. Each one receives the `HttpContext` and a `next` delegate: it can do work, call `next()`, and then do more work as the response unwinds. Calling `app.Run` or not calling `next()` short-circuits the pipeline.\nOrder matters a lot: exception handling first, then HTTPS redirection and static files, then routing, then **authentication before authorization**, then the endpoints. Putting UseAuthorization before UseAuthentication is the classic bug — the user is not identified yet, so everything looks anonymous.\nCustom middleware is where I put correlation ids, request logging and global exception handling.",
  code: "app.UseExceptionHandler(\"/error\");\napp.UseHttpsRedirection();\napp.UseStaticFiles();\napp.UseRouting();\napp.UseCors(\"VendorPortal\");\napp.UseAuthentication();     // who are you\napp.UseAuthorization();      // what may you do\napp.MapControllers();",
  project: "In the Vendor Portal API the pipeline carries a global exception handler that logs the full error and returns a clean JSON problem response, a correlation-id middleware so a failing vendor request can be traced through the logs, and the JWT authentication middleware that the role-based endpoints depend on.",
  remember: "Order matters. Exception handler first, authentication before authorization."
},

{
  id: "net-restapi", topic: "aspnet", star: true,
  q: "What makes an API RESTful? Verbs and status codes",
  tags: ["rest api", "what is rest api", "restful", "rest", "http verbs", "status codes", "web api design"],
  simple: "REST means you expose resources by URL and use the standard HTTP verbs on them, and you return the right status code so the caller knows what happened without reading the body.",
  answer: "Principles: resource-based URLs (nouns, plural — `/api/vendors/12/orders`), stateless requests, proper verb use, and consistent representations (JSON).\nVerbs: **GET** read (safe, idempotent), **POST** create, **PUT** full update (idempotent), **PATCH** partial update, **DELETE** remove (idempotent).\nStatus codes I actually use: 200 OK, 201 Created with a Location header, 204 No Content, 400 Bad Request for validation, 401 Unauthorized (not authenticated), 403 Forbidden (authenticated but not allowed), 404 Not Found, 409 Conflict, 422 for semantic validation, 500 for unhandled errors.\nAlso: version the API, page large collections, and never return the EF entity directly — map to a DTO.",
  code: "[HttpPost]\npublic async Task<IActionResult> Create(CreateVendorDto dto)\n{\n    if (!ModelState.IsValid) return BadRequest(ModelState);\n    var id = await _service.CreateAsync(dto);\n    return CreatedAtAction(nameof(Get), new { id }, null);   // 201 + Location\n}",
  project: "The Vendor Portal APIs follow this: versioned routes, Swagger documentation, DTOs on the wire, paged list endpoints with server-side filtering, and consistent error shapes so the React side can show field-level errors without special-casing each endpoint.",
  remember: "Nouns in the URL, verbs in HTTP, meaning in the status code."
},

{
  id: "net-jwt", topic: "aspnet", star: true,
  q: "How does JWT authentication work?",
  tags: ["jwt", "jwt authentication", "token based authentication", "bearer token", "claims", "how do you secure a web api", "how did you secure the api", "explain jwt how is it different from cookie authentication", "is jwt encrypted"],
  simple: "The user logs in once, the server hands back a signed token, and the browser sends that token with every later request. The server only checks the signature — it does not need to remember the session.",
  answer: "A JWT has three parts — header, payload (claims), signature — base64url encoded and dot-separated. On login I validate credentials and issue a token containing the user id, role and expiry, signed with a server-side key. The client sends it as `Authorization: Bearer <token>`, and the JWT middleware validates issuer, audience, lifetime and signature, then builds the ClaimsPrincipal that `[Authorize]` works against.\nKey points interviewers probe:\n- The payload is encoded, **not encrypted** — never put sensitive data in it.\n- It is stateless, so you cannot revoke a token before expiry; keep access tokens short-lived and use a refresh token for renewal.\n- Always HTTPS, validate the signing key, and never accept `alg: none`.",
  code: "builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)\n  .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters {\n      ValidateIssuer = true, ValidateAudience = true,\n      ValidateLifetime = true, ValidateIssuerSigningKey = true,\n      IssuerSigningKey = new SymmetricSecurityKey(key)\n  });\n\n[Authorize(Roles = \"Buyer,Approver\")]\npublic async Task<IActionResult> Approve(int id) { ... }",
  project: "This is the Vendor Portal login flow. React calls the login endpoint, stores the token, and an axios interceptor attaches it to every request; the API endpoints are decorated with role attributes so vendors, buyers and approvers only reach their own screens. Role-based routing on the React side is for convenience only — the real enforcement is the `[Authorize]` attribute on the server, because anything client-side can be bypassed.",
  remember: "Signed, not secret. Short expiry + refresh token. Enforce roles on the server."
},

{
  id: "net-authn-authz", topic: "aspnet",
  q: "Authentication vs authorization (and role-based access control)",
  tags: ["authentication vs authorization", "rbac", "role based access", "authorize attribute", "claims", "idor", "insecure direct object reference", "broken object level authorization", "is hiding a button by role security", "which comes first authentication or authorization", "how is authentication and authorisation done in your system"],
  simple: "Authentication = who are you. Authorization = what are you allowed to do. 401 means you did not prove who you are; 403 means you did, and you still cannot.",
  answer: "Authentication establishes identity — cookie, JWT, or ASP.NET Identity against the user store. Authorization decides access using roles, claims or policies.\nRBAC in practice: users get roles, roles get permissions, and endpoints declare what they need — `[Authorize(Roles = \"Admin\")]` or a policy like `RequireClaim(\"Permission\",\"PO.Approve\")`. Policies are better than roles once rules get finer than job titles.\nTwo rules I enforce: check on the server for every request (hiding a button is not security), and check ownership too — a vendor passing someone else's document id must get 403, not the document. That broken-object-level-authorization case is an OWASP item and a very common real bug.",
  code: "[Authorize(Policy = \"CanApprovePo\")]\npublic async Task<IActionResult> Approve(int id)\n{\n    var po = await _repo.GetAsync(id);\n    if (po.VendorId != User.VendorId()) return Forbid();   // ownership check\n    ...\n}",
  project: "The portal uses ASP.NET Identity plus role-based access for vendors, buyers and approvers. Adding explicit ownership checks on vendor-scoped endpoints was part of the security hardening work — before that, a valid token for one vendor could read another vendor's records by changing the id in the URL.",
  remember: "401 = unknown user. 403 = known user, not allowed. Always check on the server."
},

{
  id: "net-owasp", topic: "aspnet", star: true,
  q: "How do you prevent SQL injection, XSS and CSRF?",
  tags: ["owasp", "sql injection", "xss", "csrf", "security", "vulnerability fix", "what is in the owasp top 10", "what is csrf and how do you stop it", "how do you prevent xss on the front end", "explain xss and its three types", "what does 500 vulnerabilities actually mean", "how were the 500 found", "how do you stop sql injection", "what security work have you actually done", "how do you approach securing an application you have just inherited"],
  simple: "SQL injection: never build SQL by sticking strings together — use parameters. XSS: never trust what a user typed when you print it back — encode it. CSRF: make sure a request really came from your own page — use anti-forgery tokens.",
  answer: "**SQL injection** — use parameterised queries or EF Core (which parameterises automatically). Never concatenate user input into SQL, including inside stored procedures using dynamic SQL. Use least-privilege database accounts.\n**XSS** — Razor encodes by default; the risk is `Html.Raw`, `innerHTML` in jQuery, and `dangerouslySetInnerHTML` in React. Encode on output, validate on input, sanitise any HTML you must keep, and add a Content-Security-Policy header.\n**CSRF** — anti-forgery token on every state-changing form post (`[ValidateAntiForgeryToken]`), SameSite cookies, and for token-based APIs the JWT in an Authorization header is not auto-sent by the browser, which removes most of the risk.\nAlso in the same family: security headers, no stack traces to the user, no secrets in source, and keeping packages patched.",
  code: "// parameterised — safe\ncmd.CommandText = \"SELECT * FROM Vendor WHERE Code = @code\";\ncmd.Parameters.AddWithValue(\"@code\", code);\n\n// EF Core interpolated query is parameterised too\nvar v = await _db.Vendors.FromSqlInterpolated($\"SELECT * FROM Vendor WHERE Code = {code}\").ToListAsync();",
  project: "This is the work I am most often asked about: I resolved 500+ security issues and findings for XSS, SQL injection and CSRF on a live production system without business downtime, aligning the platform to the OWASP Top 10. The pattern was repetitive — replace concatenated SQL with parameters, encode output in the jQuery and Razor screens, add anti-forgery tokens to POST actions, and fix missing authorisation checks — delivered in batches with regression testing so nothing broke for users.",
  remember: "Parameterise, encode, token. Validate input, encode output, verify the caller."
},

{
  id: "net-efcore-migrations", topic: "aspnet", star: true,
  q: "How do EF Core code-first migrations work?",
  tags: ["ef core migrations", "code first", "add-migration", "update-database", "schema change", "how do you run a database migration safely for a release", "how do you ship a database change safely", "how do you handle database migrations and releases", "how do you run a migration on production"],
  simple: "You change the C# model, EF generates a migration file holding the SQL to move the database forward (Up) and back (Down), and you apply it to each environment.",
  answer: "`dotnet ef migrations add <Name>` compares the model against the last snapshot and generates Up/Down. `dotnet ef database update` applies pending migrations and records them in `__EFMigrationsHistory`.\nIn a real deployment I do not call `Database.Migrate()` blindly on startup in production — I generate the SQL script (`dotnet ef migrations script --idempotent`), review it, and run it as part of a controlled release with a matching rollback script.\nThings I watch: never edit an applied migration (add a new one), beware migrations that drop or rename columns because EF may generate drop-and-recreate and lose data, and always seed or back-fill data in a separate scripted step.",
  code: "dotnet ef migrations add AddVendorBankDetails\ndotnet ef database update\ndotnet ef migrations script --idempotent -o release_2026_10.sql",
  project: "Release management is part of my job. I handle EF Core migrations plus hand-written schema and data migration scripts, each with a pre-tested rollback script, and apply them in scheduled off-peak IIS release windows with post-deployment validation. I also run Production → UAT/Dev refreshes where sensitive fields are masked and then validated before the environment is handed back to the team.",
  remember: "Generate the script, review it, ship it with a rollback."
},

{
  id: "net-ef-tracking", topic: "aspnet", star: true,
  q: "EF Core performance — tracking, Include and the N+1 problem",
  tags: ["asnotracking", "n+1 problem", "include eager loading", "lazy loading", "ef core performance", "what is n+1 and how did you fix one"],
  simple: "By default EF watches every object it loads so it can save changes — that costs memory. For read-only screens turn it off. And never query inside a loop, or you fire one query per row.",
  answer: "- **AsNoTracking()** for read-only queries: no change tracker entries, noticeably less memory and CPU on list and report screens.\n- **N+1**: loading a list then touching a navigation property per row issues one query per row. Fix with `Include`/`ThenInclude` (eager loading) or a projection that selects exactly what the screen needs.\n- **Projection** with `Select` into a DTO is usually the fastest — it generates a narrower SELECT instead of pulling whole entities.\n- **Lazy loading** is convenient and is the usual accidental cause of N+1; I keep it off.\n- Also: paginate with Skip/Take on the server, avoid `ToList()` before filtering, and use `AddDbContext` scoped (a DbContext is not thread-safe and should be short-lived).",
  code: "var rows = await _db.PurchaseOrders\n    .AsNoTracking()\n    .Where(p => p.VendorId == id)\n    .Select(p => new PoListDto {\n        Id = p.Id, Number = p.Number, Vendor = p.Vendor.Name, Total = p.Total })\n    .OrderByDescending(p => p.CreatedOn)\n    .Skip(skip).Take(50)\n    .ToListAsync();",
  project: "The Vendor Portal listing and reporting screens all use no-tracking projections with server-side paging and filtering. On Smart Documents the equivalent cleanup — removing per-row queries and batching the reads — is what cut database round-trips by around 50%.",
  remember: "Read-only = AsNoTracking + Select. Never query inside a loop."
},

{
  id: "net-ef-vs-ado", topic: "aspnet",
  q: "Entity Framework vs ADO.NET vs Dapper",
  tags: ["ef vs ado.net", "dapper", "orm", "data access choice"],
  simple: "EF writes the SQL for you and is fastest to develop. ADO.NET is raw SQL where you control everything. Dapper is in between — your SQL, fast mapping.",
  answer: "**EF Core** — ORM with LINQ, change tracking, migrations. Best for CRUD and most business screens; the cost is generated SQL you must occasionally inspect.\n**ADO.NET** — SqlConnection/SqlCommand/SqlDataReader. Maximum control and the lowest overhead, but a lot of manual mapping code and you must manage connections and parameters yourself.\n**Dapper** — micro ORM: you write the SQL, it maps the result to objects quickly.\nIn practice I mix them: EF Core for normal entity work, raw SQL or stored procedures for heavy reporting queries and bulk operations where I need the exact execution plan.",
  code: "// EF Core for CRUD\nvar v = await _db.Vendors.FindAsync(id);\n\n// ADO.NET for a tuned report proc\nusing var cmd = new SqlCommand(\"rpt_VendorAging\", conn) { CommandType = CommandType.StoredProcedure };\ncmd.Parameters.AddWithValue(\"@VendorId\", id);",
  project: "That is exactly the split on our platform: EF Core 8 across the Vendor Portal and newer procurement modules, EF 6 and ADO.NET in Smart Documents where the reporting queries and the SAP-facing reads are hand-tuned stored procedures. Using the ORM everywhere would have made those report screens slower, not faster.",
  remember: "EF for CRUD, raw SQL for heavy reporting. Choose per query, not per project."
},

{
  id: "net-di-lifetime", topic: "aspnet", star: true,
  q: "Transient vs Scoped vs Singleton in ASP.NET Core DI",
  tags: ["di lifetime", "addscoped addsingleton addtransient", "service lifetime", "captive dependency", "what are the three di lifetimes", "which lifetime is dbcontext", "what is a dbcontext and the correct lifetime", "what is dependency injection and why does it matter in net core"],
  simple: "Transient = a new one every time you ask. Scoped = one per web request. Singleton = one for the whole application.",
  answer: "- **Transient** — new instance per resolution. Fine for small stateless services; wasteful if the object is expensive.\n- **Scoped** — one instance per HTTP request, shared by everything in that request. This is the right lifetime for DbContext, repositories and unit-of-work services, because everyone in the request shares the same transaction boundary.\n- **Singleton** — one for the process lifetime. Only for thread-safe, stateless things: configuration, caches, HttpClient factories.\nThe classic mistake is a **captive dependency** — injecting a scoped DbContext into a singleton. The singleton holds that DbContext forever, so it is shared across requests and threads, which leads to concurrency errors and stale data. ASP.NET Core will actually throw on this at startup in development.",
  code: "builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(cs));   // scoped\nbuilder.Services.AddScoped<IVendorRepository, VendorRepository>();\nbuilder.Services.AddSingleton<IClock, SystemClock>();\nbuilder.Services.AddTransient<IEmailBuilder, EmailBuilder>();",
  project: "Everything request-bound in the portal — DbContext, repositories, services, the current-user accessor — is scoped. Configuration providers and the SAP HttpClient setup are singletons. For Hangfire jobs, which run outside an HTTP request, I create an explicit scope inside the job so the DbContext lifetime is still correct.",
  remember: "DbContext = Scoped. Stateless config = Singleton. Never put Scoped inside Singleton."
},

{
  id: "net-filters", topic: "aspnet",
  q: "What are filters in ASP.NET Core?",
  tags: ["action filter", "exception filter", "authorization filter", "filters", "attribute", "what are filters or attributes in mvc and where did you use them"],
  simple: "Filters are hooks that run around your controller action — before it, after it, or when it throws — so cross-cutting code does not get copy-pasted into every action.",
  answer: "Order of execution: Authorization → Resource → Action → Exception → Result. Each is an attribute or a class registered globally.\n- **Authorization filter** — access checks, runs first.\n- **Action filter** — before/after the action, for logging, validation, timing.\n- **Exception filter** — catch and convert unhandled errors to a consistent response.\n- **Result filter** — around the response formatting.\nFilters are MVC-aware (they know the action and model), while middleware is lower level and sees only the HttpContext. I use middleware for pipeline-wide concerns and filters for things that need to know about the action.",
  code: "public class AuditActionFilter : IAsyncActionFilter {\n    public async Task OnActionExecutionAsync(ActionExecutingContext c, ActionExecutionDelegate next) {\n        _log.Information(\"{User} called {Action}\", c.HttpContext.User.Identity.Name, c.ActionDescriptor.DisplayName);\n        await next();\n    }\n}",
  project: "The procurement platform uses a global exception filter so every unhandled error is logged (ELMAH/log4net) and returned as a clean message, plus an audit filter on the approval actions so who approved what is recorded without each action writing its own audit code.",
  remember: "Middleware = whole pipeline. Filter = around the action."
},

{
  id: "net-validation", topic: "aspnet",
  q: "How do you validate input in ASP.NET Core?",
  tags: ["model validation", "data annotations", "modelstate", "fluentvalidation", "server side validation", "how does model binding work", "how do you validate input"],
  simple: "Validate on the client so the user gets fast feedback, and validate again on the server because the client can be bypassed.",
  answer: "Data annotations on the DTO — `[Required]`, `[StringLength]`, `[Range]`, `[EmailAddress]`, `[RegularExpression]` — plus `IValidatableObject` or FluentValidation for cross-field rules. With `[ApiController]` the framework returns a 400 with the validation problem details automatically; in MVC I check `ModelState.IsValid`.\nI return errors keyed by field so the UI can show them inline. And I never rely on client-side validation alone: it is a UX feature, not a security control — a request can always be replayed with Postman.",
  code: "public class CreateVendorDto {\n    [Required, StringLength(120)] public string Name { get; set; }\n    [Required, RegularExpression(\"^[0-9A-Z]{15}$\")] public string Gstin { get; set; }\n    [EmailAddress] public string Email { get; set; }\n}",
  project: "In the Vendor Portal the multi-step registration form validates in React as the user types, and the same rules exist on the API DTOs. The server returns field-keyed errors that the React form maps straight onto the inputs, so client and server messages stay consistent instead of drifting apart.",
  remember: "Client validation is for comfort. Server validation is the real one."
},

{
  id: "net-config", topic: "aspnet",
  q: "How do you manage configuration and secrets across environments?",
  tags: ["appsettings", "ioptions", "configuration", "environment variables", "connection string secret", "how would you secure secrets in the cloud"],
  simple: "Settings live in appsettings.json, each environment overrides what it needs, and passwords never go into source control.",
  answer: "Configuration is layered — appsettings.json, then appsettings.{Environment}.json, then environment variables, then command line — with later sources overriding earlier ones. `ASPNETCORE_ENVIRONMENT` selects the environment file.\nI bind sections to strongly typed classes with the Options pattern (`IOptions<SapSettings>`) rather than reading magic strings everywhere.\nSecrets: user-secrets locally, environment variables or a vault in production, never a password committed to Git. Connection strings for production are set on the server, not in the repo.",
  code: "builder.Services.Configure<SapSettings>(builder.Configuration.GetSection(\"Sap\"));\n\npublic SapClient(IOptions<SapSettings> options) { _cfg = options.Value; }",
  project: "Our environments — Dev, UAT, Production — differ by connection string, SAP endpoint and SMTP settings, and those are environment-specific rather than checked in. Hard-coded credentials were also one of the categories I had to clean up during the security work, because a connection string in source is a finding in itself.",
  remember: "Layered config, typed options, secrets outside source control."
},

{
  id: "net-cors", topic: "aspnet",
  q: "What is CORS and when did you need it?",
  tags: ["cors", "cross origin", "access-control-allow-origin", "preflight", "what is cors and why does it matter to you"],
  simple: "Browsers block a page on one domain from calling an API on another domain unless the API says it is allowed. CORS is that permission.",
  answer: "Same-origin policy blocks cross-origin XHR/fetch by default. The API opts in by returning `Access-Control-Allow-Origin` and friends. For anything other than a simple request the browser first sends an OPTIONS preflight asking which origins, methods and headers are allowed.\nIn ASP.NET Core I register a named policy and place `UseCors` after `UseRouting` and before `UseAuthorization`. I list the exact origins — `AllowAnyOrigin` with credentials is not even legal, and a wildcard on an authenticated API is a security finding.",
  code: "builder.Services.AddCors(o => o.AddPolicy(\"VendorPortal\", p => p\n    .WithOrigins(\"https://vendors.example.com\")\n    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));\napp.UseCors(\"VendorPortal\");",
  project: "This came up when the React front end ran on its own dev server against the .NET API on a different port — classic CORS failure in the browser console. We configured a named policy with the explicit dev and production origins rather than opening it to everything.",
  remember: "CORS is the server allowing a different origin. Never wildcard an authenticated API."
},

{
  id: "net-swagger", topic: "aspnet",
  q: "Swagger / OpenAPI and API versioning",
  tags: ["swagger", "openapi", "api documentation", "api versioning", "postman"],
  simple: "Swagger generates live documentation of your API from the code, so a front-end developer or tester can see and try every endpoint without asking you.",
  answer: "Swashbuckle reads the controllers, routes and DTOs and produces an OpenAPI document plus the Swagger UI. I enrich it with XML comments, `[ProducesResponseType]` attributes so the response codes and shapes are documented, and a security definition so a bearer token can be pasted in and endpoints tried authenticated.\nVersioning: `/api/v1/...` in the route (or a header), using Asp.Versioning so v1 keeps working while v2 ships. Rule of thumb — add fields freely, but removing or renaming a field is a breaking change and needs a new version.\nIn production I usually restrict or disable the UI, since a full map of the API is useful to an attacker too.",
  project: "The procurement and Vendor Portal APIs are documented in Swagger with JWT support in the UI, which is how the React developers and QA explore endpoints. Versioned routes let us change a contract without breaking the modules already calling the old one.",
  remember: "Swagger documents it, versioning keeps old callers alive."
},

{
  id: "net-cache", topic: "aspnet",
  q: "How do you use caching in a .NET application?",
  tags: ["caching", "imemorycache", "distributed cache", "redis", "response caching", "cache invalidation", "how would you add caching", "what do you cache and what do you never cache", "what caching have you used", "what are the caching strategies"],
  simple: "Cache the things that are read constantly and change rarely. The hard part is not storing it — it is knowing when to throw it away.",
  answer: "Levels I consider:\n- **IMemoryCache** — in-process, fastest, but per server; with multiple IIS workers or a farm each has its own copy.\n- **IDistributedCache / Redis** — shared across instances, survives a recycle, needed once you scale out.\n- **Response/output caching** and client caching headers for whole responses.\n- **Database-level** — indexed views, or a precomputed summary table for heavy reports.\nI cache lookup and master data (status lists, UOM, tax codes) with an absolute or sliding expiry, and I invalidate explicitly when the underlying master is edited. I do not cache user-specific or permission-sensitive data without keying it by user, because that leaks one user's data to another.",
  code: "var statuses = await _cache.GetOrCreateAsync(\"po-status-list\", entry => {\n    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6);\n    return _repo.GetStatusesAsync();\n});",
  project: "On the procurement screens the dropdown masters — statuses, units, tax codes, locations — are cached rather than queried on every page load, which removed a steady stream of tiny repeat queries. Transactional data like purchase orders is never cached, because approvers must see the current state.",
  remember: "Cache what is read often and changes rarely. Always decide the invalidation rule first."
},

{
  id: "net-logging", topic: "aspnet",
  q: "How do you handle logging and troubleshoot a production issue?",
  tags: ["logging", "ilogger", "log4net", "elmah", "serilog", "production issue", "debugging production", "how do you handle errors globally in a web api", "how do you monitor and diagnose a production issue", "how do you handle exceptions and logging", "how do you handle errors and logging", "how do you debug a javascript problem in production"],
  simple: "Log enough to answer what happened, to whom, and when — without logging passwords or personal data. Then follow the trail from the user's report to the exact request.",
  answer: "I use `ILogger<T>` with structured messages and levels that mean something — Information for business events, Warning for recoverable oddities, Error for failures with the exception object attached. Each request carries a correlation id so a single user action can be followed across layers.\nMy production triage order: reproduce or get the exact time and user, pull the error from ELMAH/log4net around that time, check whether it is data-specific or systemic, look at recent deployments, check the database (blocking, long-running query, deadlock) and IIS/event logs, then fix forward or roll back if the release is the cause.\nWhat never goes in a log: passwords, tokens, full card or bank numbers, and whole request bodies containing personal data.",
  code: "_log.LogError(ex, \"SAP post failed for invoice {InvoiceId} vendor {VendorId}\", id, vendorId);",
  project: "Our platform uses ELMAH and log4net, and that is the first place I go when business reports an issue. The combination of a timestamp from the user, the logged exception with the record id, and the release history usually identifies the cause quickly — and because every release ships with a tested rollback script, backing out is an option rather than a panic.",
  remember: "Structured logs + correlation id + no secrets in the log."
},

{
  id: "net-hangfire", topic: "aspnet", star: true,
  q: "How do you run background jobs in .NET? (Hangfire)",
  tags: ["hangfire", "background job", "scheduled job", "recurring job", "retry", "ihostedservice", "how do you run background or long-running work"],
  simple: "Work that is slow or must happen on a schedule should not run inside the user's request. You queue it, a background worker picks it up, and it retries if it fails.",
  answer: "Options in .NET: `IHostedService`/`BackgroundService` for in-process work, Hangfire for persisted jobs with a dashboard and retries, or an external scheduler/queue once you need to scale out.\nHangfire stores jobs in SQL Server, so a queued job survives an app pool recycle. It supports fire-and-forget, delayed, recurring (cron) and continuation jobs, with automatic retry and a monitoring dashboard.\nThings I design for: jobs must be **idempotent** because a retry can run the same work twice, long jobs should be chunked, failures need alerting rather than silent retrying forever, and under IIS the app pool idle timeout must be disabled or the worker stops.",
  code: "RecurringJob.AddOrUpdate<ISapSyncJob>(\"vendor-sync\",\n    j => j.SyncVendorsAsync(), \"*/15 * * * *\");       // every 15 minutes\n\nBackgroundJob.Enqueue<IInvoiceJob>(j => j.PostAsync(invoiceId));",
  project: "This is SAP Synchronization Services, which I built from scratch. Hangfire runs the near real-time two-way sync between our platform and SAP Business One, with retry on transient failures, failure alerts, and a dashboard for monitoring, so failed jobs recover automatically instead of someone reconciling data by hand. The handlers are idempotent and keyed on the document id so a retry cannot post the same invoice twice.",
  remember: "Queue it, persist it, retry it — and make the handler safe to run twice."
},

{
  id: "net-iis", topic: "aspnet",
  q: "How do you deploy and host a .NET application on IIS?",
  tags: ["iis", "deployment", "app pool", "kestrel", "hosting", "ssl", "release", "zero downtime deployment", "app_offline", "deployment slots", "what is kestrel and why put iis in front of it", "how is the application configured and deployed"],
  simple: "Publish the app, drop it in a folder on the server, point an IIS site at it with its own app pool, bind HTTPS, and keep a way to put the old version back.",
  answer: "ASP.NET Core runs on Kestrel with IIS acting as a reverse proxy through the ASP.NET Core Module — IIS handles the ports, SSL and process management; Kestrel runs the app. The published folder plus `web.config` is what gets deployed.\nMy checklist: app pool set to No Managed Code for Core apps and a dedicated identity, HTTPS binding with a valid certificate and HSTS, `ASPNETCORE_ENVIRONMENT` set to Production, folder permissions for the pool identity, and a smoke test after the swap.\nI deploy in off-peak windows, take a backup of the current build and database first, apply database scripts before the app files, and keep the matching rollback script ready. Recycling or `app_offline.htm` handles the file lock during the swap.",
  project: "Release and deployment management is one of my responsibilities. I manage IIS hosting and SSL setup, deploy in scheduled off-peak windows with pre-tested rollback scripts, run post-deployment validation, and then support QA, UAT and business teams after go-live. Doing it in planned windows with a rehearsed rollback is how we meet the SLA commitments.",
  remember: "IIS fronts Kestrel. Backup, scripts first, app second, smoke test, rollback ready."
},

{
  id: "net-fileupload", topic: "aspnet",
  q: "How do you handle file uploads safely?",
  tags: ["file upload", "iformfile", "excel upload", "upload validation", "bulk upload"],
  simple: "Check the size, check the real type, never trust the file name, store it outside the web folder, and tell the user exactly which rows were wrong.",
  answer: "Server side: cap the size (`RequestSizeLimit` and IIS `maxAllowedContentLength`), allow only known extensions and verify the content type/signature, generate a new stored file name instead of using the user's (path traversal and overwrite risk), store outside wwwroot or in blob storage, and scan if the environment requires it.\nFor large files stream to disk rather than buffering into memory. For Excel bulk uploads I parse with a library, validate row by row, and return a report of the failed rows with reasons instead of stopping at the first error — and the whole import commits as a transaction, or is staged, so a half-imported file is not left behind.",
  code: "if (file.Length > 10 * 1024 * 1024) return BadRequest(\"Max 10 MB\");\nvar ext = Path.GetExtension(file.FileName).ToLowerInvariant();\nif (ext != \".xlsx\") return BadRequest(\"Only .xlsx allowed\");\nvar stored = $\"{Guid.NewGuid():N}{ext}\";",
  project: "I built the Excel bulk upload modules with row-level validation and SAP sync logic. Users upload item and vendor data, each row is validated against masters, and they get back a clear list of which rows failed and why — that error report is what made the feature usable, because the first version simply rejected the whole file. The Vendor Portal registration flow has the same safeguards for document attachments.",
  remember: "Limit size, verify type, rename the file, validate every row, report failures."
},

{
  id: "net-minimal-api", topic: "aspnet",
  q: "Minimal APIs vs controllers",
  tags: ["minimal api", "controllers", "maps endpoints", "program.cs"],
  simple: "Minimal APIs let you declare an endpoint in a couple of lines. Controllers give you more structure. Small service, minimal; big app with many endpoints, controllers.",
  answer: "Minimal APIs (`app.MapGet(...)`) cut the ceremony — no controller class, no attribute routing — and start marginally faster. They suit small services, internal endpoints and microservices with a handful of routes.\nControllers still win for a large API surface: model binding conventions, filters, grouped routing and a familiar structure keep hundreds of endpoints organised.\nThey share the same pipeline, DI and middleware, so it is an organisational choice. For anything beyond a few endpoints I would still group minimal endpoints into modules rather than letting Program.cs grow.",
  code: "app.MapGet(\"/api/vendors/{id:int}\", async (int id, IVendorService svc) =>\n    await svc.GetAsync(id) is {} v ? Results.Ok(v) : Results.NotFound())\n   .RequireAuthorization();",
  remember: "Few endpoints = minimal. Big API = controllers."
},

{
  id: "net-mvc-lifecycle", topic: "aspnet",
  q: "ASP.NET MVC — request lifecycle, ViewBag vs ViewData vs TempData",
  tags: ["mvc", "explain mvc", "mvc flow", "what is mvc", "mvc lifecycle", "viewbag viewdata tempdata", "razor", "partial view"],
  simple: "A request goes route → controller → action → model → view → HTML. ViewBag and ViewData pass data to the current view only; TempData survives one redirect.",
  answer: "Lifecycle: routing matches the URL to a controller and action, model binding fills the parameters, filters run, the action executes and returns an `ActionResult`, the view engine renders Razor to HTML.\nPassing data:\n- **ViewData** — dictionary, string keys, needs casting.\n- **ViewBag** — dynamic wrapper over ViewData, no compile-time check.\n- **TempData** — backed by session, survives exactly one redirect, which is how I carry a success message through a POST-redirect-GET.\nThe right answer for anything structured is a strongly typed view model — compile-time safety and IntelliSense beat dynamic bags.",
  code: "TempData[\"Message\"] = \"Purchase order approved\";\nreturn RedirectToAction(nameof(Index));",
  project: "The established procurement modules are MVC 5 with Razor views, strongly typed view models, and partial views rendered into jQuery AJAX grids. TempData carries the after-save confirmation through the redirect so a browser refresh does not resubmit the form.",
  remember: "ViewBag/ViewData = same request. TempData = survives one redirect. View model = best."
},

{
  id: "net-session-state", topic: "aspnet",
  q: "How is state managed in a web application?",
  tags: ["session", "state management", "cookies", "stateless", "session vs jwt", "scale sessions across servers", "distributed session", "sticky session", "redis session state", "session disadvantages"],
  simple: "HTTP forgets you after every request. You either store something on the client (cookie or token) or keep a session on the server.",
  answer: "Client side: cookies (small, sent automatically — mark them HttpOnly, Secure, SameSite), localStorage/sessionStorage, or a JWT held by the SPA.\nServer side: session state (in-memory by default, so it breaks across a web farm unless you move it to SQL Server or Redis), caches, or the database itself.\nFor APIs I prefer stateless token auth — no server session to replicate, which makes scaling out and recycling painless. For traditional MVC screens, cookie authentication with a distributed session is the practical choice.\nI keep session data small and never put sensitive data in a non-HttpOnly cookie or in localStorage where XSS can read it.",
  project: "The MVC procurement modules use cookie authentication with ASP.NET Identity, while the React Vendor Portal uses stateless JWT against the API. That split is deliberate: the SPA never needs a server session, so the API scales and recycles without anyone being logged out mid-task.",
  remember: "Cookie/session for server-rendered apps, token for SPAs and APIs. Keep session small."
},

{
  id: "net-claims", topic: "aspnet", star: true,
  q: "What are claims and how did you use them?",
  tags: ["claims", "claimsprincipal", "claims identity", "custom claims factory", "tenant isolation"],
  simple: "Claims are extra facts stamped onto the logged-in user — for us, the role and the vendor code. They travel with every request, so the server always knows who is asking and what they are allowed to see.",
  answer: "A claim is a name/value pair on the `ClaimsPrincipal` — user id, role, email, or anything the application needs. They are built at login and carried in the cookie or the JWT, so every later request arrives already knowing who the user is.\nThe part that matters is using them for **data filtering**, not just for display. A custom claims principal factory adds the business key at login, and the data layer reads it from the claims rather than from the request — so the filter cannot be tampered with by changing a value in the URL or the payload.\nThat closes the broken-object-level-authorization hole: an `[Authorize]` attribute proves the user is logged in and has a role, but only a claims-driven filter stops *this* logged-in user reading *another* user's record.",
  code: "// at login\nidentity.AddClaim(new Claim(\"VendorCode\", vendor.Code));\n\n// in the data layer - the filter comes from the token, never from the request\nvar vendorCode = _user.FindFirstValue(\"VendorCode\");\nvar rows = await _repo.GetPurchaseOrdersAsync(vendorCode);",
  project: "This is the heart of security in the Vendor Portal. At login we build the user's claims with a custom claims principal factory, including the vendor code; every repository reads that code from the claims and filters the query by it. A vendor physically cannot see another vendor's purchase orders, even by changing an id in the URL. The claims factory, the claims management service and the attach-claims middleware are the three pieces that make that work.",
  remember: "Claims travel with the request. Filter data by the claim, never by a value the user sent."
},

{
  id: "net-viewmodel-dto", topic: "aspnet", star: true,
  q: "Model, ViewModel and DTO — what is the difference?",
  tags: ["model vs viewmodel vs dto", "dto", "viewmodel", "entity vs dto", "automapper", "why use a dto instead of returning the entity"],
  simple: "Model is the database entity. ViewModel is exactly the fields one screen needs. DTO is what crosses an API boundary. They look similar and they are not the same thing.",
  answer: "- **Model / entity** — maps to the table. Owned by the data layer, carries every column including internal ones.\n- **ViewModel** — shaped for one screen: the fields that screen shows, plus whatever it needs for validation and dropdowns. It can combine several entities.\n- **DTO** — the contract on the wire. It is the public shape of your API, so changing it breaks callers.\nI never send the entity straight to a view or to an API caller. Three reasons: the response stays small, internal columns do not leak out, and over-posting is blocked — a user cannot set `IsApproved` or `CreatedBy` just by adding it to the JSON, because the DTO has no such property.\nMapping can be by hand or with AutoMapper. Hand-written mapping is more code but it is explicit, and it fails at compile time when a property changes.",
  code: "public class PurchaseOrder { public int Id; public decimal Total; public int CreatedBy; /* entity */ }\n\npublic record PoListDto(int Id, string Number, decimal Total);   // what the API returns\n\npublic class PoEditViewModel {                                   // what one screen needs\n    public PoListDto Po { get; set; }\n    public List<SelectListItem> Vendors { get; set; }\n}",
  project: "Every one of our applications is built this way — the Vendor Portal has a ViewModel folder for its screens, and Data Exchange, Smart Documents and the Work Flow modules each have DTO folders for what crosses the API boundary. Keeping those separate is also what stops an internal audit column appearing in a JSON response.",
  remember: "Entity = the table. ViewModel = one screen. DTO = the wire. Never return the entity."
},

{
  id: "net-signalr", topic: "aspnet",
  q: "What is SignalR and where did you use it?",
  tags: ["signalr", "websocket", "real time", "push notification", "progress bar", "hub", "how do you push live data to a screen"],
  simple: "SignalR lets the server push a message to an open browser page, instead of the page asking again and again whether anything has changed.",
  answer: "SignalR is the real-time library in ASP.NET Core. It negotiates the best available transport — WebSockets first, falling back to Server-Sent Events or long polling — and hides that behind a simple hub API. The server calls a method on the client; the client calls a method on the hub.\nWhere it earns its place: progress for a long-running job, live dashboards, notifications, and anything where the alternative is the browser polling every few seconds and mostly being told nothing changed.\nThings to plan for: with more than one server you need a backplane (Redis or Azure SignalR) so a message reaches a client connected to a different instance, hubs should be thin and push work to a service, and connections must be grouped or targeted by user so one tenant's progress is not broadcast to everyone.",
  code: "await _hub.Clients.Group(jobId)\n    .SendAsync(\"progress\", new { done = processed, total = rowCount });",
  project: "During a bulk data migration in the Vendor Portal the user had no idea how far it had reached. I added a SignalR hub for migration status, and the Hangfire job pushes its progress to that hub — so the page shows a live progress bar instead of the user pressing refresh and guessing.",
  remember: "Server pushes to the browser. Needs a backplane once you run more than one instance."
},

{
  id: "net-refresh-token", topic: "aspnet", star: true,
  q: "Why refresh tokens? How do you handle logout and revocation?",
  tags: ["refresh token", "token revocation", "logout jwt", "token expiry", "revoke token", "jwt vs cookie authentication"],
  simple: "A JWT cannot be cancelled before it expires, so you keep it short-lived. The refresh token is a second, longer-lived token that gets you a new one without making the user log in again.",
  answer: "**The problem**: a JWT is stateless and self-validating. The server does not look it up anywhere, so there is no switch to turn it off. If it lasts 8 hours and is stolen, the attacker has 8 hours.\n**The pattern**: a short access token (5–15 minutes) plus a long-lived refresh token (days). When the access token expires, the client posts the refresh token to a refresh endpoint and gets a new pair.\n**The refresh token is the one you must control**, because it is the long-lived credential:\n- **Store it server-side** (hashed, like a password), so it *can* be revoked — that is the whole point of it.\n- **Rotate on every use**, and if an already-used token is presented again, treat it as theft and revoke the whole family.\n- Bind it to the device or client where you can, and give it an absolute expiry as well as a sliding one.\n**Logout** then means: delete the refresh token server-side and drop the access token on the client. The access token stays technically valid until it expires, which is exactly why it is short.\n**If you need instant revocation** — a sacked employee, a compromised account — you need server state regardless: a deny-list of token ids checked per request, or a token-version claim compared against the user record. Say that plainly rather than pretending JWT revocation is free.\n**JWT vs cookie auth**: a cookie session is revocable by deleting the server session and is HttpOnly so script cannot read it, but it needs shared session state to scale and CSRF protection. A JWT scales without shared state and avoids CSRF when sent in a header, at the cost of revocation. Neither is simply better.",
  code: "// refresh: validate, rotate, re-issue\nvar stored = await _refresh.FindAsync(Hash(dto.RefreshToken));\nif (stored is null || stored.Revoked || stored.ExpiresOn < DateTime.UtcNow)\n    return Unauthorized();\n\nawait _refresh.RevokeAsync(stored);                 // rotate - single use\nvar pair = await _tokens.IssueAsync(stored.UserId); // new access + refresh\nreturn Ok(pair);",
  project: "The Vendor Portal keeps access tokens short and attaches them through an axios interceptor, with a 401 sending the user back to login. That short lifetime is the practical control — it keeps the window small without pretending a stateless token can be cancelled.",
  remember: "Short access token, revocable refresh token stored server-side and rotated. Instant revocation needs server state."
},

{
  id: "net-crypto", topic: "aspnet", star: true,
  q: "Hashing vs encryption, and symmetric vs asymmetric",
  tags: ["hashing vs encryption", "symmetric vs asymmetric", "password hashing", "bcrypt", "aes rsa", "salt", "encryption basics", "how should passwords be stored", "what is pbkdf2"],
  simple: "Hashing is one way — you can check a value but never get it back. Encryption is two way — it is meant to be reversed with a key. Passwords are hashed, data you need to read again is encrypted.",
  answer: "**Hashing** is one-directional: same input gives the same hash, and you cannot reverse it. It is for verification — passwords, file integrity, signatures.\n- For **passwords** use a deliberately slow algorithm designed for it: bcrypt, scrypt, Argon2, or PBKDF2 (which is what ASP.NET Identity uses). Never plain SHA-256 or MD5 — they are fast, which is exactly what an attacker wants.\n- A **salt** (unique per user, stored alongside) stops precomputed rainbow tables and stops two users with the same password having the same hash.\n**Encryption** is reversible with a key, and is for data you must read back — connection strings, stored bank details, data in transit.\n- **Symmetric** (AES) — one key encrypts and decrypts. Fast, good for bulk data. The hard part is sharing the key safely.\n- **Asymmetric** (RSA, ECC) — a public key encrypts, a private key decrypts. Solves key distribution, but is slow for large payloads.\n- **TLS uses both**: asymmetric to agree a session key, then symmetric for the actual traffic, because that is the combination that is both safe and fast.\n**Encoding is neither.** Base64 is not security — it is reversible by anyone, and a JWT payload is encoded, not encrypted.\n**The practical rules**: never write your own crypto, never store a password you could read back, keep keys outside source control, and rotate them.",
  code: "// password - ASP.NET Identity does salting + PBKDF2 for you\nvar result = await _userManager.CreateAsync(user, password);\n\n// wrong, every time\nvar bad = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(password)));",
  project: "Our applications use ASP.NET Identity for credentials, so password hashing and salting are handled by the framework rather than hand-rolled. On the encryption side, the connection string in the BI application is encrypted in config and decrypted at startup — plain-text credentials in a deployed config were one of the categories in the security remediation work.",
  remember: "Hash passwords (slow algorithm + salt), encrypt data you must read back. Symmetric is fast, asymmetric solves key sharing. Base64 is not encryption."
}
,

{
  id: "net-security-headers", topic: "aspnet",
  q: "Which security headers do you set?",
  tags: ["security headers", "HSTS", "content security policy", "CSP", "X-Frame-Options", "X-Content-Type-Options", "clickjacking", "referrer policy", "server header", "what security headers do you set"],
  simple: "Six of them, and I know them by heart because a penetration test failed us on every one. HSTS, X-Content-Type-Options, X-Frame-Options, a content security policy, a referrer policy, and removing the headers that tell an attacker what you are running.",
  answer: "These came out of the VAPT audit, where missing headers were a whole category of findings on their own.\nHSTS tells the browser to only ever use HTTPS for this site, so a downgrade to plain HTTP cannot happen even on the first redirect.\nX-Content-Type-Options set to nosniff stops the browser guessing a file is a script when the server said it was text. That matters a lot on a site that serves user-uploaded documents, which ours does.\nX-Frame-Options, or frame-ancestors in a CSP, stops someone putting my page inside an invisible iframe on their site and tricking a logged-in user into clicking something. That is clickjacking.\nThe content security policy is the big one and the hardest to retrofit. It lists where scripts and styles are allowed to load from, so even if an attacker gets a script onto the page, the browser refuses to run it. On an old codebase full of inline handlers you have to clean those up first, which is why it takes real work rather than one line of config.\nReferrer-Policy, so a document URL with an id in it is not leaked to whatever site the user clicks through to.\nAnd then taking headers away — Server, X-Powered-By, X-AspNet-Version. They tell an attacker exactly what version you are running and they buy you nothing.\nIn ASP.NET Core I add these in middleware, early in the pipeline, so every response carries them. In the MVC 5 applications they go in web.config, and the ones IIS adds itself get removed there too.",
  project: "All six went on during the VAPT remediation on Smart Documents. Before that we had none of them, and the report listed each one as a separate finding — which is why I can name them without looking them up.",
  remember: "HSTS, nosniff, frame options, CSP, referrer policy, and delete the version headers."
},

{
  id: "net-partial-viewcomponent", topic: "aspnet",
  q: "Partial View vs View Component — when do you use each?",
  tags: ["partial view", "view component", "razor", "reusable UI", "child action", "invoke async"],
  simple: "A partial view is a chunk of markup that renders with the data the parent hands it. A view component is a partial view that can fetch its own data. If it needs to go to the database, it is a view component.",
  answer: "A partial view is just markup you have pulled out so you can reuse it — a vendor address block, a row template for a grid. It has no logic of its own and no way to get data; whatever the parent view passes in is what it renders.\nA view component is a small class with an Invoke or InvokeAsync method, plus its own view. Because it is a class, it can take dependencies through the constructor and go and fetch what it needs. It does not go through model binding or the action filter pipeline, and it is not reachable by a URL — it is only ever rendered from a view.\nThe rule I use is simple: if the thing on the screen needs its own data, it is a view component. A notification count in the header, an approval-pending badge, a dashboard tile — those all have to query something, and I do not want to load that into every controller action just because the layout shows it.\nIf it is purely presentational, a partial view is lighter and clearer.\nIn MVC 5 the older equivalent was a child action with Html.Action, and it was slower because it went through the whole action pipeline. View components replaced that in Core and they are the better tool.",
  project: "The pending-approval badge in the header of the procurement screens is a view component — it counts what is waiting for the logged-in user, so it has to query on every page. The document line template is a partial view, because the parent already has the lines.",
  remember: "Needs its own data, it is a view component. Just markup, partial view."
},

{
  id: "net-jwt-storage", topic: "aspnet",
  q: "Is a JWT encrypted? Where do you store it on the client?",
  tags: ["JWT encrypted", "signed not encrypted", "base64", "store token", "localStorage", "httpOnly cookie", "XSS token theft", "token expiry"],
  simple: "No, a normal JWT is signed, not encrypted. Anyone can read what is inside it. The signature only proves it has not been tampered with. So never put anything secret in it.",
  answer: "This is one people get wrong, so I am careful with it. A standard JWT is three base64 parts — header, payload, signature. Base64 is encoding, not encryption. Paste a token into jwt.io and you can read the whole payload. What the signature gives you is integrity: if somebody changes the role claim from User to Admin, the signature no longer matches and the server rejects it.\nSo the rule is never put anything in a token you would not be happy for the user to read. A user id, a vendor code, roles, an expiry — fine. A password or anything confidential — never. If you genuinely need the contents hidden there is JWE, which is an encrypted JWT, but I have not needed it.\nOn where to store it, there is no perfect answer and I would say that honestly. localStorage is easy and survives a refresh, but any script running on the page can read it, so one XSS bug and the token is gone. An httpOnly cookie cannot be read by script at all, which closes that hole, but cookies are sent automatically so you have to deal with CSRF, which means SameSite and an antiforgery token.\nMy preference is the httpOnly cookie with SameSite, because an XSS that steals a token is worse than a CSRF you can defend against directly. Either way, keep the access token short-lived and use a refresh token, so a stolen one is only useful for a few minutes.",
  project: "In the Vendor Portal the token carries the vendor code as a claim, and every query is filtered by that claim on the server. Even if somebody did get hold of a token, they still only see their own data — and it expires quickly.",
  remember: "Signed, not encrypted. Nothing secret inside. Short expiry, and httpOnly beats localStorage."
},

{
  id: "net-long-running", topic: "aspnet",
  q: "How do you handle a long-running operation in an API?",
  tags: ["long running request", "202 accepted", "polling", "background job", "Hangfire", "job status endpoint", "timeout", "SignalR progress", "how do you handle long-running work in an api", "how would you handle a long-running operation in an api"],
  simple: "You do not make the user wait on the request. You accept the work, return a job id straight away, and let them check on it or get pushed an update when it finishes.",
  answer: "If a request is going to take more than a few seconds, holding the HTTP connection open is the wrong design. The browser or the load balancer will time out, the user has no idea whether it worked, and if they hit refresh you get the whole job running twice.\nWhat I do instead is accept the request, validate it, queue the work, and return 202 Accepted with a job id and a URL where the status can be read. The client then either polls that status endpoint, or — better — I push the progress to it.\nThe queue has to survive a restart. That is why I use Hangfire with its storage in SQL Server rather than a fire-and-forget Task, because a plain background task dies with the app pool recycle and nobody ever finds out.\nThe job itself has to be safe to run twice, so the handler is idempotent and keyed on something stable. And the user needs to see failures, not just successes, so the status record holds a state and an error message rather than just disappearing.\nFor the push side I use a SignalR hub, so a long import shows a real progress bar instead of a spinner that tells you nothing.",
  project: "The data migration and bulk import screens in the Vendor Portal work exactly this way — Hangfire does the work, the SignalR hub pushes progress to the browser, and the user can leave the page and come back to the status.",
  remember: "202 and a job id. Hangfire so it survives a recycle. SignalR so they can watch it."
},

{
  id: "net-idempotency", topic: "aspnet",
  q: "What is idempotency? Which HTTP verbs are idempotent?",
  tags: ["idempotency", "idempotent", "PUT vs PATCH vs POST", "double submit", "retry safe", "idempotency key", "duplicate invoice", "what is idempotency and why does it matter", "how do you ensure idempotency for post operations", "put vs patch vs post which are idempotent"],
  simple: "Idempotent means doing it twice has the same effect as doing it once. GET, PUT and DELETE are. POST is not, which is why a double-click can create two invoices.",
  answer: "An operation is idempotent if repeating it does not change the outcome. GET obviously — reading twice changes nothing. PUT replaces a resource with exactly what you sent, so sending it five times leaves the same result. DELETE is idempotent too: the first call removes it, the rest find nothing to remove, and the end state is the same.\nPOST is the one that is not, because it creates something new each time. PATCH is usually not either, because it applies a change rather than setting a value — increase the quantity by one, run it twice, and you have added two.\nThis is not a theory question for me, it is the double-submit problem. A user clicks Save, the response is slow, they click again, and you have two purchase invoices against the same purchase order.\nI deal with it in three places. On the client the button disables on submit. In the database there is a unique constraint on the real business key — the document number per company per year — so even if two requests arrive, the second one fails on the constraint rather than creating a duplicate. And for anything coming from another system I take an idempotency key on the request and store it, so a retry returns the original result instead of doing the work again.\nThat last one matters most for integrations, because a retry is normal there, not an accident.",
  project: "The SAP sync handlers are keyed on the document id for exactly this reason — the queue retries on a transient failure, and without that key a retry would post the same invoice into SAP twice.",
  remember: "GET, PUT, DELETE yes. POST no. Unique constraint in the database is the real guard."
},

{
  id: "net-project-structure", topic: "aspnet",
  q: "How would you structure a new ASP.NET Core Web API project?",
  tags: ["project structure", "solution layout", "layered architecture", "folder structure", "API project", "where does logic go", "new project setup", "how would you structure a new asp net core web api project", "how would you lay out a new solution"],
  simple: "Four projects — API, Services, Data, and a shared Contracts or Domain project. Controllers stay thin, the rules live in the service layer, and everything is wired through interfaces.",
  answer: "I would keep it boring and layered, because that is what the next person can read.\nThe API project holds controllers, middleware, the startup wiring and configuration. Controllers do three things: take the request, check the model is valid, call a service. No business rules, no SQL.\nThe Services project holds the rules. It takes and returns DTOs, never entities, so the database shape does not leak out to the client.\nThe Data project holds the DbContext, the entities, the migrations and the repositories, plus the ADO.NET helper for the tuned queries that the ORM should not be doing.\nAnd a Contracts or Domain project holds the DTOs and the interfaces, so the API and the Services can both reference it without referencing each other's internals.\nOn top of that, from day one: dependency injection registered against interfaces, a global exception handler in middleware, Serilog with a correlation id on every log line, Swagger with the auth scheme documented, API versioning in the route, FluentValidation or data annotations on the inputs, and health check endpoints.\nI would not start with Clean Architecture's full folder ceremony on a small service. The layering matters; the number of projects beyond that is taste, and too many empty projects slows people down.",
  project: "This is the layout of SCM.Data.Exchange and the Vendor Portal API. The one thing I would add if I started again is a test project, because neither has one.",
  remember: "API, Services, Data, Contracts. Thin controllers. DTOs out, never entities."
},

{
  id: "net-code-first-db-first", topic: "aspnet",
  q: "Code First vs Database First — which do you use?",
  tags: ["code first", "database first", "scaffold DbContext", "migrations", "existing database", "model first", "reverse engineer", "code first vs database first which do you use"],
  simple: "Code First for anything new, because the model is in source control and migrations give you a history. Database First when the schema already exists or a DBA owns it, which has been the case on most of our older systems.",
  answer: "Code First means the C# classes are the truth. You change a class, add a migration, and EF generates the SQL. The advantage is that the schema lives in source control next to the code, every change has an Up and a Down, and a new developer can build the database from nothing.\nDatabase First means the database is the truth and you generate the classes from it, with Scaffold-DbContext. That is the right choice when the schema already exists, when a DBA owns it, or when there is a lot of stored-procedure logic you are not about to move into C#.\nIn practice I have used both. The newer .NET 8 work is Code First. The older systems are Database First, because the schemas were there long before and the reporting procedures are hand-tuned.\nThe thing I would add is that Code First does not mean letting EF run itself against production. I generate the script, read it, and run it in the release window — because EF will quite happily script a drop-and-create for what is really a column rename, and take the data with it.",
  project: "The Vendor Portal and the Data Exchange service are Code First with migrations. Smart Documents and the BI reporting database are Database First, because the tuned procedures came first and still do the heavy lifting.",
  remember: "New work Code First. Existing or DBA-owned schema, Database First. Always script it before production."
},

{
  id: "net-ef-sproc", topic: "aspnet",
  q: "How do you call a stored procedure from EF Core?",
  tags: ["stored procedure EF Core", "FromSqlRaw", "FromSqlInterpolated", "ExecuteSqlRaw", "keyless entity", "SQL injection EF", "raw SQL", "how do you call a stored procedure from ef core"],
  simple: "FromSqlInterpolated for a procedure that returns rows, ExecuteSqlRaw for one that does not. Use the interpolated version so the values go across as parameters and not as string concatenation.",
  answer: "If the procedure returns a set of rows that map to an entity, it is FromSqlRaw or FromSqlInterpolated on the DbSet. If the shape does not match an entity — a report with joined columns — I define a keyless entity type for it and query that instead.\nIf the procedure returns nothing and just does work, it is ExecuteSqlRaw or ExecuteSqlRawAsync on the Database property.\nThe important detail is injection. FromSqlRaw with a concatenated string is a SQL injection hole, exactly like string concatenation in ADO.NET. FromSqlInterpolated looks like string interpolation but EF turns the values into parameters, so it is safe. If I use FromSqlRaw I pass SqlParameter objects explicitly.\nTwo more things worth knowing. The results are still tracked unless you add AsNoTracking, and for a report that is pure cost. And you cannot compose freely on top of it — adding a Where after FromSql only works in limited cases, so I put the filtering inside the procedure where it belongs.\nHonestly though, when a query is heavy enough to be a tuned procedure, I often skip EF for it altogether and use the ADO.NET helper, because then I control the mapping and I can read several result sets in one round trip.",
  project: "Smart Documents does both — EF 6 for the entity screens, and the ADO.NET helper for the procedures that return header, lines and totals in one call. Returning several result sets at once was a big part of cutting round trips by about half.",
  remember: "FromSqlInterpolated for rows, ExecuteSqlRaw for work. Never concatenate into FromSqlRaw."
},

{
  id: "net-concurrency", topic: "aspnet",
  q: "How do you handle concurrency conflicts?",
  tags: ["concurrency", "optimistic concurrency", "pessimistic locking", "RowVersion", "rowversion timestamp", "last write wins", "DbUpdateConcurrencyException", "two users same record", "what happens if two users save the same record", "how do you handle a concurrency conflict"],
  simple: "Optimistic concurrency. Every row carries a RowVersion, the update checks it, and if someone else saved first the update affects zero rows and I tell the user instead of silently overwriting their colleague's work.",
  answer: "The problem is two people opening the same purchase order, both editing, both clicking Save. Without anything in place the second save silently wins and the first person's change vanishes with no error. That is the worst outcome, because nobody knows it happened.\nI use optimistic concurrency. The table has a rowversion column, SQL Server updates it automatically on every change, and the value is loaded with the record and sent back with the update. The UPDATE has the original rowversion in its WHERE clause, so if anyone changed the row in the meantime, nothing matches and the row count comes back zero. In EF that surfaces as a DbUpdateConcurrencyException.\nWhat I do with the conflict depends on the screen. For most of ours I reload, show the user that the record changed and who changed it, and let them decide. For something where the fields do not overlap you can merge — take their change and keep the other person's. What I never do is just retry the save, because that is the silent overwrite again with extra steps.\nPessimistic locking — actually locking the row while someone edits — I avoid in a web application. The user might go to lunch with the row locked, and you cannot tell the difference between that and a crashed browser.",
  project: "The approval screens needed this most. Two approvers opening the same document was a real scenario, and before the rowversion check the second save just overwrote the first decision.",
  remember: "RowVersion in the WHERE clause. Zero rows means someone beat you. Tell the user, never silently overwrite."
},
{
  id: "net-idor", topic: "aspnet",
  q: "What is IDOR — insecure direct object reference?",
  tags: ["IDOR", "insecure direct object reference", "broken access control", "change the id in the url", "ownership check", "authorisation bug", "horizontal privilege", "what is idor", "how do you make sure a vendor cannot see another vendor data", "can i change the id in the url and see someone else record"],
  simple: "When the id in the URL is the only thing deciding what you get. Change invoice 1001 to 1002 in the address bar and you are looking at another company's invoice, because nobody checked it was yours.",
  answer: "It is the most common serious finding in a penetration test and it is almost never a clever attack — the tester just edits a number in the URL.\nThe cause is always the same shape. The endpoint takes an id, loads that record, and returns it. Authentication passed, so the user is logged in, and the developer assumed that was enough. But being logged in says who you are, not what you are allowed to see.\nThe fix is an ownership check on the server, using the identity from the token rather than anything in the request. In the Vendor Portal the vendor code is a claim on the user, so the query is written to filter by that claim — give me invoice 1002 where the vendor code equals the one in your token. If it is not theirs the query returns nothing.\nI return 404 rather than 403 in that case, deliberately, because 403 confirms the record exists and that is information the caller should not have.\nWhat does not work: hiding the link in the UI, or using a GUID instead of a sequential id. A GUID is harder to guess but it is still the only thing protecting the record, and ids leak through logs, emails and exports.\nThe real rule is that every query that returns user data is scoped by the identity, not filtered afterwards in C# — because filtering afterwards means you already fetched it.",
  project: "Four instances came out of the VAPT audit on Smart Documents. Every one was a screen where the document id was taken straight from the request. The fix was the same in all four: scope the query by the claim.",
  remember: "The id alone is never authorisation. Scope the query by the token, and return 404."
}

]);
