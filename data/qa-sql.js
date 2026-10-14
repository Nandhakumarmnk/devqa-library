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
  tags: ["query optimization", "slow query", "performance tuning", "execution plan", "tuning"],
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
}

]);
