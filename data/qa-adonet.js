/* ADO.NET pack — covers the 14 questions in AdoNet_DotNet_QA_With_Project.html
   plus the follow-ups interviewers usually add.
   Project notes describe the real work without naming internal classes/files. */
window.QA = (window.QA || []).concat([

{
  id: "ado-what", topic: "adonet", star: true,
  q: "What is ADO.NET?",
  tags: ["ado.net", "what is ado.net", "data access", "system.data"],
  simple: "ADO.NET is the original .NET way of talking to a database. You write the SQL yourself, run it, and read the rows back. Nothing is generated for you, which is both the cost and the point.",
  answer: "ADO.NET is the data-access layer built into .NET — the `System.Data` and `Microsoft.Data.SqlClient` namespaces. It gives you a direct, low-level connection to the database: you open a connection, give it a command, and read the result.\nThere is no mapping, no change tracking and no query translation, so there is also no overhead and no surprises — the SQL that runs is exactly the SQL you wrote.\nEverything else sits on top of it. EF Core and Dapper both use ADO.NET underneath; they just add mapping and, in EF's case, LINQ translation and change tracking.",
  project: "Our platform uses both. EF Core handles the entity CRUD in the newer modules, and ADO.NET is still the data layer in Smart Documents and behind the heavy report queries, where I want to control the exact SQL and the execution plan.",
  remember: "ADO.NET = you write the SQL. EF and Dapper are built on top of it."
},

{
  id: "ado-objects", topic: "adonet", star: true,
  q: "What are the main ADO.NET objects?",
  tags: ["ado.net objects", "sqlconnection sqlcommand sqldatareader", "dataadapter", "dataset"],
  simple: "Five pieces: Connection opens the door, Command carries the SQL, DataReader streams rows back one at a time, DataAdapter fills a DataSet, and DataSet/DataTable hold rows in memory after the connection has closed.",
  answer: "- **SqlConnection** — the connection to SQL Server; built from the connection string, and it must be closed or disposed.\n- **SqlCommand** — the SQL text or stored procedure name, plus its parameters. Has `CommandType`, `CommandTimeout`, and the three Execute methods.\n- **SqlDataReader** — a forward-only, read-only stream of rows. Fastest option, but it holds the connection open while you read.\n- **SqlDataAdapter** — the bridge: it runs the command, fills a DataTable or DataSet, and closes the connection again.\n- **DataSet / DataTable** — in-memory rows you can work with after the connection is gone.\n- **SqlParameter** — the typed, safe way to pass user input.\n- **SqlTransaction** — groups commands so they commit or roll back together.",
  code: "using var conn = new SqlConnection(_cs);\nusing var cmd  = new SqlCommand(\"usp_GetVendor\", conn) { CommandType = CommandType.StoredProcedure };\ncmd.Parameters.Add(\"@VendorId\", SqlDbType.Int).Value = id;\nawait conn.OpenAsync();\nusing var rdr = await cmd.ExecuteReaderAsync();",
  project: "All five show up in the Smart Documents data layer — reader-based reads for the report screens, and a DataAdapter where an older module still binds a DataTable to the grid.",
  remember: "Connection, Command, DataReader, DataAdapter, DataSet — plus Parameter and Transaction."
},

{
  id: "ado-connected", topic: "adonet", star: true,
  q: "Connected vs disconnected architecture in ADO.NET",
  tags: ["connected vs disconnected", "datareader vs dataset", "disconnected architecture"],
  simple: "Connected means you read rows while the line to the database is still open — fast, but you are holding the line. Disconnected means you copy everything into memory first, hang up, and then work with the copy.",
  answer: "**Connected (SqlDataReader)** — forward-only, read-only, one row at a time, connection held open for the whole read. Lowest memory, fastest, and what I use for almost everything because the data goes straight into objects.\n**Disconnected (DataAdapter + DataSet/DataTable)** — the adapter pulls every row into memory and releases the connection. You can then sort, filter, relate tables and even post changes back with `Update`.\nThe trade-off is real: a DataReader keeps a connection busy, so you must read quickly and dispose; a DataSet frees the connection immediately but holds the entire result in memory, which hurts on large sets.\nMy rule: reader for anything I am mapping to objects or streaming; DataTable only when something genuinely needs the in-memory table — an older grid binding, or multiple passes over the same rows.",
  project: "The report screens in Smart Documents read with a DataReader and map straight into DTOs. The one place a DataTable earns its keep is an older screen that binds the table directly to the grid control, where converting it to objects would have gained nothing.",
  remember: "DataReader = connection open, stream rows. DataSet = copy into memory, connection closed."
},

{
  id: "ado-execute", topic: "adonet", star: true,
  q: "ExecuteReader vs ExecuteScalar vs ExecuteNonQuery",
  tags: ["executereader", "executescalar", "executenonquery", "command execute methods"],
  simple: "ExecuteReader when you want rows. ExecuteScalar when you want one single value. ExecuteNonQuery when you are changing data and only want to know how many rows were affected.",
  answer: "- **ExecuteReader()** — returns a `SqlDataReader` for one or more result sets. Use it for any SELECT that returns rows.\n- **ExecuteScalar()** — returns the first column of the first row as `object`. Ideal for `COUNT(*)`, `MAX(Id)`, or an EXISTS check. It returns `null` if there are no rows and `DBNull.Value` if the value itself is null, so cast carefully.\n- **ExecuteNonQuery()** — returns the number of rows affected. For INSERT, UPDATE, DELETE and DDL. A return of 0 is often the thing worth checking — it usually means the WHERE clause matched nothing.\nAll three have `...Async` versions, which is what I use in web code.",
  code: "// one value\nvar count = (int)(await cmd.ExecuteScalarAsync() ?? 0);\n\n// changed rows\nvar affected = await cmd.ExecuteNonQueryAsync();\nif (affected == 0) return NotFound();   // nothing matched the WHERE",
  project: "The document status updates in Smart Documents check the ExecuteNonQuery result rather than assuming success — if an update affects zero rows, the record was already moved or deleted by someone else, and silently treating that as success is how a user ends up staring at stale data.",
  remember: "Rows = Reader. One value = Scalar. Row count = NonQuery."
},

{
  id: "ado-sp", topic: "adonet", star: true,
  q: "How do you call a stored procedure in ADO.NET?",
  tags: ["call stored procedure ado.net", "commandtype storedprocedure", "sqlcommand procedure"],
  simple: "Put the procedure name in the command, set CommandType to StoredProcedure, add the parameters by name, open the connection, and execute.",
  answer: "Four steps:\n1. `new SqlCommand(procName, connection)` with `CommandType = CommandType.StoredProcedure`.\n2. Add each parameter with its SQL type — `cmd.Parameters.Add(\"@VendorId\", SqlDbType.Int).Value = id;`\n3. Open the connection (async in web code).\n4. Call the right Execute method, and dispose everything with `using`.\nTwo details that matter: if you forget `CommandType.StoredProcedure`, ADO.NET sends the name as raw SQL and you get a syntax error. And give `Add` the explicit SqlDbType and size rather than using `AddWithValue` — `AddWithValue` infers the type from the .NET value, and an inferred `nvarchar` against a `varchar` column causes an implicit conversion that stops the index being used.",
  code: "using var conn = new SqlConnection(_cs);\nusing var cmd  = new SqlCommand(\"usp_GetVendorStatement\", conn)\n{\n    CommandType = CommandType.StoredProcedure,\n    CommandTimeout = 60\n};\ncmd.Parameters.Add(\"@VendorId\", SqlDbType.Int).Value       = vendorId;\ncmd.Parameters.Add(\"@FromDate\", SqlDbType.Date).Value      = from;\nawait conn.OpenAsync();\nusing var rdr = await cmd.ExecuteReaderAsync();\nwhile (await rdr.ReadAsync()) { /* map */ }",
  project: "Every report query in our data layer is called this way — the statement, outstanding and payment report screens all run tuned stored procedures through ADO.NET rather than EF, so the SQL and its execution plan are exactly what I wrote.",
  remember: "CommandType.StoredProcedure, typed parameters, async execute, using everywhere."
},

{
  id: "ado-output-param", topic: "adonet",
  q: "How do you read an output parameter or return value from a stored procedure?",
  tags: ["output parameter", "parameterdirection", "return value", "sqlparameter direction"],
  simple: "Add the parameter with Direction set to Output, run the command, and read its Value afterwards — not before.",
  answer: "Set `Direction = ParameterDirection.Output` (or `InputOutput`), and for text types give it a size or you get truncation. For the procedure's RETURN value use `ParameterDirection.ReturnValue`.\nThe detail interviewers look for: output parameters are only populated **after** the command has finished. With a DataReader that means after you have read all the rows and closed the reader — read `.Value` too early and you get null. Also convert through `DBNull` safely rather than casting straight to a value type.",
  code: "var outId = cmd.Parameters.Add(\"@NewDocId\", SqlDbType.Int);\noutId.Direction = ParameterDirection.Output;\n\nvar msg = cmd.Parameters.Add(\"@Message\", SqlDbType.NVarChar, 200);\nmsg.Direction = ParameterDirection.Output;    // size is required\n\nawait cmd.ExecuteNonQueryAsync();\nint newId = outId.Value == DBNull.Value ? 0 : (int)outId.Value;",
  project: "The document-save procedures return the new document id this way, so the API can send back the created record without a second round trip to look it up.",
  remember: "Direction = Output, give text a size, and read Value only after the command finishes."
},

{
  id: "ado-injection", topic: "adonet", star: true,
  q: "How do you prevent SQL injection in ADO.NET?",
  tags: ["sql injection", "parameterized query", "sqlparameter", "addwithvalue", "injection prevention"],
  simple: "Never glue user input into the SQL string. Pass it as a parameter — then the database treats it as a value, never as code.",
  answer: "Use `SqlParameter` for every piece of user input. A parameterised command sends the SQL and the values separately, so `' OR 1=1--` arrives as a literal string to compare against, not as SQL to run.\nWhat I also check:\n- Dynamic SQL **inside** a stored procedure is still injectable — passing a parameter in does not help if the procedure concatenates it into an `EXEC`. Use `sp_executesql` with parameters there.\n- Things that cannot be parameterised — a table name, or a sort column from the UI — must be validated against a whitelist, never concatenated from the request.\n- Use a least-privilege database account, so even a successful injection has a small blast radius.\n- Do not return the raw `SqlException` message to the user; it leaks schema.\nPrefer `Parameters.Add` with an explicit type over `AddWithValue` — safe either way, but the explicit type avoids the implicit-conversion performance trap.",
  code: "// injectable\ncmd.CommandText = \"SELECT * FROM Vendor WHERE Code = '\" + code + \"'\";\n\n// safe\ncmd.CommandText = \"SELECT VendorId, Name FROM Vendor WHERE Code = @code\";\ncmd.Parameters.Add(\"@code\", SqlDbType.VarChar, 50).Value = code;\n\n// sort column cannot be a parameter - whitelist it\nvar sort = allowed.Contains(sortBy) ? sortBy : \"CreatedOn\";",
  project: "This was the single largest category in the 500+ security findings I cleared on the live platform. The work was mechanical but had to be exhaustive — every concatenated query replaced with parameters, every dynamic-SQL procedure reviewed, and the whole thing shipped in batches with regression testing so no screen broke for users.",
  remember: "Parameters always. Dynamic SQL inside a procedure is still injectable. Whitelist what cannot be a parameter."
},

{
  id: "ado-using", topic: "adonet", star: true,
  q: "Why do you wrap ADO.NET objects in a using block?",
  tags: ["using block", "dispose connection", "connection leak", "close connection"],
  simple: "A connection you forget to close stays out of the pool. Do that a few hundred times and the application stops being able to reach the database at all.",
  answer: "`SqlConnection`, `SqlCommand` and `SqlDataReader` all implement `IDisposable`. `using` guarantees Dispose runs even when an exception is thrown — which is exactly when you are most likely to skip a manual `Close()`.\nFor a connection, Dispose returns it to the connection pool rather than destroying it. Skip it and the pool drains; the symptom is the classic *Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool* — an error that appears under load, not in testing, which is what makes connection leaks so expensive to find.\nI open the connection as late as possible and let `using` close it as early as possible, so it is held for the shortest time.",
  code: "using (var conn = new SqlConnection(_cs))\nusing (var cmd  = new SqlCommand(sql, conn))\n{\n    await conn.OpenAsync();\n    using var rdr = await cmd.ExecuteReaderAsync();\n    while (await rdr.ReadAsync()) { /* map */ }\n}   // returned to the pool here, even if the mapping throws",
  project: "Every connection, command and reader in the Smart Documents data layer sits inside a using block. Tightening that — along with removing per-row queries — was part of cutting database round-trips by around 50% on that module.",
  remember: "using = Dispose on the way out. A leaked connection exhausts the pool and fails under load."
},

{
  id: "ado-pooling", topic: "adonet",
  q: "What is connection pooling?",
  tags: ["connection pooling", "pool size", "timeout expired pool", "max pool size"],
  simple: "Opening a real database connection is slow, so .NET keeps used ones in a pool and hands them back out. Closing a connection does not actually close it — it returns it to the pool.",
  answer: "ADO.NET pools connections automatically, keyed on the exact connection string — a different string, even by a space or a different user, creates a separate pool. Default max pool size is 100.\nSo `conn.Close()` or Dispose returns the connection to the pool for reuse; the expensive TCP and authentication handshake only happens when the pool has to create a new one.\nWhat this means in practice: open late, close early, and never hold a connection across a user interaction or a long calculation. The failure mode is pool exhaustion — all 100 in use, new requests queue and then time out. The usual causes are undisposed connections, a long-running query holding one, or a connection stored in a static field.\nYou can tune `Max Pool Size`, `Min Pool Size` and `Connection Timeout` in the connection string, but raising the max is almost always treating the symptom rather than the leak.",
  code: "// connection string controls the pool\n\"Server=...;Database=...;Max Pool Size=200;Connection Timeout=15;\"",
  remember: "Close returns it to the pool, it does not close it. Pool exhaustion = a leak, not a size problem."
},

{
  id: "ado-async", topic: "adonet",
  q: "Can ADO.NET be asynchronous?",
  tags: ["async ado.net", "executereaderasync", "openasync", "readasync"],
  simple: "Yes — every call that waits on the database has an async version. Use them in web code so the thread is not stuck waiting.",
  answer: "`OpenAsync`, `ExecuteReaderAsync`, `ExecuteNonQueryAsync`, `ExecuteScalarAsync` and `ReadAsync` all exist, and all take a `CancellationToken`.\nThe benefit is throughput, not speed — a single query is no faster, but the thread is released while the database works, so one server handles far more concurrent requests. That matters most on the slow report queries, which are exactly where a blocked thread is most costly.\nRules I follow: async all the way up to the controller, never `.Result` or `.Wait()` (that blocks a thread and can deadlock), and pass the request's cancellation token so an abandoned request stops doing work.",
  code: "await conn.OpenAsync(ct);\nusing var rdr = await cmd.ExecuteReaderAsync(ct);\nwhile (await rdr.ReadAsync(ct))\n{\n    rows.Add(Map(rdr));\n}",
  project: "The API endpoints that sit on top of the report procedures are async end to end, including the ADO.NET calls. Those queries are the slowest things in the system, so holding a thread for each one would have limited how many users the portal could serve at once.",
  remember: "Async frees the thread while SQL Server works. Never .Result."
},

{
  id: "ado-vs-ef", topic: "adonet", star: true,
  q: "You have EF Core — why still use ADO.NET?",
  tags: ["ado.net vs ef core", "why ado.net", "when to use raw sql", "orm vs raw sql"],
  simple: "Because on the heavy report queries you want to decide the exact SQL. EF is excellent at CRUD and weaker at a ten-join report with grouping — and there you need the execution plan to be yours.",
  answer: "EF Core wins for entity CRUD: less code, change tracking, migrations, LINQ. I use it for the great majority of the data access.\nI drop to ADO.NET when:\n- The query is a **tuned report** — many joins, grouping, window functions — where I want exactly the SQL I tested in SSMS and the plan I checked.\n- The operation is **set-based and bulk**, where loading entities to change them would be absurd.\n- EF generates something I cannot influence enough, or the mapping overhead is measurable on a large result set.\nThis is not either/or. The same application uses both, chosen per query. The deciding question is whether I need the ORM's conveniences or the database's exact behaviour.",
  project: "That is precisely how the Vendor Portal is built: EF Core everywhere, with ADO.NET confined to the account statement, outstanding and payment report repositories. Those three are the screens where the SQL was tuned against real data volumes, and handing them to the ORM would have given up the plan I had just spent time getting right.",
  remember: "EF for CRUD, ADO.NET for the tuned reports. Choose per query, not per project."
},

{
  id: "ado-connstring", topic: "adonet", star: true,
  q: "How do you protect the connection string?",
  tags: ["connection string security", "encrypted connection string", "config secrets", "integrated security"],
  simple: "It never sits in plain text in the deployed config. It is encrypted, and the application decrypts it at startup.",
  answer: "A connection string holds credentials, so a plain-text one in a deployed `web.config` or `appsettings.json` is a finding in its own right — anyone with file access, or any config leak, owns the database.\nWhat I do:\n- Keep it **encrypted in the deployed configuration** and decrypt at application startup, so the file on disk is not readable.\n- Keep production values **out of source control** entirely — different value per environment, set on the server.\n- Prefer **Integrated Security** where the hosting model allows it, so there is no password at all.\n- Use a **least-privilege** database account — the application login does not need `db_owner`.\n- Never log the connection string, and never return a raw connection error to the user.\nThe cloud equivalent is Key Vault plus a managed identity, which enforces the same discipline with less custom code.",
  project: "Our BI reporting application has a dedicated connection-string protector that handles exactly this — encrypted in config, decrypted at startup. Plain-text connection strings and config leaks were also part of the Smart Documents security fixes, which is where I learned to treat it as a finding rather than a convenience.",
  remember: "Encrypted in config, decrypted at startup, never in source control, least privilege."
},

{
  id: "ado-dataadapter", topic: "adonet",
  q: "What does DataAdapter.Fill actually do?",
  tags: ["dataadapter", "fill", "sqldataadapter", "dataset fill", "adapter update"],
  simple: "Fill opens the connection if it is closed, runs the command, copies every row into a DataTable, and closes the connection again if it was the one that opened it.",
  answer: "`Fill` is the whole disconnected round trip in one call. The subtlety worth knowing is the connection behaviour: if the connection was already open, the adapter leaves it open; if it was closed, the adapter opens it and closes it again afterwards.\nAfter Fill you are working on an in-memory copy — the database is no longer involved, so nothing you do to the DataTable affects it until you call `Update`.\n`Update` walks the changed rows and fires the adapter's Insert, Update and Delete commands. A `SqlCommandBuilder` can generate those for a simple single-table select, but it only works with a primary key and it produces generic SQL, so for anything real I supply the commands myself.\nThe cost to remember: Fill pulls **every** row into memory. On a large result set that is a memory spike where a DataReader would have streamed.",
  code: "using var adapter = new SqlDataAdapter(cmd);\nvar table = new DataTable();\nadapter.Fill(table);        // connection opened and closed inside this call\n// work with table offline",
  remember: "Fill = run it, copy every row to memory, close the connection. Update pushes changes back."
},

{
  id: "ado-transaction", topic: "adonet", star: true,
  q: "How do you handle transactions in ADO.NET?",
  tags: ["sqltransaction", "transaction ado.net", "rollback commit", "begintransaction"],
  simple: "Begin a transaction on the connection, attach it to every command, commit at the end — and roll back in the catch so a half-finished operation never survives.",
  answer: "`conn.BeginTransaction()` returns a `SqlTransaction`. Every command in that unit of work must be given both the connection **and** the transaction, or it runs outside it and will not roll back.\nStructure: try/commit, catch/rollback, and `using` on the transaction so it disposes. An uncommitted transaction that is disposed rolls back, which is the safe default.\nThings I watch for:\n- Keep the transaction **short** — open it late, commit early, and never hold it across a user interaction or a remote call.\n- A rollback can itself throw if the connection has already dropped, so guard it.\n- `TransactionScope` is the alternative when the unit of work spans more than one connection, but it can escalate to a distributed transaction, so I use an explicit SqlTransaction when one connection is enough.",
  code: "using var conn = new SqlConnection(_cs);\nawait conn.OpenAsync();\nusing var tran = conn.BeginTransaction();\ntry\n{\n    using (var cmd = new SqlCommand(sqlHeader, conn, tran)) await cmd.ExecuteNonQueryAsync();\n    using (var cmd = new SqlCommand(sqlLines,  conn, tran)) await cmd.ExecuteNonQueryAsync();\n    tran.Commit();\n}\ncatch\n{\n    try { tran.Rollback(); } catch { /* connection already gone */ }\n    throw;\n}",
  project: "Document posting works this way — header, line items and the audit row are one transaction, so a failure halfway cannot leave a document with lines but no header. The EF Core equivalent on the newer modules is a single SaveChangesAsync, which wraps all tracked changes in one transaction for the same reason.",
  remember: "Pass the transaction to every command. Commit in try, rollback in catch."
},

{
  id: "ado-helper", topic: "adonet", star: true,
  q: "Have you written a reusable data-access helper?",
  tags: ["data access helper", "dal", "reusable dal", "data access layer", "helper class"],
  simple: "Yes. Instead of every screen repeating open-connection, add-parameters, execute, dispose, that plumbing lives in one helper and the calling code just says which procedure and which parameters.",
  answer: "The repeated part of ADO.NET is always the same: build the connection, build the command, set the type and timeout, add parameters, open, execute, dispose. Written out at every call site it is both noisy and the place connection leaks hide.\nSo the helper owns that: methods like `ExecuteReaderAsync(proc, parameters)`, `ExecuteNonQueryAsync`, `ExecuteScalarAsync` and `FillAsync`, each one wrapping everything in `using` so disposal cannot be forgotten. The callers pass a procedure name and parameters and map the rows.\nWhat that buys: `using` is guaranteed in one place, parameters go through one typed path so nobody hand-concatenates, timeouts and retry behaviour are set once, and logging the failing procedure and parameters is one change instead of fifty.\nIt is the same reasoning as a repository — it just sits a layer lower, over the raw commands rather than over entities.",
  code: "public async Task<List<T>> QueryAsync<T>(string proc, Action<SqlParameterCollection> addParams, Func<SqlDataReader, T> map)\n{\n    using var conn = new SqlConnection(_cs);\n    using var cmd  = new SqlCommand(proc, conn) { CommandType = CommandType.StoredProcedure };\n    addParams(cmd.Parameters);\n    await conn.OpenAsync();\n    using var rdr = await cmd.ExecuteReaderAsync();\n    var list = new List<T>();\n    while (await rdr.ReadAsync()) list.Add(map(rdr));\n    return list;\n}",
  project: "Our BI reporting application has exactly this — a shared data-access utility used by the UI, the data API and the mail scheduler. Three very different callers, one place where connections are opened and disposed, which is why none of them leaks.",
  remember: "One helper owns connection, parameters and disposal. Callers only supply the procedure and the mapping."
},

{
  id: "ado-dataset", topic: "adonet",
  q: "DataSet vs DataTable vs DataReader",
  tags: ["dataset vs datatable", "datareader vs dataset", "dataview", "in memory data"],
  simple: "DataReader streams rows and holds the connection. DataTable is one table in memory. DataSet is several DataTables with relationships between them.",
  answer: "- **SqlDataReader** — forward-only stream, lowest memory, fastest, connection held open.\n- **DataTable** — one table of rows in memory; sortable, filterable, bindable, usable after the connection closes.\n- **DataSet** — a collection of DataTables plus `DataRelation` objects between them, so you can navigate parent to child in memory. Heavier again.\n- **DataView** — a filtered, sorted view over a DataTable without copying it.\nIn modern code I reach for a DataReader mapped into typed objects almost every time: strongly typed, less memory, and far easier to test than untyped `row[\"ColumnName\"]` access, which fails at runtime rather than at compile time.\nDataSets still make sense for multiple related result sets handled offline, or for legacy screens already built around them.",
  project: "The newer data access maps readers into DTOs. DataTables survive in a couple of older grid-bound screens, and I leave those alone — converting a working screen to gain type safety it does not need is not a good trade.",
  remember: "Reader streams, DataTable is one table in memory, DataSet is many plus relations."
},

{
  id: "ado-bulk", topic: "adonet", star: true,
  q: "How do you insert thousands of rows efficiently? (SqlBulkCopy)",
  tags: ["sqlbulkcopy", "bulk insert", "excel upload performance", "batch insert"],
  simple: "Not with a loop of INSERTs. SqlBulkCopy streams the whole set to SQL Server in one operation — the difference on a few thousand rows is seconds instead of minutes.",
  answer: "A loop calling ExecuteNonQuery per row means one network round trip and one transaction per row. `SqlBulkCopy` uses the same bulk mechanism as BCP and sends them as a stream.\nHow I use it: load the rows into a DataTable or an `IDataReader`, map the columns explicitly with `ColumnMappings` (do not rely on ordinal order), set a sensible `BatchSize`, and write into a **staging table** rather than straight into the live one. Then one set-based MERGE or UPDATE/INSERT moves validated rows from staging into the master.\nStaging first matters for more than speed: a bad file can be inspected and discarded without ever touching master data, and the validation becomes one set-based query instead of per-row logic.",
  code: "using var bulk = new SqlBulkCopy(conn, SqlBulkCopyOptions.Default, tran)\n{\n    DestinationTableName = \"StagingVendorUpload\",\n    BatchSize = 2000,\n    BulkCopyTimeout = 120\n};\nbulk.ColumnMappings.Add(\"Code\", \"VendorCode\");\nbulk.ColumnMappings.Add(\"Name\", \"VendorName\");\nawait bulk.WriteToServerAsync(table);",
  project: "The Excel bulk upload modules work on this shape — the file is parsed, rows land in a staging table, validation runs as a set-based query against the masters, and the user gets back a report of which rows failed and why. Row-by-row inserts were the original bottleneck on large files.",
  remember: "SqlBulkCopy into a staging table, then one set-based statement into the master."
},

{
  id: "ado-tvp", topic: "adonet",
  q: "How do you pass a list of values to a stored procedure?",
  tags: ["table valued parameter", "tvp", "pass list to sql", "comma separated ids", "in clause"],
  simple: "Send it as a table-valued parameter. The old trick of passing a comma-separated string and splitting it inside the procedure works, but it is slower and easier to get wrong.",
  answer: "Create a user-defined table type in SQL Server, then pass a `DataTable` as a parameter with `SqlDbType.Structured` and the type name. The procedure receives it as a real table you can join against, which the optimiser handles far better than a split string.\nThe alternatives and why I avoid them: a comma-separated list needs splitting and gives the optimiser no useful statistics; building `IN (1,2,3...)` dynamically risks injection and blows up the plan cache with a different query text for every list length.\nFor very large lists, bulk copy into a staging table and join to that instead.",
  code: "var ids = new DataTable();\nids.Columns.Add(\"Id\", typeof(int));\nforeach (var id in docIds) ids.Rows.Add(id);\n\nvar p = cmd.Parameters.AddWithValue(\"@DocIds\", ids);\np.SqlDbType = SqlDbType.Structured;\np.TypeName  = \"dbo.IntList\";",
  project: "Bulk approval screens need this — the user ticks a set of documents and the whole set goes to one procedure, instead of the UI firing one call per row and holding a transaction open across all of them.",
  remember: "Table-valued parameter, not a comma-separated string, and never a dynamically built IN list."
},

{
  id: "ado-nextresult", topic: "adonet",
  q: "How do you read multiple result sets from one command?",
  tags: ["nextresult", "multiple result sets", "one round trip", "multiple selects"],
  simple: "If a procedure runs two SELECTs, read the first set to the end, call NextResult, then read the second. One round trip instead of two calls.",
  answer: "`SqlDataReader.NextResult()` moves to the next result set. It is the cheap way to cut round trips — a screen that needs a header record plus its line items, or a page of rows plus the total count, can get both from one procedure and one call.\nThe order is fixed: finish reading set one before calling NextResult, because the reader is forward-only. And remember output parameters are only populated after the reader is closed.\nThis is one of the simplest performance wins available in ADO.NET, and it is invisible to anyone looking only at the C#.",
  code: "using var rdr = await cmd.ExecuteReaderAsync();\nwhile (await rdr.ReadAsync()) header = MapHeader(rdr);\n\nawait rdr.NextResultAsync();\nwhile (await rdr.ReadAsync()) lines.Add(MapLine(rdr));",
  project: "This is a large part of how database round-trips came down by around 50% on Smart Documents — screens that were making three or four separate calls for header, lines and lookup data now get them from one procedure returning several result sets.",
  remember: "NextResult = several result sets, one round trip."
},

{
  id: "ado-dbnull", topic: "adonet", star: true,
  q: "How do you handle NULL values coming back from the database?",
  tags: ["dbnull", "null handling ado.net", "isdbnull", "getvalue null"],
  simple: "A database NULL arrives as DBNull.Value, not as C# null. Cast it straight to int or DateTime and it throws — you have to check first.",
  answer: "`DBNull.Value` is a singleton that means no value; it is not `null` and it is not the default. `(int)rdr[\"Qty\"]` on a NULL column throws `InvalidCastException`.\nSafe approaches:\n- `rdr.IsDBNull(ordinal)` before reading, which is the clearest.\n- `rdr[\"Col\"] as int?` for reference-style handling, or a small extension method.\n- `Convert.ToInt32` treats DBNull as 0 — convenient, and dangerous when 0 is a meaningful value.\nI also prefer reading by **ordinal** rather than by column name in hot loops: look the ordinals up once before the loop with `GetOrdinal`, then index by number. Name lookups per row per column add up on a large result set.",
  code: "int qtyOrd = rdr.GetOrdinal(\"Qty\");\nint remOrd = rdr.GetOrdinal(\"Remarks\");\n\nwhile (await rdr.ReadAsync())\n{\n    var qty     = rdr.IsDBNull(qtyOrd) ? 0    : rdr.GetInt32(qtyOrd);\n    var remarks = rdr.IsDBNull(remOrd) ? null : rdr.GetString(remOrd);\n}",
  project: "Optional fields on the vendor and document masters are full of legitimate NULLs — alternate contacts, tax details, remarks. Handling them explicitly is what keeps a half-filled record rendering as a dash on screen instead of throwing a cast exception on the API.",
  remember: "DBNull.Value is not null. Check IsDBNull, and cache ordinals outside the loop."
},

{
  id: "ado-exception", topic: "adonet",
  q: "How do you handle SqlException and transient failures?",
  tags: ["sqlexception", "error number", "transient fault", "retry sql", "deadlock victim retry"],
  simple: "Catch SqlException specifically, look at the error number to decide whether retrying is sensible, and never show the raw message to the user.",
  answer: "`SqlException` carries a `Number` that tells you what actually happened, and the right response differs:\n- **1205** deadlock victim — retry; the transaction was rolled back and running again usually succeeds.\n- **-2** timeout — sometimes retry, but first ask whether the query needs tuning.\n- **2627 / 2601** unique constraint violation — a business error, not a technical one; translate it into a clear message.\n- **547** foreign key violation — the same.\nTransient faults get a short retry with backoff and a cap, and only for operations that are safe to repeat. Everything else is logged with the procedure name and the record id, and the user gets a readable message — never the SQL error text, which leaks table and column names.",
  code: "catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)\n{\n    return Conflict(\"A vendor with this code already exists.\");\n}\ncatch (SqlException ex) when (ex.Number == 1205)\n{\n    _log.LogWarning(ex, \"Deadlock on {Proc}, retrying\", proc);\n    return await RetryAsync();\n}",
  project: "Deadlock retries matter where the UI and the SAP sync jobs touch the same document and stock tables concurrently — the victim transaction simply runs again rather than failing the user's save or the whole sync batch.",
  remember: "Check ex.Number. 1205 retry, 2627 is a business message, never show the raw SQL error."
},

{
  id: "ado-timeout", topic: "adonet",
  q: "Connection Timeout vs CommandTimeout",
  tags: ["commandtimeout", "connection timeout", "timeout expired", "query timeout"],
  simple: "Connection Timeout is how long to wait to get a connection. CommandTimeout is how long to wait for the query to finish. They are different settings and people mix them up constantly.",
  answer: "**Connection Timeout** is set in the connection string and defaults to 15 seconds — it covers establishing the connection or getting one from the pool. If this is what expires, the problem is the network, the server, or an exhausted pool, and the message says so.\n**CommandTimeout** is set on the `SqlCommand` and defaults to 30 seconds — it covers executing that statement. A heavy report may legitimately need more.\nRaising CommandTimeout is fine for a genuinely long report, but it is a workaround if the real cause is a missing index — the honest answer in an interview is that I raise it for the reports that are long by nature and tune the ones that are long by accident. `CommandTimeout = 0` means wait forever, which I avoid in a web application because the user has long since given up.",
  code: "using var cmd = new SqlCommand(proc, conn) { CommandTimeout = 120 };   // a real, long report",
  remember: "Connection Timeout = getting the line. CommandTimeout = waiting for the query."
},

{
  id: "ado-mapping", topic: "adonet",
  q: "How do you map a DataReader to your objects?",
  tags: ["map datareader to object", "dto mapping", "getordinal", "reader mapping performance"],
  simple: "Read each column into a typed property with a small mapping function. Look the column positions up once before the loop, not on every row.",
  answer: "I keep a `Map(SqlDataReader)` function per DTO so the mapping lives in one place and the rest of the code works with typed objects instead of `row[\"ColumnName\"]`.\nFor performance, call `GetOrdinal` once per column before the loop and then use the typed getters — `GetInt32`, `GetDecimal`, `GetDateTime` — by position. Indexing by name resolves the ordinal on every access, which is measurable across thousands of rows and dozens of columns.\nThe wider point for an interview: typed mapping fails at compile time when a property is wrong, while untyped dictionary access fails at runtime in front of a user. Dapper exists precisely to generate this mapping for you, and if the project allows it I would rather use Dapper than hand-write mappers — but knowing what it is doing underneath is what the question is really testing.",
  code: "static VendorStatementDto Map(SqlDataReader r, int[] o) => new()\n{\n    DocNo   = r.GetString(o[0]),\n    DocDate = r.GetDateTime(o[1]),\n    Amount  = r.GetDecimal(o[2]),\n    Balance = r.IsDBNull(o[3]) ? 0m : r.GetDecimal(o[3])\n};",
  remember: "Cache ordinals before the loop, use typed getters, keep mapping in one function."
}

]);
