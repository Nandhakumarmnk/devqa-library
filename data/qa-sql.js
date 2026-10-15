/* SQL Server / T-SQL pack */
window.QA = (window.QA || []).concat([

{
  id: "sql-index", topic: "sql", star: true,
  q: "What is an index? Clustered vs non-clustered",
  tags: ["index", "clustered vs non clustered index", "indexing", "covering index"],
  simple: "An index is the book's index page. Without it SQL Server reads every row to find yours. A clustered index is the actual order of the pages in the table; a non-clustered index is a separate sorted copy of a few columns with a pointer back.",
  answer: "**Clustered** — defines the physical order of the rows; one per table, usually the primary key. The leaf level *is* the data.\n**Non-clustered** — a separate structure holding the key columns plus a pointer (the clustered key) back to the row. Many allowed.\n**Key lookup** happens when the non-clustered index finds the row but the query needs extra columns, so it jumps back to the table. Adding those columns with `INCLUDE` makes it a **covering index** and removes the lookup.\nCost: every index speeds reads but slows INSERT/UPDATE/DELETE and takes storage, so I index what the WHERE, JOIN and ORDER BY clauses actually use — not every column. Column order in a composite index matters: the leading column must be the one filtered on.",
  code: "CREATE NONCLUSTERED INDEX IX_PO_Vendor_Status\n    ON PurchaseOrder (VendorId, Status)\n    INCLUDE (PoNumber, TotalAmount, CreatedOn);",
  project: "Index tuning on high-volume procurement screens is a real part of my work — the PO and invoice listing screens filter by vendor, status and date range, and covering indexes on exactly those columns are a large part of how those modules reach sub-second response. I check the execution plan before and after rather than adding indexes on guesswork.",
  remember: "Clustered = the table's order. Non-clustered = a sorted lookup copy. INCLUDE kills key lookups."
},

{
  id: "sql-slow-query", topic: "sql", star: true,
  q: "A query is slow in production — how do you fix it?",
  tags: ["query optimization", "slow query", "performance tuning", "execution plan", "tuning", "sargable", "filter by date on indexed column", "today records", "cast on indexed column"],
  simple: "Look at the execution plan first. Usually it is a missing index, a function wrapped around a filtered column, SELECT *, or a query returning far more rows than the screen needs.",
  answer: "My order of attack:\n1. **Get the actual execution plan** and look for table/index scans where a seek is expected, key lookups, and the fat arrows showing huge row counts.\n2. **Check the WHERE clause is SARGable** — `WHERE YEAR(CreatedOn) = 2026` cannot use an index; `WHERE CreatedOn >= '2026-01-01' AND CreatedOn < '2027-01-01'` can. Same for leading wildcards and implicit type conversion (nvarchar vs varchar).\n3. **Return less** — name the columns instead of SELECT *, page with OFFSET/FETCH, filter before joining.\n4. **Indexes** — add or fix the covering index; check that statistics are current.\n5. **Rewrite** — replace a correlated subquery or cursor with a set-based join or window function.\n6. Check for **blocking** and parameter sniffing if it is only slow sometimes.\nThen measure again with real production-like data volume.",
  code: "SET STATISTICS IO, TIME ON;\n-- not SARGable\nWHERE CONVERT(date, CreatedOn) = '2026-10-14'\n-- SARGable\nWHERE CreatedOn >= '2026-10-14' AND CreatedOn < '2026-10-15'",
  project: "Tuning T-SQL stored procedures and indexes to bring high-traffic screens to sub-second response is something I did repeatedly on the procurement modules. The recurring causes were the same three: a date function applied to an indexed column, SELECT * feeding a grid that showed eight columns, and missing covering indexes on the filter columns.",
  remember: "Plan first. Then SARGable WHERE, fewer columns, right index."
},

{
  id: "sql-joins", topic: "sql", star: true,
  q: "Explain SQL joins — inner, left, right, full, cross and self",
  tags: ["joins", "inner join vs left join", "left outer join", "cross join", "self join"],
  simple: "INNER keeps only matching rows. LEFT keeps everything from the left table and fills blanks with NULL. RIGHT is the mirror. FULL keeps both sides. CROSS pairs every row with every row.",
  answer: "- **INNER JOIN** — rows present in both.\n- **LEFT (OUTER) JOIN** — all left rows; unmatched right columns are NULL. Use it to find missing data: `LEFT JOIN ... WHERE b.Id IS NULL`.\n- **RIGHT JOIN** — the mirror; rare, because people rewrite it as a LEFT.\n- **FULL OUTER JOIN** — everything from both sides, NULL where there is no match. Useful for reconciliation.\n- **CROSS JOIN** — Cartesian product; deliberate for a calendar or matrix, accidental when a join condition is missing.\n- **Self join** — a table joined to itself, for hierarchies like employee → manager.\nThe classic trap: putting a condition on the right table in the WHERE clause of a LEFT JOIN turns it back into an INNER JOIN. That condition belongs in the ON clause.",
  code: "-- vendors with no purchase order yet\nSELECT v.VendorId, v.Name\nFROM   Vendor v\nLEFT JOIN PurchaseOrder p ON p.VendorId = v.VendorId\nWHERE  p.VendorId IS NULL;",
  project: "Reconciliation between our platform and SAP leans on this — a FULL or LEFT join between our document table and the SAP-synced table shows exactly which documents never made it across, which is how the sync service reports mismatches instead of someone comparing spreadsheets.",
  remember: "LEFT JOIN filter in WHERE = accidental INNER JOIN. Put it in ON."
},

{
  id: "sql-sp-function", topic: "sql", star: true,
  q: "Stored procedure vs function in SQL Server",
  tags: ["stored procedure vs function", "udf", "scalar function", "table valued function"],
  simple: "A procedure does work — it can insert, update, run transactions, return many result sets. A function calculates and gives back a value, and you can use it inside a SELECT.",
  answer: "**Stored procedure** — can perform DML and DDL, use transactions, try/catch, output parameters, and return zero or many result sets. Called with EXEC. Cannot be used inside a SELECT.\n**Function** — must return a value (scalar or table), cannot modify data, cannot use try/catch, and can be used inside SELECT/WHERE/JOIN.\nPerformance warning: a scalar UDF in a WHERE clause or SELECT list executes per row and historically blocked parallelism — it is one of the quiet causes of a slow report. An inline table-valued function is far better because the optimiser can expand it into the main plan.\nSo: logic that changes data or runs a workflow → procedure. Reusable calculation inside a query → inline TVF, not a scalar UDF.",
  code: "CREATE PROCEDURE usp_ApprovePo @PoId INT, @By INT AS\nBEGIN\n    SET NOCOUNT ON;\n    BEGIN TRY\n        BEGIN TRAN;\n        UPDATE PurchaseOrder SET Status='APPROVED', ApprovedBy=@By WHERE PoId=@PoId;\n        INSERT INTO PoAudit(PoId, Action, ByUser) VALUES(@PoId,'APPROVE',@By);\n        COMMIT;\n    END TRY\n    BEGIN CATCH\n        IF @@TRANCOUNT > 0 ROLLBACK;\n        THROW;\n    END CATCH\nEND",
  project: "The transactional operations in the procurement modules — approvals, GRN posting, stock movement — are stored procedures with explicit transactions and try/catch, so the header, lines and audit rows commit together or not at all. Scalar UDFs were something I removed from a couple of report queries during tuning, because they were running per row.",
  remember: "Procedure = action. Function = value. Avoid scalar UDFs in big queries."
},

{
  id: "sql-sp-why", topic: "sql",
  q: "Why use stored procedures instead of inline SQL?",
  tags: ["stored procedure benefits", "inline query vs sp", "sql injection protection"],
  simple: "Procedures keep the SQL in the database where it can be tuned and permissioned, reuse the execution plan, and keep user input as parameters instead of glued-together text.",
  answer: "Advantages: logic lives in one place and can be changed without redeploying the app, execution plans are cached and reused, network traffic is one call instead of a long statement, permissions can be granted on the procedure instead of the underlying tables, and parameters make injection far less likely.\nThe counter-argument is fair: procedures are harder to version alongside application code and scatter business logic between layers. My practical split is EF Core/LINQ for CRUD and straightforward reads, stored procedures for heavy reporting, bulk operations and multi-table transactions where I want to control the plan.",
  project: "That is exactly how our modules are built — EF Core for entity CRUD, and tuned stored procedures behind the reporting and high-volume screens. The procedures also sit under source control and ship through the same release process as the application, with rollback scripts, so they are not drifting out of band.",
  remember: "SPs for heavy, transactional and reporting work; ORM for everyday CRUD."
},

{
  id: "sql-cte-temp", topic: "sql",
  q: "CTE vs temp table vs table variable",
  tags: ["cte", "temp table vs table variable", "with clause", "recursive cte", "#temp"],
  simple: "A CTE is a named sub-query that lives only for the next statement. A temp table is a real table in tempdb with statistics. A table variable is a small in-memory-ish variable with no statistics.",
  answer: "- **CTE (`WITH`)** — readability and recursion. It is not materialised; referencing it twice can run it twice.\n- **#temp table** — stored in tempdb, supports indexes and statistics, so the optimiser estimates well. Best for large intermediate result sets reused several times.\n- **@table variable** — scoped to the batch, no statistics (estimated as 1 row historically), minimal logging, fine for small sets and usable inside functions.\nRule: small set, pass to a function or one-time use → table variable or CTE. Big intermediate set used more than once → #temp table with an index.\nRecursive CTEs are the clean way to walk a hierarchy like approval chains or a category tree.",
  code: "WITH Ranked AS (\n    SELECT PoId, VendorId, TotalAmount,\n           ROW_NUMBER() OVER (PARTITION BY VendorId ORDER BY TotalAmount DESC) AS rn\n    FROM   PurchaseOrder\n)\nSELECT * FROM Ranked WHERE rn <= 3;      -- top 3 POs per vendor",
  project: "Reporting procedures in the procurement platform use CTEs for readability and ranking, and switch to #temp tables when an intermediate set is large and reused — the statistics on a temp table give a much better plan than a table variable once the row count grows.",
  remember: "CTE = readable. #temp = big and reused. @table = small and local."
},

{
  id: "sql-window", topic: "sql", star: true,
  q: "ROW_NUMBER, RANK and DENSE_RANK — window functions",
  tags: ["row_number", "rank vs dense_rank", "window function", "partition by", "over clause"],
  simple: "They number rows inside groups without collapsing them like GROUP BY does. ROW_NUMBER always gives 1,2,3. RANK leaves gaps after a tie. DENSE_RANK does not.",
  answer: "`OVER (PARTITION BY ... ORDER BY ...)` defines the window.\n- **ROW_NUMBER()** — unique sequence, ties broken arbitrarily. Used for paging and for de-duplicating.\n- **RANK()** — ties share a rank, then the next value skips (1,1,3).\n- **DENSE_RANK()** — ties share a rank, no gap (1,1,2).\n- Also useful: `SUM() OVER (...)` for running totals, `LAG`/`LEAD` to compare a row with the previous or next one.\nThe big advantage over a correlated subquery is one pass over the data instead of one query per row.",
  code: "-- latest status row per document\nSELECT * FROM (\n   SELECT d.*, ROW_NUMBER() OVER (PARTITION BY DocId ORDER BY ChangedOn DESC) rn\n   FROM   DocumentStatus d\n) x WHERE rn = 1;",
  project: "I use this pattern constantly in reporting procedures — latest status per document, top N vendors by spend, and month-on-month comparison with LAG. It replaced older correlated-subquery versions that were re-reading the table for every row.",
  remember: "ROW_NUMBER 1,2,3 · RANK 1,1,3 · DENSE_RANK 1,1,2."
},

{
  id: "sql-paging", topic: "sql",
  q: "How do you page large result sets in SQL Server?",
  tags: ["pagination", "offset fetch", "server side paging", "paging large table"],
  simple: "Ask the database for one page at a time with OFFSET/FETCH, and get the total count separately — never pull 50,000 rows into the app and page them in C#.",
  answer: "`ORDER BY ... OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY` is the standard approach from SQL Server 2012 onward. The ORDER BY must be deterministic — add the primary key as a tie-breaker, otherwise rows can repeat or vanish between pages.\nTwo cautions: deep offsets get slower because the server still walks the skipped rows, so for very large sets keyset paging (`WHERE Id > @lastSeenId`) performs better; and the total count is an extra query, so I either run it once per search or use `COUNT(*) OVER()` in the same statement when the set is modest.",
  code: "SELECT PoId, PoNumber, TotalAmount\nFROM   PurchaseOrder\nWHERE  VendorId = @VendorId\nORDER  BY CreatedOn DESC, PoId DESC\nOFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;",
  project: "Every listing screen in the Vendor Portal and the procurement modules pages on the server like this — the React grid and the older jQuery AJAX grids both send page number and size. The reporting screens for purchase orders, invoices and vendor activity were built this way specifically because the data sets are too large to send to the browser.",
  remember: "OFFSET/FETCH with a deterministic ORDER BY. Page in SQL, never in C#."
},

{
  id: "sql-transaction", topic: "sql", star: true,
  q: "Transactions, ACID and isolation levels",
  tags: ["transaction", "acid", "isolation level", "read committed", "rollback", "commit"],
  simple: "A transaction is all-or-nothing. Either every statement succeeds and commits, or one fails and everything rolls back.",
  answer: "**ACID** — Atomicity (all or nothing), Consistency (constraints hold), Isolation (concurrent transactions do not corrupt each other), Durability (committed data survives a crash).\nIsolation levels trade consistency against concurrency:\n- READ UNCOMMITTED — dirty reads; `WITH (NOLOCK)` is this, and it can read uncommitted or duplicated rows, so I do not use it on financial screens.\n- READ COMMITTED — the default; no dirty reads.\n- REPEATABLE READ — same rows reread identically; phantoms still possible.\n- SERIALIZABLE — fully isolated, most blocking.\n- SNAPSHOT / READ COMMITTED SNAPSHOT — readers see a consistent version without blocking writers; the cost is tempdb version store.\nI keep transactions short, open them as late as possible, never wait for user input inside one, and always pair try/catch with a rollback.",
  code: "BEGIN TRY\n    BEGIN TRAN;\n    UPDATE Stock SET Qty = Qty - @Qty WHERE ItemId=@ItemId AND Qty >= @Qty;\n    IF @@ROWCOUNT = 0 THROW 51000, 'Insufficient stock', 1;\n    INSERT INTO StockLedger(...) VALUES(...);\n    COMMIT;\nEND TRY\nBEGIN CATCH\n    IF @@TRANCOUNT > 0 ROLLBACK;\n    THROW;\nEND CATCH",
  project: "Stock movement and GRN posting in the inventory module run inside explicit transactions — the stock update, the ledger entry and the document status must all land together. On the EF Core side the equivalent boundary is a single `SaveChangesAsync`, which wraps all tracked changes in one transaction.",
  remember: "All or nothing. Keep it short. Rollback in the CATCH."
},

{
  id: "sql-deadlock", topic: "sql",
  q: "What is a deadlock and how do you prevent it?",
  tags: ["deadlock", "blocking", "lock", "deadlock victim", "concurrency"],
  simple: "Two transactions each hold something the other needs, so neither can move. SQL Server kills one of them — the deadlock victim — and that transaction has to be retried.",
  answer: "Blocking is normal and temporary; deadlock is a cycle that cannot resolve itself. Prevention:\n- Access tables in the **same order** everywhere — most deadlocks come from one procedure updating A then B while another updates B then A.\n- Keep transactions **short**, and do not run application logic or user prompts inside one.\n- Make sure the UPDATE/DELETE filters are **indexed** — a scan locks far more rows than a seek.\n- Use the right isolation level; READ COMMITTED SNAPSHOT removes a lot of reader/writer contention.\n- Add **retry** on error 1205 in application code for the operations that can legitimately collide.\nTo diagnose I pull the deadlock graph from Extended Events or the system health session and look at exactly which resources the two sides held.",
  project: "The place this bit us was concurrent posting against the same stock and document tables from both the UI and the SAP sync jobs. The fixes were ordering the updates consistently, tightening the transaction scope, and making the Hangfire handlers retry-safe so a victim transaction simply runs again instead of failing the batch.",
  remember: "Same order, short transactions, indexed filters, retry on 1205."
},

{
  id: "sql-normalization", topic: "sql",
  q: "What is normalization? 1NF, 2NF, 3NF and when to denormalize",
  tags: ["normalization", "1nf 2nf 3nf", "denormalization", "database design"],
  simple: "Normalization means storing each fact once so it cannot disagree with itself. Denormalization is deliberately duplicating some data to make reads faster.",
  answer: "- **1NF** — atomic values, no repeating groups or comma-separated lists in a column.\n- **2NF** — 1NF plus no partial dependency on part of a composite key.\n- **3NF** — 2NF plus no transitive dependency; non-key columns depend only on the key.\nBenefits: no update anomalies, less storage, data integrity enforced by keys.\nCost: more joins, which can hurt reporting. So for read-heavy reporting I denormalize deliberately — a summary table, a snapshot of the vendor name on a historical document, or an indexed view — and accept the duplication because it is a point-in-time record, not a live reference.",
  project: "Our transactional schema is normalised, but documents deliberately snapshot things like vendor name, address and tax rate at the time of posting. That is intentional denormalisation: an invoice must show what was true when it was raised, not what the vendor master says today.",
  remember: "Normalise to protect the truth; denormalise deliberately for reads."
},

{
  id: "sql-keys", topic: "sql",
  q: "Primary key vs unique key vs foreign key",
  tags: ["primary key vs unique key", "foreign key", "constraints", "identity"],
  simple: "Primary key identifies the row and cannot be null. Unique key also prevents duplicates but allows one null. Foreign key points at another table's key and keeps the link honest.",
  answer: "- **Primary key** — one per table, not null, unique, and by default backed by the clustered index.\n- **Unique constraint** — any number per table, enforces uniqueness, allows a single NULL in SQL Server; it creates a non-clustered unique index.\n- **Foreign key** — referential integrity: you cannot insert a child pointing at a missing parent, and you cannot delete a parent that still has children unless you define a cascade.\nI always index foreign key columns — SQL Server does not do it automatically and the missing index shows up as scans on joins and on delete checks.\nIdentity vs GUID: identity keys are compact and keep the clustered index sequential; random GUIDs fragment it badly, so if a GUID is required I keep it as a non-clustered unique column and use an identity for the clustered key.",
  code: "ALTER TABLE PurchaseOrder\n  ADD CONSTRAINT FK_PO_Vendor FOREIGN KEY (VendorId) REFERENCES Vendor(VendorId);\nCREATE INDEX IX_PO_VendorId ON PurchaseOrder(VendorId);   -- FK columns need an index",
  project: "I design the SQL Server schemas for the procurement and vendor modules, and indexing the foreign key columns is part of that — SQL Server does not create those indexes for you, and the missing ones showed up as scans on joins and on delete checks during tuning.",
  remember: "PK = identity, not null. UQ = no duplicates, one null allowed. FK = index it yourself."
},

{
  id: "sql-delete-truncate", topic: "sql",
  q: "DELETE vs TRUNCATE vs DROP",
  tags: ["delete vs truncate", "truncate table", "drop table", "rollback delete"],
  simple: "DELETE removes chosen rows and can be rolled back. TRUNCATE empties the whole table fast. DROP removes the table itself.",
  answer: "- **DELETE** — DML, row by row, supports a WHERE clause, fires triggers, fully logged, can be rolled back inside a transaction.\n- **TRUNCATE** — DDL, deallocates pages, no WHERE, does not fire row triggers, minimally logged and much faster, resets IDENTITY, and is blocked if a foreign key references the table. It *can* be rolled back inside an explicit transaction in SQL Server.\n- **DROP** — removes the table structure, data, indexes and constraints.\nOn production I never run a delete without first running the matching SELECT and wrapping it in an explicit transaction so I can check the row count before committing.",
  code: "BEGIN TRAN;\nDELETE FROM StagingUpload WHERE BatchId = @BatchId;\nSELECT @@ROWCOUNT AS Affected;   -- check before COMMIT or ROLLBACK\n-- COMMIT;",
  project: "Release scripts touch production data, so every data-migration script I ship has a matching rollback script and runs inside an explicit transaction with a row-count check. Staging tables for Excel uploads get truncated between batches; real transactional data is never truncated.",
  remember: "DELETE = rows + WHERE. TRUNCATE = all rows, fast, resets identity. DROP = table gone."
},

{
  id: "sql-union", topic: "sql",
  q: "UNION vs UNION ALL",
  tags: ["union vs union all", "distinct", "set operators", "except intersect"],
  simple: "UNION removes duplicates, which means an extra sort. UNION ALL just stacks the rows and is faster. Use ALL unless you really need duplicates removed.",
  answer: "Both stack result sets that have the same column count and compatible types. UNION applies a distinct across the combined set, which costs a sort or hash; UNION ALL does not.\nMost of the time the sets are already exclusive — current year and archive, or two document types — so UNION ALL is both correct and faster.\nRelated operators: `EXCEPT` (rows in the first not in the second) and `INTERSECT` (rows in both), both of which are handy for reconciliation.",
  code: "SELECT PoId, 'OPEN' AS Src FROM PurchaseOrder\nUNION ALL\nSELECT PoId, 'ARCH' FROM PurchaseOrderArchive;",
  project: "The reporting screens that span current and archived purchase orders use UNION ALL, because the two sets cannot overlap — adding a distinct pass there would have been a sort over the whole result for no reason.",
  remember: "UNION dedupes and sorts. UNION ALL does not. Default to ALL."
},

{
  id: "sql-where-having", topic: "sql",
  q: "WHERE vs HAVING, and GROUP BY",
  tags: ["where vs having", "group by", "aggregate functions", "having clause"],
  simple: "WHERE filters rows before grouping. HAVING filters the groups after aggregation. Filtering early is cheaper.",
  answer: "Logical processing order is FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. So WHERE cannot see an aggregate, and HAVING is where you filter on `COUNT(*)` or `SUM(...)`.\nFor performance, push every condition you can into WHERE so fewer rows are grouped at all. A common mistake is putting a plain column filter in HAVING, which still works but aggregates rows that were going to be thrown away.\nEvery non-aggregated column in SELECT must appear in GROUP BY.",
  code: "SELECT VendorId, COUNT(*) AS PoCount, SUM(TotalAmount) AS Spend\nFROM   PurchaseOrder\nWHERE  CreatedOn >= '2026-04-01'        -- filter rows first\nGROUP  BY VendorId\nHAVING SUM(TotalAmount) > 1000000;      -- then filter groups",
  project: "The vendor spend and purchase-order summary procedures are built exactly this way — the date and status filters sit in WHERE so only the relevant rows are grouped, and HAVING is used only for the genuine aggregate thresholds.",
  remember: "WHERE before grouping, HAVING after. Filter early."
},

{
  id: "sql-duplicates", topic: "sql", star: true,
  q: "How do you find and delete duplicate rows?",
  tags: ["duplicate rows", "find duplicates", "delete duplicates", "row_number delete"],
  simple: "Group by the columns that define a duplicate and count. To delete, number the copies with ROW_NUMBER and delete everything numbered above 1.",
  answer: "Finding them is a GROUP BY with `HAVING COUNT(*) > 1`. Deleting while keeping one copy is cleanest with a CTE and ROW_NUMBER, because you can order the window to decide which copy survives — usually the earliest or the most recently updated.\nAlways run the SELECT version first, inside a transaction, and check the row count before committing. Then add a unique constraint so the duplicates cannot come back.",
  code: "-- find\nSELECT Gstin, COUNT(*) FROM Vendor GROUP BY Gstin HAVING COUNT(*) > 1;\n\n-- delete, keeping the oldest\nWITH d AS (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY Gstin ORDER BY CreatedOn) rn\n  FROM   Vendor\n)\nDELETE FROM d WHERE rn > 1;",
  project: "This came up in vendor master cleanup before a SAP sync run — duplicates from different spellings of the same registration had to be identified, merged and then prevented with a unique constraint, otherwise the sync would create duplicates on the SAP side too.",
  remember: "GROUP BY + HAVING to find, ROW_NUMBER + DELETE rn>1 to clean, unique constraint to prevent."
},

{
  id: "sql-second-highest", topic: "sql",
  q: "How do you find the second highest salary?",
  tags: ["second highest salary", "nth highest", "top n", "dense_rank salary"],
  simple: "Rank the rows and pick rank 2. DENSE_RANK is the safest because it handles ties the way an interviewer expects.",
  answer: "Three standard ways:\n1. `DENSE_RANK()` and filter on 2 — handles duplicate salaries correctly and generalises to Nth.\n2. A subquery: `SELECT MAX(Salary) WHERE Salary < (SELECT MAX(Salary) ...)` — simple, no ties handling.\n3. `OFFSET 1 ROWS FETCH NEXT 1 ROW ONLY` over a distinct ordered list.\nThe follow-up is almost always second highest *per department*, which is why I lead with the window function — adding `PARTITION BY DeptId` is the whole change.",
  code: "SELECT DISTINCT Salary FROM (\n    SELECT Salary, DENSE_RANK() OVER (ORDER BY Salary DESC) rnk\n    FROM   Employee\n) x WHERE rnk = 2;\n\n-- per department: add PARTITION BY DeptId inside OVER()",
  project: "This one is a puzzle question rather than something from the project, but the window-function pattern behind it is the same one the reporting procedures use for top N vendors by spend and latest status per document.",
  remember: "DENSE_RANK() = 2. Add PARTITION BY for the per-group version."
},

{
  id: "sql-exists-in", topic: "sql",
  q: "EXISTS vs IN vs JOIN",
  tags: ["exists vs in", "not in null", "subquery", "semi join"],
  simple: "IN compares against a list of values. EXISTS just checks whether a matching row exists and stops at the first one. NOT IN breaks badly if the list contains NULL.",
  answer: "For a small, static list IN is clear and fine. For a correlated check against another table EXISTS is usually the better habit — it short-circuits on the first match and handles NULLs correctly.\nThe real trap is `NOT IN` with a subquery that can return NULL: the comparison becomes unknown and the whole query returns nothing. `NOT EXISTS` does not have that problem.\nA JOIN is right when you actually need columns from the second table; if you only need to test existence, a join can multiply rows and force you into a DISTINCT.",
  code: "-- safe\nSELECT v.* FROM Vendor v\nWHERE NOT EXISTS (SELECT 1 FROM PurchaseOrder p WHERE p.VendorId = v.VendorId);\n\n-- dangerous if VendorId can be NULL\nSELECT * FROM Vendor WHERE VendorId NOT IN (SELECT VendorId FROM PurchaseOrder);",
  project: "NOT EXISTS is what the reconciliation queries between our platform and SAP use — which documents on our side have no matching record on theirs. With NOT IN, a single NULL in the compared column would have returned nothing and made the reconciliation look clean when it was not.",
  remember: "NOT IN + NULL = empty result. Use NOT EXISTS."
},

{
  id: "sql-view", topic: "sql",
  q: "What is a view? Can you update through one?",
  tags: ["view", "indexed view", "materialized view", "updatable view"],
  simple: "A view is a saved query that behaves like a table. It stores no data unless you index it.",
  answer: "Views simplify complex joins, present a consistent shape to reports, and act as a security layer — grant access to the view instead of the base tables, exposing only the permitted columns.\nYou can update through a simple view that touches one base table and includes the required columns; multi-table or aggregated views are not updatable without an INSTEAD OF trigger.\nAn **indexed (materialised) view** physically stores the result and keeps it in sync, which speeds up heavy aggregate reporting but adds write cost and comes with strict requirements (schemabinding, deterministic expressions).\nViews do not make a query faster by themselves — nesting views inside views is a common cause of mysteriously bad plans.",
  project: "We use views to give reporting and read-only consumers a stable, column-limited shape over the procurement tables, which also means a schema change behind the view does not break every report at once.",
  remember: "A view is a stored query, not stored data — unless it is indexed."
},

{
  id: "sql-trigger", topic: "sql",
  q: "What is a trigger and when should you avoid one?",
  tags: ["trigger", "after trigger", "instead of trigger", "audit trail"],
  simple: "A trigger is code that fires automatically on insert, update or delete. Handy for audit trails, dangerous when you forget it exists.",
  answer: "AFTER triggers run post-statement; INSTEAD OF triggers replace the action and are used on views. Inside, `inserted` and `deleted` are the virtual tables holding the affected rows.\nGood use: an audit trail you cannot bypass, regardless of which application wrote the row.\nWhy I am careful: triggers are invisible at the call site, they run inside the caller's transaction so they extend locks, they must be written set-based (a trigger assuming one row breaks on a bulk update), and chained triggers make debugging painful. Business logic belongs in a procedure or the application, not hidden in a trigger.",
  code: "CREATE TRIGGER trg_PO_Audit ON PurchaseOrder AFTER UPDATE AS\nBEGIN\n    SET NOCOUNT ON;\n    INSERT INTO PoAudit(PoId, OldStatus, NewStatus, ChangedOn)\n    SELECT i.PoId, d.Status, i.Status, GETDATE()\n    FROM inserted i JOIN deleted d ON d.PoId = i.PoId\n    WHERE ISNULL(i.Status,'') <> ISNULL(d.Status,'');\nEND",
  project: "We use triggers for audit history on sensitive tables like document status, so the trail exists even when a script updates the row directly. Business rules stay in stored procedures where they are visible to whoever reads the code.",
  remember: "Triggers for audit, not for business logic. Always write them set-based."
},

{
  id: "sql-backup", topic: "sql",
  q: "Backup, restore and refreshing a test environment",
  tags: ["backup restore", "full differential log backup", "data masking", "environment refresh", "recovery model"],
  simple: "Full backup is everything, differential is what changed since the last full, log backup lets you restore to a point in time. Refreshing UAT means restoring production and then hiding the personal data.",
  answer: "Backup types: FULL, DIFFERENTIAL, and TRANSACTION LOG (only in FULL recovery model, and that is what gives point-in-time restore). A backup you have not test-restored is not a backup.\nFor a Production → UAT/Dev refresh the sequence I follow is: take the restore copy, restore to the target with a different database name/path, run the masking scripts over personal and commercial data — names, emails, phone numbers, bank and tax identifiers — reset environment-specific configuration, and then validate that the masking actually applied before handing the environment over.",
  project: "This is part of my release responsibilities. I run Production → UAT/Dev refreshes with data masking and validation of sensitive fields, so the team tests against realistic volumes without real vendor contact and bank details sitting in a non-production environment.",
  remember: "Full + differential + log = point-in-time. Refresh = restore, mask, validate."
},

{
  id: "sql-select-star", topic: "sql",
  q: "Why is SELECT * a problem?",
  tags: ["select star", "select *", "column list", "query best practice"],
  simple: "It drags back columns nobody uses, breaks when the table changes, and stops a covering index from doing its job.",
  answer: "Issues: more data over the network and more memory per row; a non-clustered index that would have covered the query now needs a key lookup to the table; adding or reordering a column silently changes the result shape and can break positional code or a view; and large text/blob columns get pulled for no reason.\nNaming the columns is self-documenting and makes the real dependency explicit when someone later wants to drop a column.",
  project: "Replacing SELECT * with explicit column lists on grid-backing queries was part of the tuning work on the high-traffic procurement screens — the grids showed a handful of columns while the query was returning every column including long description fields.",
  remember: "Name your columns. SELECT * defeats covering indexes."
},

{
  id: "sql-merge", topic: "sql",
  q: "How do you do an upsert (insert or update) in SQL Server?",
  tags: ["merge", "upsert", "insert or update", "sync data"],
  simple: "Upsert means insert the row if it is new, update it if it already exists. MERGE does it in one statement, but an explicit UPDATE-then-INSERT is often safer.",
  answer: "`MERGE` matches a source against a target on a key and gives WHEN MATCHED / WHEN NOT MATCHED branches — convenient for synchronising a staging table into a master table.\nIt has a reputation for edge-case bugs and concurrency issues, so for high-concurrency single-row cases I often prefer an explicit `UPDATE ... IF @@ROWCOUNT = 0 INSERT` inside a transaction, or an insert guarded by `WHERE NOT EXISTS`. Whichever I use, the matching key needs a unique index or two concurrent runs can both insert.",
  code: "MERGE INTO VendorMaster AS t\nUSING StagingVendor AS s ON t.VendorCode = s.VendorCode\nWHEN MATCHED THEN UPDATE SET t.Name = s.Name, t.UpdatedOn = GETDATE()\nWHEN NOT MATCHED THEN INSERT (VendorCode, Name) VALUES (s.VendorCode, s.Name);",
  project: "The SAP sync and the Excel bulk upload both land data in staging tables first and then upsert into the masters on the business key. Staging first is deliberate — it means a bad file can be inspected and discarded without ever touching master data.",
  remember: "Stage first, then upsert on a uniquely indexed business key."
},

{
  id: "sql-plan-cache", topic: "sql",
  q: "What is parameter sniffing?",
  tags: ["parameter sniffing", "plan cache", "recompile", "sometimes slow query", "statistics"],
  simple: "SQL Server reuses the plan it built for the first set of parameter values. If those values were unusual, every later call is stuck with a plan that suits them and not you.",
  answer: "On first execution the optimiser sniffs the parameter values and caches a plan sized for them. A parameter that is highly selective for one vendor but matches a million rows for another leads to the classic complaint: the same procedure is fast for most users and slow for one.\nFixes depending on the case: `OPTION (RECOMPILE)` on the problem statement, `OPTIMIZE FOR UNKNOWN`, assigning the parameter to a local variable, splitting into separate procedures for genuinely different shapes, or updating statistics. The real diagnosis is comparing the cached plan's estimated rows against the actual rows.",
  code: "SELECT ... FROM PurchaseOrder WHERE VendorId = @VendorId\nOPTION (RECOMPILE);",
  remember: "Same proc fast for one user, slow for another = suspect parameter sniffing."
},

{
  id: "sql-btree", topic: "sql", star: true,
  q: "What data structure is a SQL Server index? (B-tree internals)",
  tags: ["b-tree", "b+ tree", "index structure", "index internals", "how index works", "leaf level"],
  simple: "An index is a balanced tree. The top is a small root page, below it are intermediate pages, and the bottom row — the leaf level — holds the actual keys in order. SQL Server walks down a few levels instead of reading every row.",
  answer: "SQL Server indexes are **B+ trees**: a root page, intermediate levels, and a leaf level, all kept balanced so every lookup costs the same few page reads. Even a table of millions of rows is usually only three or four levels deep, which is why an index seek is a handful of reads rather than thousands.\nThe difference between the two index types is **what sits at the leaf**:\n- **Clustered index** — the leaf level *is* the table data, stored in key order. That is why there can only be one.\n- **Non-clustered index** — the leaf holds the index key columns plus a **row locator** (the clustered key, or a RID on a heap) pointing back to the row.\nThat structure explains the behaviour you see in plans: a **seek** navigates root → intermediate → leaf for the matching range; a **key lookup** happens when the leaf does not carry a column the query needs, so it follows the locator back to the table; and `INCLUDE` fixes that by storing the extra columns at the leaf.\nA table with no clustered index is a **heap** — unordered pages — and that is usually a design accident rather than a decision.",
  code: "              [ root page ]\n             /      |      \\\n      [ intermediate pages ]\n       /       |        |      \\\n[ leaf: keys in order --------- ]\n   clustered  -> leaf IS the row data\n   non-clust. -> leaf = key + row locator (+ INCLUDE columns)",
  project: "This is the reasoning behind the covering indexes on the procurement screens. Once you picture the leaf level, adding `INCLUDE (PoNumber, TotalAmount)` stops being a trick and becomes obvious — you are putting the columns the grid needs at the leaf so the engine never has to walk back to the table.",
  remember: "B+ tree, 3–4 levels. Clustered leaf = the data. Non-clustered leaf = key + locator."
},

{
  id: "sql-exec-plan", topic: "sql", star: true,
  q: "What does an execution plan show, and which operators matter?",
  tags: ["execution plan", "query plan", "index seek vs index scan", "key lookup", "hash match", "nested loops", "table scan"],
  simple: "The execution plan is SQL Server showing its working — which indexes it used, in what order, and how many rows moved at each step. It is the first thing to look at when a query is slow, not the last.",
  answer: "Get the **actual** plan (not the estimated one) so you can compare estimated against actual row counts — a large gap means stale statistics or parameter sniffing.\nOperators worth recognising:\n- **Index Seek** — navigated straight to the rows. Usually what you want.\n- **Index Scan / Table Scan** — read the whole index or the whole heap. Fine on a small table, a red flag on a large one.\n- **Key Lookup / RID Lookup** — the non-clustered index found the row but had to go back to the table for more columns. Fix with `INCLUDE`.\n- **Nested Loops** — good for a small outer set against an indexed inner one; bad when the outer set is large.\n- **Hash Match** — builds a hash table; normal for big unindexed joins and aggregates, but it uses memory and can spill to tempdb.\n- **Sort** — expensive; often removable with an index in the right order.\n**How I read one**: right to left, follow the **thick arrows** (those carry the most rows), and check the operator costs. The real target is reducing **logical reads**, which `SET STATISTICS IO ON` reports — that number is honest in a way that elapsed time is not, because it does not change with server load or cache state.\nThere is no universally fastest operator: a scan over 500 rows beats a seek plus 500 key lookups. Selectivity decides.",
  code: "SET STATISTICS IO, TIME ON;\n-- then run the query and read the plan right to left\n-- look for: Scan where you expected Seek, Key Lookup, fat arrows, Sort",
  project: "Checking the plan before and after is how the tuning on the high-traffic procurement screens was done, rather than guessing at indexes. The recurring finds were the same three: a scan caused by a function wrapped around an indexed column, a key lookup that an INCLUDE removed, and a sort that disappeared once the index matched the ORDER BY.",
  remember: "Actual plan, right to left, fat arrows. Seek vs scan depends on selectivity. Chase logical reads."
},

{
  id: "sql-temp-table", topic: "sql",
  q: "Temporary tables — #temp vs ##global, and using one in a stored procedure",
  tags: ["temp table", "#temp", "##global temp table", "tempdb", "temp table in stored procedure", "local vs global temp"],
  simple: "A temp table is a real table that lives in tempdb and disappears when you are done. One hash means it is yours alone; two hashes means every session can see it.",
  answer: "- **`#Local`** — visible only to the session that created it, and dropped automatically when that scope ends. Created inside a stored procedure, it is dropped when the procedure finishes, so you rarely need to drop it yourself.\n- **`##Global`** — visible to every session, and destroyed when the creating session ends and no one else is referencing it. I avoid it: two concurrent users running the same code collide on the same name, which is a genuinely painful bug to track down.\n- Both live in **tempdb**, both support indexes and statistics, and both are fully logged.\nUseful details: a temp table created in a procedure **is** visible to procedures it calls, but not to its caller. Because they carry statistics, the optimiser estimates them well — which is exactly why a #temp table beats a table variable once the row count grows.\nAnd tempdb is a shared resource: a procedure that builds large temp tables on every call puts pressure on the whole instance, not just its own query.",
  code: "CREATE PROCEDURE usp_VendorSpend @FromDate DATE AS\nBEGIN\n    SET NOCOUNT ON;\n    CREATE TABLE #Spend (VendorId INT PRIMARY KEY, Total DECIMAL(18,2));\n\n    INSERT INTO #Spend (VendorId, Total)\n    SELECT VendorId, SUM(TotalAmount)\n    FROM   PurchaseOrder\n    WHERE  CreatedOn >= @FromDate\n    GROUP  BY VendorId;\n\n    SELECT v.Name, s.Total\n    FROM   #Spend s JOIN Vendor v ON v.VendorId = s.VendorId\n    ORDER  BY s.Total DESC;\nEND   -- #Spend is dropped here automatically",
  project: "The reporting procedures use this shape when an intermediate result is large and reused — build it once into a #temp table with a key, then join against it, instead of repeating the same aggregate in three places.",
  remember: "#local per session and auto-dropped, ##global shared and collision-prone. Both in tempdb, both have statistics."
},

{
  id: "sql-audit", topic: "sql", star: true,
  q: "How do you track who changed a row and when?",
  tags: ["audit trail", "log modified rows", "temporal table", "change data capture", "cdc", "audit table trigger", "row versioning history"],
  simple: "Three ways: write the old and new values to an audit table from a trigger, let SQL Server keep the history for you with a temporal table, or turn on Change Data Capture. Which one depends on who needs the history and why.",
  answer: "**1. Audit table + trigger** — an AFTER UPDATE/DELETE trigger writes to an audit table using the `inserted` (new values) and `deleted` (old values) virtual tables. Full control over what is stored, and it cannot be bypassed by whichever application wrote the row. Must be written set-based, or it breaks on a bulk update.\n**2. Temporal tables (SQL Server 2016+)** — `SYSTEM_VERSIONING = ON` gives the table a history table maintained by the engine, with period columns. You then query the past with `FOR SYSTEM_TIME AS OF`. No trigger code, no chance of forgetting one — but it records *what* changed, not *who* changed it, unless the application writes a user column.\n**3. Change Data Capture / Change Tracking** — built for feeding downstream systems and ETL rather than for a business audit screen.\n**The gap all three share**: the database sees the application's login, not the end user. So the user id has to come from the application — a column set on every write, or a `SESSION_CONTEXT` value the trigger reads.\nMy default for a business audit trail is the trigger plus audit table, because the business usually wants a readable who/what/when, not a point-in-time query.",
  code: "CREATE TRIGGER TR_PurchaseOrder_Audit\nON PurchaseOrder AFTER UPDATE\nAS\nBEGIN\n    SET NOCOUNT ON;\n    INSERT INTO PurchaseOrderAudit (PoId, OldStatus, NewStatus, ChangedBy, ChangedOn)\n    SELECT i.PoId, d.Status, i.Status, i.ModifiedBy, GETDATE()\n    FROM   inserted i\n    JOIN   deleted  d ON d.PoId = i.PoId\n    WHERE  ISNULL(i.Status,'') <> ISNULL(d.Status,'');   -- only real changes\nEND\n\n-- temporal alternative\nSELECT * FROM PurchaseOrder\nFOR SYSTEM_TIME AS OF '2026-10-01T09:00:00';",
  project: "Document and purchase-order status history is audited this way on our platform, so the trail exists even when a release script updates rows directly. The application stamps the user id on the row, which is what lets the trigger record who rather than just what.",
  remember: "Trigger + audit table for who/what/when. Temporal for point-in-time. The database does not know your end user — pass it in."
},

{
  id: "sql-nolock", topic: "sql", star: true,
  q: "What is wrong with WITH (NOLOCK)?",
  tags: ["nolock", "with nolock", "read uncommitted", "dirty read", "nolock problems", "blocking workaround"],
  simple: "NOLOCK is not a performance setting — it is read uncommitted. It lets you read data that was never committed, and it can return a row twice or skip one entirely. People sprinkle it to stop blocking and quietly get wrong numbers.",
  answer: "`WITH (NOLOCK)` is READ UNCOMMITTED for that table. What it actually allows:\n- **Dirty reads** — you see rows from a transaction that later rolls back. The number you reported never existed.\n- **Missing and duplicated rows** — this is the part most people do not know. If a page split happens mid-scan, a row can be read twice or skipped, even for rows nobody is modifying.\n- It still takes a schema stability lock, so it is not lock-free.\nThe reason it spreads is that it *appears* to fix blocking. It does not fix the blocking — it just stops waiting for it, and the blocking is still there slowing everything else down.\n**What to do instead:**\n- Fix the underlying query, since blocking usually comes from a long transaction or a scan locking far more rows than a seek would.\n- Turn on **READ COMMITTED SNAPSHOT** on the database — readers get a consistent committed version without blocking writers. It costs tempdb version store space and is almost always the right answer.\n- Keep write transactions short.\n**Where I would accept it**: a rough operational count on a non-critical dashboard, where approximate is genuinely fine and everyone knows it. Never on anything financial, anything that feeds a decision, or anything a user will reconcile against.",
  code: "-- the habit to break\nSELECT COUNT(*) FROM PurchaseOrder WITH (NOLOCK);\n\n-- the fix, once, at database level\nALTER DATABASE Procurement SET READ_COMMITTED_SNAPSHOT ON;",
  project: "This comes up when someone hits blocking on a busy screen and reaches for the quick fix. On the procurement modules the real causes were long transactions and scans caused by missing indexes — tightening those removed the blocking properly, which is the fix NOLOCK only pretends to be.",
  remember: "NOLOCK = dirty reads, plus rows read twice or skipped. Use READ COMMITTED SNAPSHOT, and fix the real query."
},

{
  id: "sql-datatypes", topic: "sql", star: true,
  q: "SQL Server data types — varchar vs nvarchar, decimal vs float",
  tags: ["data types", "varchar vs nvarchar", "char vs varchar", "decimal vs float", "datetime2", "sql data type choice"],
  simple: "varchar is one byte per character, nvarchar is two and stores any language. decimal is exact and is what money needs; float is approximate and will give you rounding errors on money.",
  answer: "- **char(n)** fixed width, padded — only for genuinely fixed codes. **varchar(n)** variable width. **nvarchar(n)** Unicode, two bytes per character.\n- **varchar vs nvarchar** is a real decision: nvarchar doubles the storage and halves how many rows fit on a page, which means more I/O. But anything facing users, or holding names and addresses, should be nvarchar. Codes and identifiers can be varchar.\n- **The invisible killer**: comparing a varchar column to an nvarchar parameter causes an **implicit conversion** and can stop the index being used. ADO.NET sends strings as nvarchar by default, so a varchar column plus `AddWithValue` is exactly how a seek quietly becomes a scan.\n- **decimal(p,s)** is exact — use it for money, quantity and anything that gets summed or compared. **float/real** are approximate binary types: `0.1 + 0.2 != 0.3`, and totals will not reconcile.\n- **datetime2** over the old `datetime` — wider range, better precision, same or less storage. `date` when there is no time.\n- **bit** for flags, **uniqueidentifier** for GUIDs (never as a clustered key — random GUIDs fragment the index).\n- Avoid `(max)` types unless genuinely needed; they are stored off-row and cannot be indexed normally.\n- And size things honestly: `nvarchar(max)` for a 50-character code wastes memory grants on every query that touches it.",
  code: "-- exact, for anything financial\nTotalAmount  DECIMAL(18,2)   NOT NULL,\n-- Unicode for anything a human typed\nVendorName   NVARCHAR(200)   NOT NULL,\n-- ASCII code, matched with an explicit type to avoid conversion\nVendorCode   VARCHAR(20)     NOT NULL,\nCreatedOn    DATETIME2(3)    NOT NULL",
  project: "The implicit-conversion trap is one I check for when a query is slower than its plan suggests it should be — it is why the ADO.NET code adds parameters with an explicit `SqlDbType` and size rather than `AddWithValue`. All money columns on the procurement side are `decimal`, because a float total that is out by a paisa is a reconciliation conversation.",
  remember: "decimal for money, nvarchar for human text, and watch varchar column vs nvarchar parameter."
},

{
  id: "sql-null-functions", topic: "sql", star: true,
  q: "Handling NULL in SQL — ISNULL, COALESCE, NULLIF",
  tags: ["isnull vs coalesce", "nullif", "is null", "null in sql", "null aggregate", "ansi nulls"],
  simple: "NULL means unknown, not zero and not empty. Anything compared to NULL is unknown, so you need IS NULL rather than = NULL. ISNULL and COALESCE substitute a value when something is NULL.",
  answer: "**The rule that catches people**: `WHERE Status = NULL` returns nothing, ever. Unknown compared to anything is unknown, which is not true. Use `IS NULL` / `IS NOT NULL`.\n- **ISNULL(x, y)** — T-SQL only, two arguments, and the return type comes from the **first** argument, which can silently truncate: `ISNULL(varchar(5) col, 'LONG TEXT')` truncates.\n- **COALESCE(a, b, c, …)** — ANSI standard, any number of arguments, returns the first non-null, and the type is the highest-precedence of all of them. My default.\n- **NULLIF(a, b)** — returns NULL when the two are equal. The classic use is `NULLIF(divisor, 0)` to turn a divide-by-zero into NULL rather than an error.\n**Other behaviours worth knowing:**\n- Aggregates **ignore** NULLs — `AVG` divides by the non-null count, and `COUNT(column)` skips them while `COUNT(*)` does not.\n- `NULL + 5` is NULL, and `'abc' + NULL` is NULL — so concatenation needs COALESCE or `CONCAT`, which treats NULL as empty.\n- `GROUP BY` and `DISTINCT` treat all NULLs as **one** group, even though NULL does not equal NULL.\n- `NOT IN` with a NULL in the list returns nothing — use `NOT EXISTS`.\n**Performance note**: wrapping an indexed column in `ISNULL()` makes the predicate non-SARGable, so filter with `IS NULL` or `OR col IS NULL` rather than `ISNULL(col,'') = ''`.",
  code: "SELECT v.Name,\n       COALESCE(v.Gstin, v.Pan, 'Not provided')      AS TaxId,\n       SUM(p.TotalAmount) / NULLIF(COUNT(p.PoId), 0) AS AvgPo\nFROM   Vendor v\nLEFT JOIN PurchaseOrder p ON p.VendorId = v.VendorId\nWHERE  v.ClosedOn IS NULL          -- not  = NULL\nGROUP  BY v.Name;",
  project: "Optional master fields — alternate contacts, tax details, bank information — are full of legitimate NULLs, so the reporting procedures lean on COALESCE for display and NULLIF to guard the division in average and ratio calculations.",
  remember: "IS NULL, never = NULL. COALESCE over ISNULL. NULLIF to dodge divide-by-zero. Aggregates skip NULLs."
},

{
  id: "sql-case-pivot", topic: "sql",
  q: "CASE expressions, PIVOT and conditional aggregation",
  tags: ["case when", "pivot", "unpivot", "conditional aggregation", "cross tab", "rows to columns"],
  simple: "CASE is if-then-else inside a query. PIVOT turns rows into columns — the classic monthly-totals-across-the-top report. Conditional aggregation does the same thing with CASE inside SUM, and it is usually easier to read.",
  answer: "**CASE** works anywhere an expression does — SELECT, WHERE, ORDER BY, even inside an aggregate. Searched form (`CASE WHEN x > 10 THEN ...`) is the flexible one; simple form (`CASE col WHEN 1 THEN ...`) is shorter for equality.\n**PIVOT** rotates rows into columns, but it needs the column list spelled out, so a dynamic set of columns means dynamic SQL.\n**Conditional aggregation** — `SUM(CASE WHEN … THEN 1 ELSE 0 END)` — does the same job in plain SQL, handles several measures at once, and is far easier to read and maintain. It is what I reach for in practice; PIVOT I mainly need to *recognise*.\nTwo cautions: `CASE` in a `WHERE` clause against an indexed column breaks the seek, and a `CASE` in `ORDER BY` can force an expensive sort.",
  code: "-- conditional aggregation: readable, and more than one measure at a time\nSELECT VendorId,\n       SUM(CASE WHEN Status = 'OPEN'     THEN TotalAmount ELSE 0 END) AS OpenValue,\n       SUM(CASE WHEN Status = 'APPROVED' THEN TotalAmount ELSE 0 END) AS ApprovedValue,\n       COUNT(CASE WHEN Status = 'REJECTED' THEN 1 END)                AS RejectedCount\nFROM   PurchaseOrder\nGROUP  BY VendorId;",
  project: "The procurement dashboards are built this way — one pass over the table producing several status columns, rather than three separate queries the application then has to stitch together.",
  remember: "CASE inside SUM beats PIVOT for readability. Dynamic columns mean dynamic SQL."
},

{
  id: "sql-cursor", topic: "sql", star: true,
  q: "What is a cursor, and why avoid it?",
  tags: ["cursor", "while loop sql", "row by row", "set based vs cursor", "rbar"],
  simple: "A cursor walks a result set one row at a time, like a foreach inside the database. SQL Server is built to work on sets, so doing it row by row is usually dramatically slower.",
  answer: "A cursor is declared, opened, fetched from in a loop, closed and deallocated. It is sometimes called **RBAR** — row by agonising row — because each iteration is a separate operation with its own overhead, and the optimiser cannot help you.\n**Set-based is almost always the answer**: a single UPDATE with a JOIN, a MERGE, a window function, or conditional aggregation. A cursor that takes minutes commonly becomes a set-based statement that takes seconds.\n**When a cursor is defensible:**\n- Calling a stored procedure per row, where there is genuinely no set-based equivalent.\n- Administrative scripts — looping over databases or tables.\n- Deliberately batching a huge update to avoid one enormous transaction, though a `WHILE` loop over `TOP (n)` is the better form of that.\nIf you must use one, declare it `LOCAL FAST_FORWARD` (forward-only, read-only) — the default is far heavier than people realise.\n**The reframing that scores**: \"my first instinct when I see a cursor is to ask what set-based statement it is imitating\" — it shows you think in sets, which is the actual skill being tested.",
  code: "-- cursor thinking\n-- for each row: UPDATE PurchaseOrder SET Status='CLOSED' WHERE PoId=@id\n\n-- set-based: one statement, one plan\nUPDATE p\nSET    p.Status = 'CLOSED'\nFROM   PurchaseOrder p\nJOIN   GoodsReceipt g ON g.PoId = p.PoId\nWHERE  p.Status = 'OPEN' AND g.IsComplete = 1;",
  project: "Replacing row-by-row processing with set-based statements is part of the same work that cut database round-trips on Smart Documents by around half — the application-side equivalent of a cursor is a loop issuing one query per row, and both have the same fix.",
  remember: "Cursors are RBAR. Ask what set-based statement it is imitating. LOCAL FAST_FORWARD if you must."
},

{
  id: "sql-dynamic", topic: "sql",
  q: "Dynamic SQL and sp_executesql",
  tags: ["dynamic sql", "sp_executesql", "exec string sql", "dynamic where clause", "injection in stored procedure"],
  simple: "Dynamic SQL is SQL built as a string and then executed. It is sometimes necessary, and it is the one place inside a stored procedure where SQL injection is still possible.",
  answer: "You need it when the **structure** varies — a table or column name chosen at runtime, a PIVOT with unknown columns, or an optional-filter search where you want a tight plan per combination.\n**`EXEC(@sql)` versus `sp_executesql`** is the important distinction:\n- `EXEC` runs a concatenated string. Values glued into it are **injectable**, and every different value produces a different query text, so the plan cache fills with single-use plans.\n- `sp_executesql` takes a **parameter list**, so values stay parameters: safe from injection, and one reusable cached plan.\n**The rule**: structure can be concatenated, values never. And anything concatenated — a column or sort name from the UI — must be validated against a **whitelist** or passed through `QUOTENAME`, never taken raw from the request.\nAlso watch scope: dynamic SQL runs in its own batch, so local variables and `#temp` tables created inside it are not visible outside.\n**The alternative worth mentioning**: for optional search filters, `WHERE (@VendorId IS NULL OR VendorId = @VendorId)` avoids dynamic SQL entirely but can produce one plan that suits no case — `OPTION (RECOMPILE)` fixes that, and is often simpler than building SQL strings.",
  code: "DECLARE @sql NVARCHAR(MAX) = N'\n  SELECT PoId, PoNumber, TotalAmount\n  FROM   PurchaseOrder\n  WHERE  VendorId = @VendorId';\n\nIF @Status IS NOT NULL\n    SET @sql += N' AND Status = @Status';     -- structure\n\nEXEC sp_executesql @sql,\n     N'@VendorId INT, @Status VARCHAR(20)',   -- values stay parameters\n     @VendorId = @VendorId, @Status = @Status;",
  project: "Dynamic SQL inside stored procedures was one of the categories I had to review during the security remediation — a procedure can look safe because it takes parameters, while concatenating one of them into an EXEC string underneath. Converting those to `sp_executesql` with a parameter list is the fix.",
  remember: "Concatenate structure, parameterise values. sp_executesql, not EXEC. Whitelist anything you must concatenate."
},

{
  id: "sql-functions", topic: "sql",
  q: "Common date and string functions (and the SARGable trap)",
  tags: ["date functions", "datediff", "dateadd", "string functions", "substring", "charindex", "format sql", "eomonth"],
  simple: "The usual date and string helpers — DATEADD, DATEDIFF, FORMAT, SUBSTRING, CHARINDEX, CONCAT, TRIM. The thing to remember is that wrapping an indexed column in any of them stops the index being used.",
  answer: "**Dates**: `GETDATE()` / `SYSDATETIME()` (and `GETUTCDATE()` — prefer UTC on a server), `DATEADD`, `DATEDIFF`, `DATEPART`, `EOMONTH`, `CAST(x AS DATE)` to strip time. `FORMAT()` is convenient and genuinely slow at volume — format in the application layer instead.\n**Strings**: `LEN` (ignores trailing spaces) vs `DATALENGTH` (bytes), `SUBSTRING`, `LEFT`/`RIGHT`, `CHARINDEX`, `REPLACE`, `TRIM`/`LTRIM`/`RTRIM`, `CONCAT` (treats NULL as empty, unlike `+`), `STRING_AGG` to join rows into a list, `STRING_SPLIT` to do the reverse.\n**The trap that matters in an interview**: any function wrapped around the **column** makes the predicate non-SARGable, so the index cannot seek. Rewrite as a range on the raw column, and keep the function on the parameter side instead — this is the single most common cause of a slow filter I see.",
  code: "-- non-SARGable: scans\nWHERE YEAR(CreatedOn) = 2026\nWHERE CONVERT(date, CreatedOn) = '2026-10-15'\nWHERE LEFT(VendorCode, 3) = 'VEN'\n\n-- SARGable: seeks\nWHERE CreatedOn >= '2026-01-01' AND CreatedOn < '2027-01-01'\nWHERE CreatedOn >= @d AND CreatedOn < DATEADD(DAY, 1, @d)\nWHERE VendorCode LIKE 'VEN%'        -- prefix is fine; '%VEN' is not",
  project: "A date function applied to an indexed column was one of the three recurring causes behind the slow procurement screens, along with SELECT * and missing covering indexes. Rewriting those filters as date ranges is a mechanical change with a large payoff.",
  remember: "Function on the column kills the seek. Keep the column bare and move the function to the parameter."
},

{
  id: "sql-distinct-group", topic: "sql",
  q: "DISTINCT vs GROUP BY — what is the difference?",
  tags: ["distinct vs group by", "distinct", "group by", "remove duplicates query", "select distinct"],
  simple: "Both remove duplicates. GROUP BY can also aggregate — count, sum, average per group. If you are not aggregating, they usually produce the same plan.",
  answer: "`SELECT DISTINCT a, b` and `SELECT a, b … GROUP BY a, b` return the same rows, and SQL Server typically produces the same plan (a hash or stream aggregate) for both. Neither is inherently faster.\n**Use GROUP BY** when you need an aggregate per group, or a `HAVING` filter on that aggregate.\n**Use DISTINCT** when you simply want unique rows and no aggregation — it reads more clearly.\n**What matters more than the choice**: DISTINCT often indicates a **join that is multiplying rows**. Someone joins a one-to-many, gets duplicates, and bolts DISTINCT on the front. That hides the problem and pays a sort or hash over the whole inflated set. The right fix is usually `EXISTS` or a pre-aggregated subquery, so the duplicates are never produced.\nAlso worth knowing: `COUNT(DISTINCT col)` is more expensive than `COUNT(*)`, and DISTINCT treats all NULLs as one value.",
  code: "-- DISTINCT papering over a fan-out\nSELECT DISTINCT v.VendorId, v.Name\nFROM Vendor v JOIN PurchaseOrder p ON p.VendorId = v.VendorId;\n\n-- the honest version: no duplicates to remove\nSELECT v.VendorId, v.Name\nFROM Vendor v\nWHERE EXISTS (SELECT 1 FROM PurchaseOrder p WHERE p.VendorId = v.VendorId);",
  remember: "Same result, same plan. A DISTINCT you did not plan usually means a join is fanning out."
},

{
  id: "sql-identity", topic: "sql",
  q: "IDENTITY vs SEQUENCE vs GUID for primary keys",
  tags: ["identity", "sequence", "guid primary key", "newid vs newsequentialid", "auto increment", "surrogate key"],
  simple: "IDENTITY auto-numbers a column in one table. SEQUENCE is a separate number generator several tables can share. GUIDs are globally unique but make a terrible clustered key.",
  answer: "- **IDENTITY** — belongs to the column. Simple, and the common default. Get the new value with `SCOPE_IDENTITY()` — **not** `@@IDENTITY`, which returns the last identity from any scope including a trigger, which is a classic bug. Gaps are normal after rollbacks and restarts, so never present it as a gapless document number.\n- **SEQUENCE** — a standalone object. You can get a value **before** inserting, share one sequence across several tables, control increment and cycling, and cache for throughput. Better when the number has business meaning or must be allocated up front.\n- **GUID / uniqueidentifier** — globally unique, so IDs can be generated by the client or merged from multiple systems without collision. The cost: 16 bytes, carried into every non-clustered index, and `NEWID()` is random, which fragments a clustered index badly and causes page splits. If you need a GUID, make it a non-clustered unique column with an identity as the clustered key, or use `NEWSEQUENTIALID()`.\n**And business document numbers are a separate problem**: if finance needs an unbroken PO number sequence, neither identity nor sequence guarantees that under rollbacks — that needs its own allocation table with a transaction.",
  code: "PoId      INT IDENTITY(1,1) PRIMARY KEY,         -- surrogate, clustered\nPublicId  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),  -- exposed externally\n\nCREATE SEQUENCE dbo.DocNumber AS INT START WITH 1000 INCREMENT BY 1;\nSELECT NEXT VALUE FOR dbo.DocNumber;        -- a number before the insert\n\nSELECT SCOPE_IDENTITY();                    -- not @@IDENTITY",
  project: "Our tables use identity surrogate keys clustered on the id, which keeps inserts sequential and the index unfragmented. Business-facing document numbers are generated separately, because a visible number with gaps in it is a question from finance every month.",
  remember: "IDENTITY per column, SEQUENCE to share or pre-allocate, GUID never as a random clustered key. SCOPE_IDENTITY()."
},

{
  id: "sql-maintenance", topic: "sql",
  q: "Statistics, fragmentation and index maintenance",
  tags: ["statistics", "update statistics", "index fragmentation", "rebuild vs reorganize", "index maintenance", "stale statistics"],
  simple: "Statistics tell the optimiser how many rows to expect. When they go stale it picks a bad plan. Fragmentation is the index pages getting out of order, which makes scans read more pages than they should.",
  answer: "**Statistics** are the histogram of a column's data distribution; the optimiser uses them to estimate row counts. When they are stale the estimate is wrong, and the plan is built for the wrong size of data — the symptom is a plan with a huge gap between estimated and actual rows. Auto-update is on by default but is triggered by a **proportion** of rows changing, so on a very large table it can lag badly. `UPDATE STATISTICS` or a maintenance job fixes it, and on a big table a stats update alone often resolves a sudden slowdown.\n**Fragmentation** comes from page splits as rows are inserted and updated:\n- Under ~10% — leave it.\n- 10–30% — `REORGANIZE`: online, lighter, defragments the leaf level.\n- Over 30% — `REBUILD`: rebuilds the index and **updates statistics with a full scan** as a side effect. Offline by default; `ONLINE = ON` needs the right edition.\n**What I would actually say in an interview**: on a modern instance with fast storage, fragmentation matters less than people think, and stale statistics matter more. If a query that was fine yesterday is slow today and nothing was deployed, statistics are my first suspicion — before I start adding indexes.\nAlso worth naming: `FILLFACTOR` to leave room for inserts, and a regular job rather than ad-hoc rebuilds.",
  code: "-- the first thing to try on a suddenly-slow query\nUPDATE STATISTICS PurchaseOrder WITH FULLSCAN;\n\nALTER INDEX IX_PO_Vendor_Status ON PurchaseOrder REORGANIZE;\nALTER INDEX IX_PO_Vendor_Status ON PurchaseOrder REBUILD WITH (ONLINE = ON);",
  project: "This is part of why I check the execution plan's estimated-versus-actual rows before touching indexes — on the high-volume procurement tables a stale statistic produced a plan built for a fraction of the real row count, and no new index would have fixed that.",
  remember: "Stale statistics beat fragmentation as a cause. Reorganize 10–30%, rebuild above 30%, and rebuild refreshes stats."
}

]);
