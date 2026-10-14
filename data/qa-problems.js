/* ============================================================
   Problem statements → answers.

   This is the "describe the symptom, not the term" layer. You type
   what is actually going wrong — "my screen takes 30 seconds to
   load", "click stops working after the grid refreshes" — and it
   finds the answer that solves it.

   Each entry: { p: [ the way someone would phrase it ], id: answer id }
   Add your own freely; they are indexed on load like everything else.
   ============================================================ */
window.QA_PROBLEMS = [

/* ---------- performance ---------- */
{ id: "sql-slow-query", p: [
  "filtering by today on an indexed date column is slow",
  "cast on a date column stops the index being used",
  "my query is running very slow",
  "the screen takes too long to load",
  "report is timing out",
  "page takes 30 seconds to open",
  "database is slow in production but fast in dev",
  "how do i make my sql faster" ] },

{ id: "sql-index", p: [
  "the same query is fast for one user and slow for another on a big table",
  "full table scan in the execution plan",
  "should i add an index to this column",
  "searching a large table is slow" ] },

{ id: "net-ef-tracking", p: [
  "my list page fires hundreds of queries",
  "entity framework is generating too many queries",
  "ef core is slow when loading a list",
  "loading related data is slow",
  "out of memory when loading records" ] },

{ id: "sql-paging", p: [
  "the grid loads fifty thousand rows and freezes",
  "how do i show data page by page",
  "the browser hangs when the result is large" ] },

{ id: "net-cache", p: [
  "the same dropdown data is fetched on every page load",
  "too many repeat queries for master data" ] },

{ id: "cs-collections", p: [
  "the loop inside a loop is very slow",
  "comparing two lists takes forever",
  "validating an uploaded file row by row is slow" ] },

{ id: "cs-string-sb", p: [
  "building a big string in a loop is slow",
  "the application uses a lot of memory while generating a report" ] },

/* ---------- errors and crashes ---------- */
{ id: "sql-deadlock", p: [
  "transaction was deadlocked on lock resources",
  "i am getting a deadlock error",
  "two users saving at the same time causes an error",
  "error 1205" ] },

{ id: "ado-using", p: [
  "timeout expired the timeout period elapsed prior to obtaining a connection from the pool",
  "the application stops connecting to the database after some time",
  "connection pool is full",
  "it works for a while then fails under load" ] },

{ id: "js-null-undefined", p: [
  "cannot read property of undefined",
  "cannot read properties of null" ] },

{ id: "cs-null", p: [
  "object reference not set to an instance of an object",
  "i am getting a null reference exception" ] },

{ id: "ado-dbnull", p: [
  "unable to cast object of type dbnull",
  "error when a column has no value",
  "specified cast is not valid when reading from the database" ] },

{ id: "cs-exception", p: [
  "i lose the original line number when the error is rethrown",
  "the stack trace points to the wrong place",
  "how should i catch and log errors" ] },

{ id: "re-error-boundary", p: [
  "the whole react page goes white when one component fails",
  "blank white screen in react" ] },

{ id: "re-keys", p: [
  "after deleting a row the wrong values appear in the inputs",
  "checkbox ticks jump to a different row after sorting",
  "warning each child in a list should have a unique key" ] },

{ id: "ado-exception", p: [
  "violation of unique key constraint error",
  "the insert fails when the record already exists",
  "foreign key constraint error on delete" ] },

/* ---------- things that stop working ---------- */
{ id: "jq-delegation", p: [
  "the click event stops working after the grid refreshes",
  "button inside ajax loaded content does not work",
  "jquery click not firing on dynamically added rows",
  "the handler works the first time only" ] },

{ id: "jq-ready", p: [
  "my jquery selector returns nothing",
  "the script runs before the element exists" ] },

{ id: "re-useeffect", p: [
  "useeffect runs in an infinite loop",
  "the component keeps re-rendering forever",
  "cannot perform a react state update on an unmounted component",
  "my data loads twice" ] },

{ id: "net-cors", p: [
  "blocked by cors policy no access-control-allow-origin header",
  "the react app cannot call the api on a different port",
  "cors error in the browser console" ] },

{ id: "net-jwt", p: [
  "the api returns 401 even though i am logged in",
  "my token stops working after some time",
  "how do i secure my api endpoints" ] },

{ id: "net-authn-authz", p: [
  "a user can see another user's records by changing the id in the url",
  "the api returns 403 instead of the data",
  "how do i restrict a screen to one role" ] },

{ id: "net-claims", p: [
  "how do i filter data so each customer only sees their own",
  "where should i store the tenant or vendor code for the logged in user" ] },

{ id: "net-di-lifetime", p: [
  "cannot consume scoped service from singleton",
  "a second operation was started on this context before a previous operation completed",
  "dbcontext is not thread safe error" ] },

{ id: "net-pipeline", p: [
  "my authorize attribute is being ignored",
  "the user is always anonymous even after login",
  "middleware is not running in the order i expect" ] },

{ id: "re-forms", p: [
  "my input will not let me type",
  "the textbox value does not change in react",
  "a component is changing an uncontrolled input to be controlled" ] },

{ id: "js-promise", p: [
  "my function returns a promise instead of the value",
  "the data is undefined right after the api call",
  "code runs before the api response arrives" ] },

{ id: "js-this", p: [
  "this is undefined inside my function",
  "this refers to the wrong object in the callback" ] },

{ id: "re-rerender", p: [
  "my component does not update when the array changes",
  "the ui does not refresh after i change the state",
  "pushing to an array in state does nothing" ] },

/* ---------- data and files ---------- */
{ id: "ado-bulk", p: [
  "inserting ten thousand rows takes several minutes",
  "the excel upload is very slow",
  "how do i insert many rows at once" ] },

{ id: "net-fileupload", p: [
  "large file upload fails",
  "the request exceeded the maximum allowed size",
  "how do i validate an uploaded excel file" ] },

{ id: "sql-duplicates", p: [
  "there are duplicate records in the table",
  "how do i remove duplicates but keep one",
  "the same vendor was created twice" ] },

{ id: "sql-transaction", p: [
  "the header saved but the line items did not",
  "how do i make sure all the inserts succeed together",
  "partial data was saved when an error happened" ] },

{ id: "az-idempotent", p: [
  "the same invoice was posted twice",
  "the background job ran twice and duplicated the data",
  "how do i stop a retry from duplicating a record" ] },

{ id: "net-hangfire", p: [
  "the request times out because the task takes too long",
  "the user has to wait while a long process runs",
  "how do i run something on a schedule",
  "the background job stops when the site is idle" ] },

{ id: "net-signalr", p: [
  "the user cannot see the progress of a long running job",
  "the page has to keep refreshing to check status",
  "how do i push an update to the browser" ] },

{ id: "net-session-state", p: [
  "users get logged out when we add a second server",
  "how do we share session across multiple servers",
  "session is lost after an app pool recycle" ] },

/* ---------- security ---------- */
{ id: "ado-injection", p: [
  "the security audit found sql injection",
  "vapt report says sql injection",
  "how do i fix a concatenated sql query" ] },

{ id: "net-owasp", p: [
  "the penetration test found xss",
  "the security team raised csrf findings",
  "how do i fix owasp top 10 issues",
  "script tags in user input are executing" ] },

{ id: "ado-connstring", p: [
  "the audit flagged a plain text connection string",
  "password is visible in the config file",
  "where should i keep the database password" ] },

/* ---------- design and process ---------- */
{ id: "sol-ocp", p: [
  "my switch statement keeps growing every time they add a type",
  "every new requirement means editing the same class",
  "adding a new document type breaks the existing code" ] },

{ id: "sol-srp", p: [
  "my class is two thousand lines long",
  "one change breaks three other features",
  "the controller has all the business logic in it" ] },

{ id: "sol-dip", p: [
  "my code is hard to test because it talks to the database directly",
  "i cannot mock this class in a test",
  "everything is tightly coupled" ] },

{ id: "net-viewmodel-dto", p: [
  "internal columns are showing up in my api response",
  "the user can set fields they should not be able to",
  "over posting vulnerability" ] },

{ id: "net-efcore-migrations", p: [
  "how do i change the database schema safely in production",
  "i need to undo a database change after release",
  "how do i apply schema changes to uat and prod" ] },

{ id: "net-iis", p: [
  "the site works locally but not after deployment",
  "how do i deploy without downtime",
  "the files are locked when i try to publish" ] },

{ id: "ado-vs-ef", p: [
  "should i use entity framework or write the sql myself",
  "ef is generating bad sql for my report" ] },

{ id: "ms-when-not", p: [
  "should we split our application into microservices",
  "is our monolith a problem" ] },

{ id: "ms-resilience", p: [
  "the third party api goes down and takes our site with it",
  "how do i retry a failing http call",
  "one slow integration makes the whole app slow" ] },

{ id: "sol-testing", p: [
  "they asked if i write unit tests and i do not",
  "how do i answer a question about testing honestly" ] },

{ id: "hr-gaps", p: [
  "they are asking about a technology i have never used",
  "how do i answer when i do not know something",
  "should i bluff in an interview" ] }

];
