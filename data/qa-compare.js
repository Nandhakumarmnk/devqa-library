/* ============================================================
   Side-by-side tables for the classic "X vs Y" questions.

   Attached to existing answers by id, so the answer text stays as
   it is and gains a table. This is the shape you would draw on a
   whiteboard, and it is what an interviewer is listening for.
   ============================================================ */
window.QA_COMPARE = {

  "sql-cte-temp": {
    a: "CTE  (WITH)", b: "#Temp table",
    rows: [
      ["What it is",      "A name for a query, expanded inline",   "A real table in tempdb"],
      ["Stored?",         "Not materialised",                      "Physically written to tempdb"],
      ["Statistics",      "None — estimates come from the source",  "Yes, so the optimiser estimates well"],
      ["Indexes",         "Cannot be indexed",                      "Can be indexed, including a PK"],
      ["Scope",           "The next statement only",                "The whole batch / procedure"],
      ["Reuse",           "Referencing it twice may run it twice",  "Built once, read many times"],
      ["Recursion",       "Yes — recursive CTEs",                   "No"],
      ["Use it for",      "Readability, ranking, hierarchy walks",  "Large intermediate sets reused in the proc"]
    ]
  },

  "cs-ienumerable-iqueryable": {
    a: "IEnumerable<T>", b: "IQueryable<T>",
    rows: [
      ["Lives in",      "`System.Collections.Generic`",         "`System.Linq`"],
      ["Works on",      "Objects already in memory",            "An expression tree, translated to SQL"],
      ["Filtering",     "In C#, after the rows are fetched",    "In the database, before they are sent"],
      ["Extra work",    "Pulls every row across the wire",      "Sends only what the query asked for"],
      ["Paging",        "Skip/Take happens in memory",          "Becomes OFFSET/FETCH in SQL"],
      ["Use it for",    "Final, materialised results",          "Composable repository queries"],
      ["The mistake",   "`.ToList()` too early, then filtering", "Keeping it IQueryable after the DbContext is gone"]
    ]
  },

  "cs-abstract-interface": {
    a: "Interface", b: "Abstract class",
    rows: [
      ["Says",            "What a type must do",                 "What it must do plus what it already knows"],
      ["Implementation",  "None (default members aside)",        "Can hold concrete methods"],
      ["State / fields",  "No fields",                           "Fields and constructors allowed"],
      ["How many",        "A class can implement many",          "A class inherits only one"],
      ["Access modifiers","Members are public by contract",      "Can be protected, internal, private"],
      ["Use it for",      "Contracts, DI, mocking in tests",     "A real is-a family sharing logic"]
    ]
  },

  "cs-value-ref": {
    a: "Value type", b: "Reference type",
    rows: [
      ["Holds",        "The data itself",                        "The address of the data"],
      ["Lives",        "Stack, or inline in its owner",          "Managed heap"],
      ["Assignment",   "Copies the value — independent",         "Copies the reference — both point at one object"],
      ["Null",         "Never, unless `int?`",                   "Yes"],
      ["Equality",     "Compares content by default",            "Compares identity unless Equals is overridden"],
      ["Examples",     "`int`, `decimal`, `bool`, `struct`, `enum`", "`class`, `string`, arrays, collections"]
    ]
  },

  "net-ef-vs-ado": {
    a: "EF Core", b: "ADO.NET",
    rows: [
      ["You write",     "LINQ; EF writes the SQL",              "The SQL, exactly as it runs"],
      ["Mapping",       "Automatic, into entities",             "By hand, or with Dapper"],
      ["Change tracking","Yes — SaveChanges knows what changed", "None"],
      ["Migrations",    "Built in",                             "Separate scripts"],
      ["Plan control",  "Whatever EF generates",                "Exactly the plan you tested"],
      ["Best at",       "CRUD and most business screens",       "Tuned reports, bulk, multi-result-set procs"],
      ["In my work",    "Vendor Portal entity work",            "Statement, outstanding and payment reports"]
    ]
  },

  "sql-delete-truncate": {
    a: "DELETE", b: "TRUNCATE",
    rows: [
      ["Type",          "DML",                                   "DDL"],
      ["WHERE clause",  "Yes — remove selected rows",            "No — removes every row"],
      ["Logging",       "Fully logged, row by row",              "Minimal — deallocates pages"],
      ["Speed",         "Slower on a whole table",               "Much faster for clearing everything"],
      ["Triggers",      "Fires row triggers",                    "Does not fire them"],
      ["IDENTITY",      "Keeps counting from where it was",      "Resets the seed"],
      ["Foreign keys",  "Allowed",                               "Blocked if a FK references the table"],
      ["Rollback",      "Yes",                                   "Yes, inside an explicit transaction"]
    ]
  },

  "sql-index": {
    a: "Clustered index", b: "Non-clustered index",
    rows: [
      ["Leaf level holds", "The table data itself",              "Key columns + a row locator"],
      ["How many",         "One per table",                      "Many"],
      ["Row order",        "Defines the physical order",         "Separate structure, own order"],
      ["Extra storage",    "None — it is the table",             "Yes, a copy of the key columns"],
      ["Key lookup",       "Never needed",                       "Needed unless INCLUDE covers the query"],
      ["Usually",          "The primary key",                    "The WHERE / JOIN / ORDER BY columns"]
    ]
  },

  "cs-string-sb": {
    a: "string", b: "StringBuilder",
    rows: [
      ["Mutable",      "No — every change makes a new string",   "Yes — one internal buffer"],
      ["Allocations",  "One per concatenation",                  "Grows the buffer occasionally"],
      ["Cost in a loop","Quadratic; heavy GC pressure",          "Close to linear"],
      ["Thread safe",  "Immutable, so inherently safe",          "No"],
      ["Use it for",   "A few joins, interpolation",             "Loops, report and HTML building"]
    ]
  },

  "net-di-lifetime": {
    a: "Scoped", b: "Singleton",
    rows: [
      ["Instances",    "One per HTTP request",                   "One for the whole process"],
      ["Shared by",    "Everything inside that request",         "Every request and every thread"],
      ["State",        "Request state is safe",                  "Must be stateless and thread safe"],
      ["Typical",      "DbContext, repositories, services",      "Configuration, caches, HttpClient setup"],
      ["The trap",     "—",                                      "Capturing a Scoped service inside it"]
    ]
  },

  "cs-task-thread": {
    a: "Task", b: "Thread",
    rows: [
      ["What it is",   "A unit of work handed to the pool",      "A real OS thread you own"],
      ["Cost",         "Cheap; reuses pool threads",             "~1 MB stack, expensive to create"],
      ["I/O work",     "May use no thread at all while waiting", "Blocks the thread"],
      ["Gives you",    "Continuations, cancellation, exceptions", "Raw control, manual everything"],
      ["Use it for",   "Almost everything",                      "A long-running dedicated loop"]
    ]
  },

  "re-forms": {
    a: "Controlled", b: "Uncontrolled",
    rows: [
      ["Value lives in", "React state",                          "The DOM node"],
      ["Read it",        "From state, any time",                 "Through a `ref`, when you need it"],
      ["Re-renders",     "On every keystroke",                   "None"],
      ["Validation",     "Easy, live",                           "Manual, usually on submit"],
      ["Use it for",     "Nearly every form",                    "File inputs, very large forms"]
    ]
  },

  "cs-dotnet-core-framework": {
    a: ".NET 8 / Core", b: ".NET Framework 4.8",
    rows: [
      ["Platform",     "Windows, Linux, macOS",                  "Windows only"],
      ["Status",       "Actively developed, LTS releases",       "Maintenance — security fixes only"],
      ["Hosting",      "Kestrel, IIS, containers, cloud",        "IIS"],
      ["DI, config, logging", "Built in",                        "Third party (Unity, Ninject…)"],
      ["Startup",      "`Program.cs` + middleware pipeline",     "`Global.asax` + modules/handlers"],
      ["Config",       "appsettings.json + environment",         "web.config"],
      ["Versioning",   "Side by side per app",                   "Machine-wide"]
    ]
  },

  "ado-connected": {
    a: "DataReader (connected)", b: "DataSet (disconnected)",
    rows: [
      ["Connection",   "Held open while you read",               "Released once filled"],
      ["Direction",    "Forward only, read only",                "Random access, editable"],
      ["Memory",       "One row at a time",                      "The whole result set"],
      ["Speed",        "Fastest",                                "Slower, more overhead"],
      ["Relations",    "None",                                   "DataRelation between tables"],
      ["Use it for",   "Mapping rows into objects",              "Offline edits, legacy grid binding"]
    ]
  },

  "ms-communication": {
    a: "Synchronous (REST / gRPC)", b: "Asynchronous (queue / events)",
    rows: [
      ["Caller",       "Waits for the answer",                   "Carries on immediately"],
      ["Coupling",     "Availability is coupled",                "Consumer can be down and catch up"],
      ["Failure",      "Their outage is your outage",            "Their outage is your delay"],
      ["Consistency",  "Immediate",                              "Eventual"],
      ["Needs",        "Timeouts, retries, circuit breaker",     "Idempotent consumers, dead letter"],
      ["Use it for",   "The caller genuinely needs the result",  "Notifications and downstream effects"]
    ]
  },

  "js-equality": {
    a: "==", b: "===",
    rows: [
      ["Compares",     "Value, after type coercion",             "Value and type, no coercion"],
      ["`'5' == 5`",   "true",                                   "false"],
      ["`0 == false`", "true",                                   "false"],
      ["`null == undefined`", "true",                            "false"],
      ["Use it for",   "Only `x == null` (null or undefined)",   "Everything else"]
    ]
  },

  "cs-record-class-struct": {
    a: "record", b: "class",
    rows: [
      ["Equality",     "By value, generated for you",            "By reference, unless you override"],
      ["Mutability",   "`init` only by convention",              "Mutable by default"],
      ["Copying",      "`with` expression",                      "Manual, or a copy constructor"],
      ["ToString",     "Generated, prints the values",           "Type name only"],
      ["Use it for",   "DTOs, API models, immutable data",       "Entities with identity and behaviour"]
    ]
  }
};
