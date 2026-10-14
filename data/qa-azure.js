/* Azure, Azure Functions and DevOps pack
   Honest framing: Nandhakumar's production background is IIS + Hangfire + Azure DevOps.
   Each answer explains the Azure concept correctly, then maps it to what he has really built. */
window.QA = (window.QA || []).concat([

{
  id: "az-functions", topic: "azure", star: true,
  q: "What are Azure Functions? (serverless)",
  tags: ["azure functions", "serverless", "function app", "what is azure functions"],
  simple: "An Azure Function is a small piece of code that runs when something triggers it — a web request, a timer, a message on a queue. You do not manage a server, and you pay only while it runs.",
  answer: "Azure Functions is the serverless compute service. Each function is a method decorated with a trigger; the platform handles hosting, scaling and the runtime. A Function App is the deployment and configuration unit, and the modern .NET model is the **isolated worker**, which runs on its own process and lets me use the current .NET version independently of the host.\nIt suits event-driven work: scheduled jobs, queue processing, file-drop handling, webhooks, lightweight APIs and glue between systems.\nIt suits long-running, stateful or constantly busy workloads less well — those belong in an App Service or a container. Cold start, the execution time limit on the Consumption plan, and the need for idempotent handlers are the three practical constraints I would plan around.",
  code: "[Function(\"SyncVendors\")]\npublic async Task Run([TimerTrigger(\"0 */15 * * * *\")] TimerInfo timer)\n{\n    _log.LogInformation(\"Vendor sync started at {Time}\", DateTime.UtcNow);\n    await _sync.RunAsync();\n}",
  project: "To be straight about it: my production background-job experience is Hangfire on IIS, not Azure Functions — I built the SAP Synchronization Services that way, with recurring jobs, retries, failure alerts and a monitoring dashboard. The design concerns are the same ones Functions are built around: triggers on a schedule, idempotent handlers, retry on transient failure, and alerting when a job keeps failing. Moving those jobs to Timer- and Queue-triggered Functions would be a hosting change rather than a redesign.",
  remember: "Trigger-driven, pay per execution, no server to manage. Handlers must be idempotent."
},

{
  id: "az-triggers", topic: "azure", star: true,
  q: "What triggers and bindings does Azure Functions support?",
  tags: ["trigger", "binding", "http trigger", "timer trigger", "queue trigger", "blob trigger"],
  simple: "A trigger is what starts the function. A binding is a shortcut for reading from or writing to a service without writing the connection code.",
  answer: "One trigger per function, plus any number of input/output bindings.\nCommon triggers:\n- **HTTP** — an API endpoint or webhook.\n- **Timer** — CRON schedule, for example `0 */15 * * * *` for every 15 minutes.\n- **Queue / Service Bus** — process a message, with automatic retry and a poison queue after repeated failures.\n- **Blob / Event Grid** — react to a file landing in storage.\n- **Cosmos DB change feed**, **Event Hub** for streaming.\nBindings remove boilerplate: an output binding can write to a queue or table without me creating a client. The trade-off is that bindings are declarative and a little harder to unit test than an injected service, so for complex logic I inject a client instead.",
  code: "[Function(\"ProcessInvoice\")]\n[QueueOutput(\"invoice-failed\")]\npublic async Task<string> Run(\n    [QueueTrigger(\"invoice-in\")] InvoiceMessage msg)\n{\n    var ok = await _poster.PostAsync(msg);\n    return ok ? null : JsonSerializer.Serialize(msg);   // route failures onward\n}",
  project: "The equivalents in my work are the Hangfire recurring job (timer trigger), the Excel bulk upload that reacts to an uploaded file (blob trigger), and the SAP sync queue of pending documents (queue trigger). The design is the same — a message per document, retry on transient failure, and a dead-letter path for the ones that keep failing so they are inspected rather than lost.",
  remember: "One trigger per function; bindings save the plumbing code."
},

{
  id: "az-plans", topic: "azure",
  q: "Consumption vs Premium vs App Service plan (and cold start)",
  tags: ["consumption plan", "premium plan", "cold start", "function hosting plan", "scaling functions"],
  simple: "Consumption is cheapest and scales to zero, but a sleeping function takes a moment to wake up. Premium keeps instances warm. App Service plan runs on servers you already pay for.",
  answer: "- **Consumption** — pay per execution and GB-second, scales to zero, around a 5-minute default timeout (10 max). The downside is **cold start**: after an idle period the platform has to spin up a host and load the app, so the first call is slow. That matters for a user-facing API, not for a nightly job.\n- **Premium (Elastic)** — pre-warmed instances so no cold start, VNet integration, longer or unlimited run time. The usual answer when the function must respond fast and reach private resources.\n- **Dedicated / App Service plan** — runs on your existing plan with predictable cost, useful when you already have capacity.\nCold start is reduced by keeping the package small, avoiding heavy startup work, using the isolated worker sensibly and, where cost allows, Premium with always-ready instances.",
  remember: "Consumption = cheap + cold start. Premium = warm + VNet. Dedicated = predictable cost."
},

{
  id: "az-durable", topic: "azure",
  q: "What are Durable Functions?",
  tags: ["durable functions", "orchestrator", "fan out fan in", "stateful workflow", "activity function"],
  simple: "Normal functions are stateless and independent. Durable Functions let you write a workflow in code — do step one, wait, then step two — and the platform remembers where it got to.",
  answer: "An **orchestrator** function calls **activity** functions and awaits them. The framework replays the orchestrator and uses an event-sourced history to resume after a restart, so the workflow survives process recycles.\nPatterns:\n- **Chaining** — sequential steps.\n- **Fan-out / fan-in** — run many activities in parallel and aggregate.\n- **Async HTTP API** — kick off work and poll a status endpoint.\n- **Human interaction** — wait for an external approval event with a timeout.\nOrchestrator code must be deterministic: no `DateTime.Now`, no random values, no direct I/O — use the context equivalents, because the function body is replayed.",
  code: "[Function(\"SyncOrchestrator\")]\npublic async Task Run([OrchestrationTrigger] TaskOrchestrationContext ctx)\n{\n    var ids   = await ctx.CallActivityAsync<int[]>(\"GetPendingDocs\", null);\n    var tasks = ids.Select(id => ctx.CallActivityAsync(\"PostToSap\", id));\n    await Task.WhenAll(tasks);                    // fan-out / fan-in\n    await ctx.CallActivityAsync(\"NotifyComplete\", ids.Length);\n}",
  project: "The approval workflow in the procurement system is the same problem solved differently — multi-step, long-running, waiting on a human decision — but implemented with database status plus Hangfire jobs rather than Durable Functions. That is a fair comparison to draw in an interview: the pattern is familiar, the Azure implementation of it is what I would be picking up.",
  remember: "Orchestrator + activities, replayed from history. Orchestrator code must be deterministic."
},

{
  id: "az-vs-hangfire", topic: "azure", star: true,
  q: "Azure Functions vs Hangfire vs Windows Service — which would you choose?",
  tags: ["azure functions vs hangfire", "background job hosting", "webjob", "windows service", "scheduler"],
  simple: "Hangfire runs inside your own app on your own server. Azure Functions runs in the cloud and scales by itself. Pick by where the app is hosted and how much the job must scale.",
  answer: "- **Hangfire** — jobs persisted in SQL Server, a dashboard, retries, recurring CRON jobs, running inside the application or a companion process. Perfect on-premise or on IIS, and it keeps everything in one deployment. The catch under IIS is that the app pool must not idle out, and you scale by adding servers yourself.\n- **Azure Functions** — serverless, scales automatically with the queue depth, pay per execution, and integrates natively with Azure Storage, Service Bus and Event Grid. Best when the workload is bursty and the platform is already in Azure.\n- **Windows Service / BackgroundService** — a long-running process you own; fine for steady on-premise work, but you build the scheduling, retry and monitoring yourself.\nMy decision rule: on-prem or IIS-hosted app with modest, steady background work → Hangfire. Azure-hosted, bursty, event-driven work → Functions with a queue.",
  project: "I chose Hangfire for SAP Synchronization Services because the platform runs on IIS and Windows Server, the sync had to be near real-time and resumable, and SQL Server persistence meant a queued job survived an app pool recycle. The dashboard also gave the team visibility into failures without me writing a monitoring UI. If that estate moves to Azure, the natural target is Queue- and Timer-triggered Functions, and the handlers would transfer because they are already idempotent and retry-safe.",
  remember: "Hangfire = your server, your app. Functions = cloud, auto-scale, per-execution billing."
},

{
  id: "az-idempotent", topic: "azure", star: true,
  q: "How do you make a background job or message handler reliable?",
  tags: ["idempotency", "retry", "poison queue", "dead letter", "at least once delivery", "exactly once"],
  simple: "Assume the same message will arrive twice and that any step can fail halfway. Make running it twice harmless, retry the temporary failures, and park the ones that never succeed.",
  answer: "Queues give **at-least-once** delivery, so duplicates are a certainty, not an edge case. The protections:\n- **Idempotency** — key the operation on a business id and check whether it has already been processed, or use an upsert, so a repeat is a no-op.\n- **Retry with backoff** for transient faults (network, timeout, deadlock), and a cap so it does not loop forever.\n- **Poison queue / dead letter** after N attempts, plus an alert — a message that fails silently forever is worse than one that fails loudly.\n- **Transactional boundaries** — do the database work in one transaction, and record the processed marker in the same transaction.\n- **Monitoring** — queue depth, failure count and age of the oldest message.\nThe honest framing is that exactly-once delivery does not really exist; you get at-least-once delivery plus idempotent handlers.",
  project: "That is exactly how the SAP sync is built. Handlers are keyed on the document id so a retry cannot post the same invoice twice, transient failures retry automatically, and repeated failures raise an alert for someone to look at rather than disappearing. That design is what removed the manual reconciliation work between the two systems.",
  remember: "At-least-once delivery + idempotent handler + retry + dead letter + alert."
},

{
  id: "az-devops", topic: "azure", star: true,
  q: "How does a CI/CD pipeline work in Azure DevOps?",
  tags: ["azure devops", "ci cd", "pipeline", "build release", "yaml pipeline", "deployment automation"],
  simple: "CI builds and tests the code every time someone pushes. CD takes that build and deploys it — to Dev automatically, and to UAT and Production with approval.",
  answer: "A **build (CI)** pipeline restores, builds, runs tests and publishes an artifact — for a .NET app usually the publish output plus the EF migration script. A **release (CD)** pipeline takes that artifact through environments, each with its own variables and approval gates.\nA typical .NET stage order: build → test → publish artifact → deploy to Dev → approval → UAT → approval and a change window → Production, with database scripts applied before the application files and a smoke test after.\nPractices that matter: the same artifact is promoted through every environment (never rebuilt per environment), secrets come from variable groups or Key Vault rather than the YAML, and every deployment has a rollback path — the previous artifact plus the rollback SQL script.",
  code: "trigger: [ main ]\nsteps:\n  - task: DotNetCoreCLI@2\n    inputs: { command: build, arguments: '--configuration Release' }\n  - task: DotNetCoreCLI@2\n    inputs: { command: test }\n  - task: DotNetCoreCLI@2\n    inputs: { command: publish, publishWebProjects: true, zipAfterPublish: true }\n  - publish: $(Build.ArtifactStagingDirectory)\n    artifact: drop",
  project: "We use Azure DevOps, TFS and Git for source control and work tracking, and my release work is the deployment end of this: EF Core migrations and SQL scripts with matching rollback scripts, IIS deployment in scheduled off-peak windows, post-deployment validation, and support for QA, UAT and business teams after go-live. The principle I bring is that a release is only ready when its rollback has been tested too.",
  remember: "Build once, promote the same artifact, approvals per environment, rollback ready."
},

{
  id: "az-git", topic: "azure", star: true,
  q: "What Git branching strategy do you follow?",
  tags: ["git", "branching strategy", "pull request", "merge vs rebase", "git flow", "feature branch"],
  simple: "Main always holds releasable code. Work happens on short-lived feature branches that merge back through a pull request after review.",
  answer: "I use a feature-branch workflow: `main` (or `master`) is protected and releasable, `develop` or a release branch where the team needs a staging line, `feature/*` per task, `hotfix/*` for production fixes that go straight to main and are merged back.\nPull requests are the review gate — at least one reviewer, the build passing, and no direct pushes to main.\nMerge vs rebase: rebase my own feature branch to keep history linear before raising the PR, merge into main (never rewrite shared history). Conflicts are resolved on the feature branch, not on main.\nCommits should be small with messages that say why, and work items linked so a change can be traced back to a requirement.",
  code: "git checkout -b feature/vendor-bank-details\ngit commit -m \"Add vendor bank detail validation\"\ngit fetch origin && git rebase origin/main\ngit push -u origin feature/vendor-bank-details   # then raise the PR",
  project: "As Technical Lead I run the review side of this for the team — reviewing pull requests, breaking work into tasks that fit a branch, and keeping main deployable. We work in Git and Azure DevOps, with some older repositories still on TFS.",
  remember: "Short-lived branches, PR review, protected main, rebase your own work only."
},

{
  id: "az-appservice", topic: "azure",
  q: "Azure App Service vs Virtual Machine vs Container",
  tags: ["app service", "azure vm", "containers", "aks", "paas vs iaas", "hosting options"],
  simple: "App Service hosts your web app and Microsoft looks after the server. A VM is a machine you own and patch. Containers package the app with everything it needs.",
  answer: "- **App Service (PaaS)** — deploy the app, get scaling, SSL, slots and patching handled. Deployment slots give zero-downtime releases by warming up a staging slot and swapping.\n- **VM (IaaS)** — full control over the OS, needed for software that must be installed on the machine; you own patching, backup and security.\n- **Containers (App Service for Containers, Container Apps, AKS)** — consistent environment from dev to production, independent scaling per service, at the cost of orchestration complexity. AKS is only worth it with enough services to justify it.\nFor a typical .NET web app I would start with App Service plus Azure SQL, and move to containers when the deployment story genuinely needs it.",
  project: "Our platform is hosted on IIS on Windows Server — I manage the hosting, SSL setup and release windows. The closest equivalent of a deployment slot in that world is a pre-tested release with app_offline and a rehearsed rollback, which is how we deploy without unplanned downtime.",
  remember: "App Service for normal web apps, VM for full control, containers when you need portability."
},

{
  id: "az-sql", topic: "azure",
  q: "Azure SQL Database vs SQL Server on a VM",
  tags: ["azure sql", "managed instance", "dtu vtcore", "paas database", "sql on vm"],
  simple: "Azure SQL is a managed database — backups, patching and high availability come with it. SQL Server on a VM is the same product you run on-premise, with you doing the administration.",
  answer: "- **Azure SQL Database** — single database or elastic pool, automatic backups with point-in-time restore, built-in HA, scaling by DTU or vCore. Some surface is unavailable (SQL Agent, cross-database queries, filesystem access), so a lift-and-shift may need changes.\n- **SQL Managed Instance** — near-full SQL Server compatibility including SQL Agent, intended for migrations that cannot be rewritten.\n- **SQL Server on a VM** — full control, full feature set, full responsibility for patching, backup and HA.\nFor a migration I would assess with the Data Migration Assistant first: if the app depends on Agent jobs, linked servers or cross-database queries, Managed Instance; otherwise Azure SQL.\nThe T-SQL skills transfer directly — indexing, execution plans and query tuning are identical, and in a pay-per-performance tier tuning literally reduces the bill.",
  project: "Our databases are SQL Server on Windows Server, and I handle the schema design, T-SQL tuning, migration scripts, backup/restore and environment refreshes with data masking. Those are the same tasks on Azure SQL minus the infrastructure work, which is the honest way to describe the overlap.",
  remember: "Azure SQL = managed, some features missing. Managed Instance = compatibility. VM = full control."
},

{
  id: "az-queue-servicebus", topic: "azure",
  q: "Azure Storage Queue vs Service Bus",
  tags: ["service bus", "storage queue", "message queue", "topic subscription", "pub sub"],
  simple: "Storage Queue is a simple, cheap queue. Service Bus is the enterprise one — ordering, transactions, topics with multiple subscribers, and dead-letter handling.",
  answer: "**Storage Queue** — basic, very cheap, at-least-once, up to 64 KB messages, no ordering guarantee. Fine for simple work dispatch.\n**Service Bus** — sessions for FIFO ordering, transactions, duplicate detection, scheduled delivery, built-in dead-letter queues, and **topics/subscriptions** for publish-subscribe where several consumers each get a copy.\nChoose Service Bus when order matters, when several systems must react to the same event, or when you need dead-lettering and duplicate detection as platform features rather than your own code.\nEither way the consumer must still be idempotent.",
  project: "The sync between our platform and SAP is the same shape as a queue consumer — pending documents picked up, processed, retried on failure, and parked for inspection after repeated failures. We implemented that with a status-driven table and Hangfire rather than a broker, which is the on-premise way to get the same guarantees.",
  remember: "Storage Queue = simple and cheap. Service Bus = ordering, topics, dead letter."
},

{
  id: "az-keyvault", topic: "azure", star: true,
  q: "How do you keep secrets out of the application? (Key Vault, managed identity)",
  tags: ["key vault", "managed identity", "secrets", "connection string security", "configuration secrets"],
  simple: "Passwords and connection strings should never sit in source control. Store them in a vault, and let the app prove who it is instead of carrying another password.",
  answer: "**Key Vault** holds secrets, keys and certificates with access policies and audit logging, and supports rotation.\n**Managed identity** gives the App Service or Function App an Azure AD identity, so it reads the vault with no credential stored anywhere — which removes the bootstrap problem of needing a secret to fetch your secrets.\nIn .NET this plugs into the configuration system, so `Configuration[\"Sap:Password\"]` resolves from the vault with no code change at the usage site.\nOutside Azure the equivalent discipline is the same: secrets in environment variables or a protected config on the server, never in the repository, different values per environment, and rotation when someone leaves.",
  code: "builder.Configuration.AddAzureKeyVault(\n    new Uri($\"https://{vaultName}.vault.azure.net/\"),\n    new DefaultAzureCredential());      // managed identity in Azure, dev credentials locally",
  project: "Hard-coded credentials and connection strings in source were one of the categories I had to clean up during the security remediation work — it is a finding in its own right, not just bad practice. On our estate the fix was environment-specific configuration held on the server rather than in the repo, which is the same principle a vault enforces properly.",
  remember: "No secrets in source. Managed identity means no credential to store at all."
},

{
  id: "az-monitoring", topic: "azure",
  q: "How do you monitor an application in Azure? (Application Insights)",
  tags: ["application insights", "monitoring", "telemetry", "alerts", "log analytics", "observability"],
  simple: "Application Insights collects requests, failures, dependency calls and custom events, so you can see what is slow or failing without adding your own logging infrastructure.",
  answer: "Application Insights gives request rates and durations, failure rates, dependency timings (SQL, HTTP), exceptions with stack traces, and live metrics. Distributed tracing follows one operation id across services, which is what makes a failure in a chain of services diagnosable.\nI would set alerts on the things that mean something to users: failure rate above a threshold, p95 response time, and queue depth or job failure count for background work. Logs go to Log Analytics and are queried with KQL.\nThe same rule as any logging applies — no secrets or personal data in telemetry, and sampling configured so the bill stays sane on a busy app.",
  project: "On our platform the equivalent stack is ELMAH and log4net for application errors plus IIS and SQL Server monitoring, and that is my first stop when business reports an issue. The practice carries over directly — structured logs, a correlation id per request, and alerting on failures rather than waiting for a user to phone.",
  remember: "Requests, dependencies, exceptions, traces — and alert on what users feel."
},

{
  id: "az-scaling", topic: "azure",
  q: "Scale up vs scale out, and how does autoscaling work?",
  tags: ["scale up vs scale out", "autoscale", "horizontal scaling", "load balancer", "stateless app"],
  simple: "Scale up means a bigger machine. Scale out means more machines. Scaling out is what gives real resilience, but your app has to be stateless for it to work.",
  answer: "**Scale up (vertical)** — more CPU/RAM on one instance. Simple, but there is a ceiling and usually a restart.\n**Scale out (horizontal)** — more instances behind a load balancer. Better availability and nearly unlimited headroom, and in Azure you autoscale on a metric like CPU, queue length or request count with a cool-down period.\nFor scale-out to work the app must be stateless: no in-process session (use Redis or SQL), no in-memory cache assumed to be shared, no writing to the local disk, and background jobs must not run duplicated on every instance unless they are idempotent or leader-elected.\nThat last point is the one people forget — a recurring job deployed to three instances runs three times.",
  project: "This is a real constraint in our IIS environment too: with multiple worker processes an in-memory cache is per process and a Hangfire recurring job must not double-post. That is why the SAP sync handlers claim work through a database status flag — the same discipline any scaled-out cloud deployment needs.",
  remember: "Scale out needs a stateless app: no local session, no local files, no duplicated jobs."
},

{
  id: "az-migrate", topic: "azure",
  q: "How would you move an on-premise .NET application to Azure?",
  tags: ["azure migration", "lift and shift", "cloud migration", "modernization", "on prem to cloud"],
  simple: "Move it in stages. Lift the database and the app first with as few code changes as possible, then modernise the pieces that benefit — background jobs, files, secrets, monitoring.",
  answer: "My plan would be:\n1. **Assess** — .NET version, Windows-only dependencies, SQL features in use (Agent jobs, linked servers), file-system usage, integrations that must stay on-premise.\n2. **Database first** — Data Migration Assistant to decide Azure SQL vs Managed Instance, then migrate with a rehearsed cutover.\n3. **App** — App Service for a .NET 8 web app; for .NET Framework 4.8 either App Service on Windows or a VM while it is modernised.\n4. **Replace the server-bound pieces** — local file storage to Blob Storage, scheduled jobs to Functions or WebJobs, secrets to Key Vault, logging to Application Insights.\n5. **Connectivity** — VPN or private endpoints where the app must still reach on-premise systems such as SAP.\n6. **Cut over** with a pilot, a rollback path and a parallel run before switching DNS.\nThe honest closing line: I would do this with the same discipline I already apply to releases — rehearsed, reversible, validated after the fact.",
  project: "I have not run a full Azure migration; our platform is hosted on IIS and Windows Server, and my cloud exposure is Azure DevOps for source control and pipelines. What transfers is the release discipline — staged rollouts, tested rollback scripts, environment refreshes, and post-deployment validation — which is most of what makes a migration cutover survivable.",
  remember: "Assess, database, app, then modernise the server-bound parts. Always with a rollback."
},

{
  id: "az-blob", topic: "azure",
  q: "Azure Blob Storage — what is it and how do you use it from .NET?",
  tags: ["blob storage", "file storage azure", "sas token", "containers blob", "upload file azure"],
  simple: "Blob Storage keeps files — documents, images, backups — outside the application, so any instance can reach them and the server disk never fills up.",
  answer: "Blobs live in containers inside a storage account, with tiers (Hot, Cool, Archive) that trade retrieval cost against storage cost. From .NET I use `BlobServiceClient`/`BlobContainerClient` to upload and download streams.\nThings I would get right:\n- **SAS tokens** for time-limited, scoped access so the browser can upload or download directly without the file passing through the API.\n- Never expose the account key; prefer managed identity.\n- Generate the stored file name instead of trusting the user's name, and keep the original name as metadata.\n- Lifecycle rules to move old documents to cool or archive automatically.",
  code: "var container = new BlobContainerClient(conn, \"vendor-docs\");\nawait container.UploadBlobAsync($\"{vendorId}/{Guid.NewGuid():N}.pdf\", stream);",
  project: "The Vendor Portal handles document upload for registration and onboarding, stored outside the web root with generated names and type/size validation — the same rules apply whether the destination is a server folder or a blob container. Moving that storage to blobs is one of the clearer wins if the platform ever goes to Azure, because it removes the shared-folder constraint on scaling out.",
  remember: "Files belong outside the app. SAS tokens for direct access, never the account key."
},

{
  id: "az-aad", topic: "azure",
  q: "What is Azure AD / Entra ID authentication?",
  tags: ["azure ad", "entra id", "oauth", "openid connect", "sso", "single sign on"],
  simple: "Azure AD is Microsoft's identity service. Instead of your app storing passwords, the user signs in with their work account and your app receives a token saying who they are.",
  answer: "Azure AD (Entra ID) implements OAuth 2.0 and OpenID Connect. The app is registered, the user is redirected to sign in, and the app receives an ID token (who the user is) and an access token (what they may call). `Microsoft.Identity.Web` wires this into ASP.NET Core with a few lines.\nBenefits: single sign-on across Microsoft 365 and line-of-business apps, MFA and conditional access enforced centrally, no password storage in the application, and groups or app roles mapped to claims for authorisation.\nConceptually it is the same claims-based model as the JWT work I do — the difference is the token is issued by Azure AD rather than my own login endpoint, and validated against its published signing keys.",
  project: "Our applications use ASP.NET Identity with role-based access and JWT for the portal APIs rather than Azure AD. The model is the same — validate a signed token, build the ClaimsPrincipal, enforce roles with `[Authorize]` — so I would describe Azure AD as a change of issuer, not a change of pattern.",
  remember: "Azure AD issues the token; your API validates it and reads the claims — same model as your own JWT."
},

{
  id: "az-tfs", topic: "azure",
  q: "TFS vs Git — have you worked with both?",
  tags: ["tfs", "tfvc", "team foundation server", "tfs vs git", "centralised vs distributed", "migrate tfs to git"],
  simple: "TFS is the older Microsoft system where the server holds the one true copy and you check files out. Git gives every developer a full copy of the history and you work on branches. Both exist in our estate.",
  answer: "**TFVC (the version control in TFS)** is centralised: one server copy, files checked out, changesets numbered in sequence, and branching is heavy enough that teams avoid it. It also needs the server to be reachable for most operations.\n**Git** is distributed: every clone has the whole history, commits are local, branching is cheap and therefore routine, and merges happen constantly rather than being events.\nThe practical differences that matter day to day: Git lets me commit while offline and rewrite my own local history before sharing it; TFVC gives simpler locking for large binary files and a single authoritative sequence.\nAzure DevOps hosts both, so the work-item tracking, boards and pipelines are the same either way — only the version control differs.\n**Migrating TFVC to Git**: `git-tfs` or the Azure DevOps import can bring history across, though in practice teams often import a limited history and keep the old TFVC repo read-only for archaeology. The harder part is not the tooling — it is retraining people out of checkout-and-lock and into branch-and-merge.",
  code: "git checkout -b feature/vendor-bank-details\ngit commit -m \"Add vendor bank detail validation\"   # works offline\ngit fetch origin && git rebase origin/main\ngit push -u origin feature/vendor-bank-details",
  project: "We work in Git and Azure DevOps, with some older repositories still on TFS. Being comfortable in both is normal in enterprise .NET — a lot of long-lived systems have a TFVC history behind them, and new work goes into Git.",
  remember: "TFVC = central, checkout, heavy branching. Git = distributed, cheap branches, offline commits."
}

]);
