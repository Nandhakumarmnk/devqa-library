/* Microservices and distributed systems pack
   Honest framing: his platform is a multi-module enterprise application with a separate
   API layer and a separate SAP sync service — not a full microservices estate. */
window.QA = (window.QA || []).concat([

{
  id: "ms-what", topic: "microservices", star: true,
  q: "What are microservices? Monolith vs microservices",
  tags: ["microservices", "monolith vs microservices", "what is microservices", "service oriented"],
  simple: "A monolith is one application holding every module. Microservices split it into small services that are deployed, scaled and owned separately, and talk to each other over the network.",
  answer: "A microservice owns one business capability, has its own deployment pipeline and usually its own data store, and is independently scalable and replaceable.\n**Benefits**: deploy one service without redeploying everything, scale only the hot service, teams work in parallel, and a failure can be contained.\n**Costs**: network calls instead of method calls, distributed transactions and eventual consistency, harder debugging, more infrastructure (gateway, discovery, tracing, CI/CD per service) and a real operational burden.\nThe mature answer is that microservices trade simplicity for independence. They pay off with multiple teams and genuinely different scaling or release needs; for a single team they mostly add overhead, and a well-structured modular monolith is often the better engineering decision.",
  project: "I want to be accurate about my own experience: the platform I work on is a multi-module enterprise application — procurement, inventory and supply chain modules behind a shared RESTful Web API layer, with SAP Synchronization Services running as a separate service. So I have built service-oriented, API-first components and a separately deployed integration service, rather than a full microservices estate with independent databases per service. The patterns I have applied directly are API versioning, JWT-based service security, background workers with retry and idempotent handlers, and keeping module boundaries clean inside the solution.",
  remember: "Microservices buy independence and pay with distributed-system complexity."
},

{
  id: "ms-communication", topic: "microservices", star: true,
  q: "How do microservices communicate with each other?",
  tags: ["service communication", "sync vs async", "rest grpc", "message queue", "event driven"],
  simple: "Either one service calls another directly and waits (synchronous), or it drops a message on a queue and carries on (asynchronous). Waiting is simpler; messaging is more resilient.",
  answer: "**Synchronous** — REST over HTTP, or gRPC where performance and a strict contract matter. Simple and easy to reason about, but it couples availability: if B is down, A fails, and a chain of calls multiplies latency and failure probability.\n**Asynchronous** — publish an event or queue a command through a broker (Service Bus, RabbitMQ, Kafka). The caller does not wait, the consumer can be down temporarily and catch up, and several consumers can react to the same event. The cost is eventual consistency and the need for idempotent consumers.\nMy rule: synchronous when the caller genuinely needs the answer to continue (a price, a validation); asynchronous for everything that is a notification or a downstream side effect — send the mail, sync to SAP, rebuild the report.",
  project: "That split is exactly what we do between the platform and SAP. The user-facing screens call our own APIs synchronously because the user is waiting for the answer; posting documents to SAP goes through a queued background job, because SAP being briefly unavailable must not block someone from saving an invoice. That decision is what made the integration reliable enough to remove manual reconciliation.",
  remember: "Synchronous when the caller needs the answer now. Asynchronous for everything else."
},

{
  id: "ms-gateway", topic: "microservices",
  q: "What is an API Gateway?",
  tags: ["api gateway", "bff", "ocelot", "yarp", "reverse proxy", "single entry point"],
  simple: "One front door for all the services. The client calls the gateway, and the gateway routes to the right service behind it.",
  answer: "The gateway is a single entry point that handles routing, authentication, rate limiting, request aggregation, caching and SSL termination, so each service does not reimplement them. Clients then know one address instead of ten, and services can move or be renamed behind it.\nIn .NET the common choices are YARP or Ocelot; cloud equivalents are Azure API Management or an ingress controller.\nA **Backend-for-Frontend** is a variation: a gateway tailored per client (web, mobile) that aggregates exactly what that UI needs in one call, instead of the UI making six.\nThe caution is that a gateway is a single point of failure and can grow into a monolith of its own if business logic creeps into it — it should route and enforce cross-cutting concerns, nothing more.",
  project: "We do not run a gateway product, but the Web API layer plays a comparable role for us: one versioned, Swagger-documented API surface in front of the procurement and vendor modules, with JWT authentication and role checks applied centrally rather than per module. The React portal and the MVC screens both consume that single surface.",
  remember: "One front door: routing, auth, rate limiting. Keep business logic out of it."
},

{
  id: "ms-resilience", topic: "microservices", star: true,
  q: "Retry, timeout and circuit breaker — how do you make service calls resilient?",
  tags: ["circuit breaker", "retry policy", "polly", "timeout", "resilience", "fault tolerance", "bulkhead"],
  simple: "A remote call will fail sometimes. Retry the temporary failures, give up quickly when the other side is clearly down, and stop hammering it until it recovers.",
  answer: "The core patterns, all available in .NET through Polly or the built-in resilience handler:\n- **Timeout** — never wait indefinitely; a hanging call holds a connection and cascades.\n- **Retry with exponential backoff and jitter** — for transient faults only, and only for idempotent operations. Retrying a payment that actually succeeded is worse than failing.\n- **Circuit breaker** — after N consecutive failures, open the circuit and fail fast for a cooling period, then half-open to test one call. This protects the struggling service from being flooded and keeps the caller's threads free.\n- **Fallback** — serve cached or degraded data instead of an error where the business allows it.\n- **Bulkhead** — isolate resources per dependency so one slow integration cannot consume every thread.\nTogether these stop one failing dependency taking down the whole application.",
  code: "builder.Services.AddHttpClient<ISapClient, SapClient>()\n    .AddStandardResilienceHandler();     // timeout + retry + circuit breaker",
  project: "The SAP integration has the same needs and solves them at the job level — transient failures retry automatically with alerting when they persist, so a SAP outage delays the sync instead of failing the user's save. If SAP is down for a long period, the pending documents simply queue and drain when it comes back, which is the same outcome a circuit breaker plus a queue gives you.",
  remember: "Timeout, retry transient only, circuit breaker to fail fast, fallback where the business allows."
},

{
  id: "ms-database", topic: "microservices", star: true,
  q: "Database per service — how do you handle data across services?",
  tags: ["database per service", "shared database", "data consistency", "eventual consistency", "join across services"],
  simple: "Each service ideally owns its own data, and nobody reads another service's tables directly. The hard part is that you can no longer write a join across them.",
  answer: "Database per service keeps a service independently deployable — schema changes do not ripple outward. The consequences:\n- **No cross-service joins.** You either call the owning service, or keep a local read-only copy of the few fields you need, kept current by events.\n- **No distributed ACID transaction.** You get eventual consistency and compensating actions instead.\n- **Duplicated reference data** is accepted deliberately — each service holds the slice it needs.\nA shared database is the anti-pattern that quietly turns microservices back into a monolith with extra latency, because now every service is coupled to one schema and no one can change a table safely.\nThe honest caveat: this is also the single biggest reason a small team should think twice before splitting at all.",
  project: "Our modules share one SQL Server database, which is normal and appropriate for a modular enterprise application — the boundaries we enforce are at the code and API layer rather than at the data layer. The one place a genuine boundary exists is SAP: two systems, two data stores, no shared transaction, synchronised asynchronously with reconciliation checks. That is the same problem shape, and it is where I learned why eventual consistency needs a reconciliation story.",
  remember: "Own your data, no cross-service joins, accept eventual consistency — or do not split."
},

{
  id: "ms-saga", topic: "microservices",
  q: "What is the Saga pattern? (distributed transactions)",
  tags: ["saga", "distributed transaction", "compensating transaction", "choreography orchestration", "two phase commit"],
  simple: "You cannot roll back across several services the way you can in one database. Instead you run the steps one by one, and if a later step fails you run an undo step for each one already done.",
  answer: "A saga is a sequence of local transactions, each publishing an event that triggers the next. If one fails, **compensating transactions** undo the completed ones — cancel the reservation, refund the payment, release the stock.\nTwo styles:\n- **Choreography** — each service listens for events and reacts. No central coordinator, but the overall flow is implicit and hard to follow once there are more than a few steps.\n- **Orchestration** — a coordinator tells each service what to do and handles failures. The flow is explicit and easier to monitor; the orchestrator is one more thing to run.\nTwo-phase commit is the classic alternative and is generally avoided — it holds locks across services and does not survive partial failure well.\nThe practical requirements are idempotent steps and compensations that are genuinely possible: you cannot un-send an email, so design the order so irreversible steps come last.",
  project: "The nearest thing in my work is the document-to-SAP flow: we post locally, then sync, and if SAP rejects the document the local record is moved to a failed state with the reason, raising it for correction rather than silently diverging. That is a compensating action in the business sense, driven by status rather than a saga framework.",
  remember: "Local transaction per step, compensating action to undo, irreversible steps last."
},

{
  id: "ms-tracing", topic: "microservices", star: true,
  q: "How do you debug a problem that spans several services?",
  tags: ["distributed tracing", "correlation id", "centralized logging", "opentelemetry", "observability"],
  simple: "Give every incoming request an id, pass it to every service it touches, and log it everywhere. Then one search shows the whole journey.",
  answer: "Three pillars: **logs** (what happened), **metrics** (how much and how fast) and **traces** (the path of one request).\nThe practical essentials:\n- A **correlation/trace id** created at the edge and propagated in a header to every downstream call and queued message.\n- **Centralised, structured logs** so you search across services in one place, not by RDP-ing into servers.\n- **Distributed tracing** (OpenTelemetry, Application Insights) to see the span waterfall and find which hop is slow.\n- **Health endpoints** and alerting on error rate and latency, not just on a process being up.\nWithout a correlation id, cross-service debugging is guesswork based on timestamps.",
  code: "// propagate the id on every outbound call\nrequest.Headers.Add(\"X-Correlation-Id\", _ctx.CorrelationId);\n_log.LogInformation(\"Posting invoice {Id} cid {Cid}\", id, _ctx.CorrelationId);",
  project: "We carry a correlation id through the API layers and into the background jobs, and the logs go through ELMAH and log4net. When business reports that a document did not reach SAP, that id is what ties the user's action, the API call and the sync job attempt together instead of me reading three logs by timestamp.",
  remember: "One id per request, propagated everywhere, logged everywhere."
},

{
  id: "ms-eventual", topic: "microservices",
  q: "What is eventual consistency?",
  tags: ["eventual consistency", "cap theorem", "strong consistency", "event driven consistency"],
  simple: "Different parts of the system agree eventually, not instantly. For a short moment one service may show data another has not received yet.",
  answer: "Once data is spread across services, you choose between strong consistency (everyone always agrees, at the cost of availability and latency) and eventual consistency (fast, available, briefly stale). CAP is the formal statement of that trade-off under partition.\nEventual consistency is acceptable for a report that is seconds behind, a search index, or a downstream system's copy. It is not acceptable where a business invariant depends on it — stock cannot be oversold because two services disagreed.\nWhat makes it workable in practice: idempotent consumers, ordering or versioning so an older event cannot overwrite a newer state, a reconciliation process, and a UI that tells the user when something is still in progress rather than pretending it is done.",
  project: "The SAP sync is eventually consistent by design — a document is saved locally and reaches SAP moments later, and the UI shows a sync status so users know the difference between saved and synced. Making that visible mattered more than making it instant; before the integration existed, the reconciliation was a manual task between two teams.",
  remember: "Briefly stale is fine for reports; never for an invariant like stock."
},

{
  id: "ms-when-not", topic: "microservices", star: true,
  q: "When should you NOT use microservices?",
  tags: ["when not to use microservices", "modular monolith", "monolith first", "premature microservices"],
  simple: "If one small team is building one product that deploys together, microservices add work and remove nothing. Start with a well-structured monolith and split only where you feel real pain.",
  answer: "Reasons not to split:\n- **Small team** — service count beyond team count means everyone owns everything anyway, plus the distributed overhead.\n- **Unclear domain boundaries** — splitting early at the wrong lines is extremely expensive to undo; a wrong boundary inside a monolith is a refactor, a wrong service boundary is a migration.\n- **No independent scaling or release need** — if everything deploys together anyway, you have paid the cost and kept none of the benefit.\n- **No infrastructure maturity** — without CI/CD per service, centralised logging, tracing and monitoring, you get a distributed system you cannot debug.\nThe recommended path is a **modular monolith** with clear internal boundaries, then extract a service when one part genuinely needs separate scaling, a separate release cadence, or a different team — the strangler-fig approach.",
  project: "That is a fair description of our platform and, I think, the right decision for it: multiple modules with clear boundaries and a shared API layer, deployed together, with only the SAP integration pulled out as its own service because it has genuinely different availability and scheduling needs. I would rather give that honest answer than claim a microservices estate I have not run.",
  remember: "Modular monolith first; extract a service when there is a real reason."
},

{
  id: "ms-docker", topic: "microservices",
  q: "What is Docker and why containerise a .NET app?",
  tags: ["docker", "container", "dockerfile", "image", "containerize .net", "image vs container vs registry", "docker registry"],
  simple: "A container packages the app with everything it needs to run, so it behaves the same on your laptop, in test and in production. It is much lighter than a virtual machine.",
  answer: "An image is the immutable package built from a Dockerfile; a container is a running instance. Containers share the host kernel, so they start in seconds and use far less memory than VMs.\nFor .NET the standard pattern is a multi-stage Dockerfile: build and publish with the SDK image, then copy the output into the much smaller ASP.NET runtime image.\nBenefits: identical environments, no it-works-on-my-machine, easy horizontal scaling, and a clean dependency boundary. Practical points: keep images small, do not bake secrets into the image, run as a non-root user, and pass configuration through environment variables.",
  code: "FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build\nWORKDIR /src\nCOPY . .\nRUN dotnet publish -c Release -o /app\n\nFROM mcr.microsoft.com/dotnet/aspnet:8.0\nWORKDIR /app\nCOPY --from=build /app .\nENTRYPOINT [\"dotnet\", \"VendorPortal.Api.dll\"]",
  project: "Our deployments are IIS on Windows Server rather than containers, so I would describe my Docker experience as working knowledge rather than production operations. The part that transfers is the deployment discipline — environment-specific configuration outside the build, the same artifact promoted through environments, and a tested rollback.",
  remember: "Multi-stage build, small runtime image, config from environment, no secrets baked in."
},

{
  id: "ms-k8s", topic: "microservices",
  q: "What does Kubernetes do?",
  tags: ["kubernetes", "k8s", "pod", "orchestration", "aks", "deployment replica"],
  simple: "Kubernetes runs your containers for you — it starts them, restarts the ones that crash, spreads them across machines, and scales them up and down.",
  answer: "Core objects: a **Pod** (one or more containers scheduled together), a **Deployment** (desired number of replicas plus rolling update strategy), a **Service** (stable internal address and load balancing), **Ingress** (external HTTP routing), **ConfigMap** and **Secret** for configuration.\nIt gives self-healing, rolling deployments with health probes, horizontal autoscaling, and service discovery by name.\nThe cost is genuine operational complexity, which is why it is appropriate for many services and not for one or two — for a small estate App Service, Container Apps or plain VMs are usually the better answer.\nTwo things that matter for a .NET app on Kubernetes: liveness and readiness probes wired to real health endpoints, and graceful shutdown so in-flight requests complete during a rolling update.",
  remember: "Pods, Deployments, Services. Self-healing and rolling updates — at the cost of complexity."
},

{
  id: "ms-versioning", topic: "microservices",
  q: "How do you version APIs without breaking consumers?",
  tags: ["api versioning", "backward compatibility", "breaking change", "contract", "deprecation"],
  simple: "Adding a field is safe. Removing or renaming one breaks whoever was using it. When you must break it, publish a new version and keep the old one running for a while.",
  answer: "Non-breaking changes: adding an optional field, adding an endpoint, adding an enum value a client can ignore. Breaking changes: removing or renaming a field, tightening validation, changing a type or the meaning of a value.\nVersioning options: URL path (`/api/v1/`) which is explicit and easy to route, a header, or a query parameter. I prefer the path for clarity.\nProcess matters as much as syntax: support the previous version for an agreed window, log who is still calling it, communicate the deprecation date, and never change v1's behaviour silently.\nFor event payloads the same discipline applies — consumers must tolerate unknown fields so a producer can evolve.",
  project: "The Web API layer I designed uses versioned routes with Swagger documentation precisely so a change for one consumer does not break the modules already calling the existing contract. With a React front end and server-rendered screens both consuming the same API, breaking a contract would mean coordinating two releases.",
  remember: "Add freely, never remove or rename in place. New version, deprecate on a schedule."
},

{
  id: "ms-security", topic: "microservices",
  q: "How do you secure communication between services?",
  tags: ["service to service security", "jwt propagation", "mtls", "client credentials", "zero trust"],
  simple: "Do not assume a call is safe just because it came from inside your network. Every service should still prove who it is and what it is allowed to do.",
  answer: "Layers:\n- **Transport** — TLS everywhere, mutual TLS where services must authenticate each other cryptographically.\n- **Identity** — OAuth 2.0 client credentials for service-to-service tokens; propagate the user's identity when the downstream call acts on their behalf, so authorisation and audit still reflect the real user.\n- **Validation at every hop** — each service validates the token itself rather than trusting the gateway; defence in depth.\n- **Least privilege** — scoped tokens, separate credentials per service, secrets in a vault with rotation.\n- **Network** — private networking and firewall rules so services are not publicly reachable, plus rate limiting at the edge.\nThe general principle is zero trust: the network is not a security boundary.",
  project: "Our API layer is JWT-secured with role-based authorisation on every endpoint, and the background services authenticate rather than relying on being on the same machine. Trusting the caller because it is internal is exactly the kind of assumption that turns into an authorisation finding — a lot of the 500+ security issues I worked through came from checks that were assumed rather than enforced.",
  remember: "Every hop validates the token. Internal network is not a trust boundary."
},

{
  id: "ms-cqrs", topic: "microservices",
  q: "What is CQRS?",
  tags: ["cqrs", "command query separation", "read model write model", "event sourcing", "mediatr"],
  simple: "Separate the code that changes data from the code that reads it. Writes go through one model with all the rules; reads use a simpler, faster model shaped for the screen.",
  answer: "Command Query Responsibility Segregation splits the write side (commands, validation, domain rules) from the read side (queries, projections shaped for the UI). In .NET this often appears as MediatR with command and query handlers.\nIt can go further: separate read and write stores, with the read model updated by events. That buys independent scaling and very fast reads, at the price of eventual consistency and more moving parts. Event sourcing pairs with it but is a separate decision.\nMy view: the lightweight version — separate command and query handlers over the same database — is frequently worth it on complex modules because reporting queries stop being distorted by the entity model. The full two-database version needs a strong justification.",
  project: "A light version of this is already how our heavy modules work in practice — writes go through EF Core entities with validation and transactions, while reporting reads bypass the entity model and use tuned stored procedures and projections shaped for the grid. That is CQRS thinking without the label or the second database.",
  remember: "Writes keep the rules, reads get a shape built for the screen."
},

{
  id: "ms-broker", topic: "microservices",
  q: "RabbitMQ vs Kafka vs Azure Service Bus",
  tags: ["rabbitmq", "kafka", "message broker", "event streaming", "pub sub comparison"],
  simple: "RabbitMQ and Service Bus are message queues — deliver this job to a worker. Kafka is an event log — keep a stream of events that many consumers can read and re-read.",
  answer: "- **RabbitMQ** — traditional broker with exchanges and queues, flexible routing, per-message acknowledgement, dead-letter queues. Good for task distribution and request/response-style messaging.\n- **Azure Service Bus** — the managed enterprise equivalent: sessions for ordering, transactions, duplicate detection, topics and subscriptions, dead-lettering built in.\n- **Kafka** — a partitioned, durable log. Messages are retained and consumers track their own offset, so you can replay history and add a new consumer that reads from the beginning. Built for high-throughput streaming and analytics.\nChoose by question: *who should do this work?* → a queue. *What happened, and who might care later?* → an event log.",
  project: "We do not run a broker — the pending-document table plus Hangfire plays the queue role for the SAP sync. If that moved to a broker, it is a queue problem and not a streaming one, so Service Bus rather than Kafka.",
  remember: "Queue = deliver a job once. Kafka = a replayable log of events."
},

{
  id: "ms-health", topic: "microservices",
  q: "Health checks, readiness and graceful shutdown",
  tags: ["health check", "liveness readiness probe", "graceful shutdown", "monitoring endpoint"],
  simple: "A health endpoint lets the platform ask is this instance usable. Readiness means ready to take traffic; liveness means still alive. Graceful shutdown means finishing the work in hand before the process exits.",
  answer: "ASP.NET Core has health checks built in: `AddHealthChecks()` with checks for the database, downstream APIs and queues, exposed at `/health`. Split them — **liveness** should be cheap and not fail because a dependency is down (otherwise the platform keeps restarting a healthy process), while **readiness** can include dependencies so a starting instance is kept out of the load balancer until it can serve.\nGraceful shutdown: handle the stopping token, stop accepting new work, let in-flight requests and jobs finish within the shutdown timeout. Without it, a rolling deployment drops requests and half-finished jobs.",
  code: "builder.Services.AddHealthChecks()\n    .AddSqlServer(cs, name: \"sql\")\n    .AddUrlGroup(new Uri(sapPingUrl), name: \"sap\");\napp.MapHealthChecks(\"/health/live\",  new() { Predicate = _ => false });\napp.MapHealthChecks(\"/health/ready\");",
  project: "The equivalent on our IIS deployments is the post-deployment validation step — after a release I check the application responds, the database connection works and the background jobs are running, before telling the business the window is closed. A health endpoint automates exactly that check.",
  remember: "Liveness = am I alive. Readiness = can I take traffic. Finish in-flight work before exit."
},

{
  id: "ms-decompose", topic: "microservices",
  q: "How would you break a monolith into services?",
  tags: ["strangler fig", "decompose monolith", "bounded context", "migration strategy", "ddd"],
  simple: "Do not rewrite it. Pick one capability with clear edges, build it as a service, route that traffic to the new service, and repeat until the old system is hollow.",
  answer: "The **strangler fig** approach: new functionality and one extracted capability at a time run alongside the monolith behind a routing layer, which gradually takes over until the old code can be deleted. A big-bang rewrite is the standard way this fails.\nHow I would choose the first candidate: a bounded context with few dependencies, its own data, a clear business owner, and a real reason to be separate — different scaling, a different release cadence, or a different team. Something peripheral rather than the core domain, so an early mistake is cheap.\nSequence: carve the module boundary inside the monolith first, separate its data access, expose it behind an interface, then extract it. If you cannot cleanly separate it inside the codebase, you are certainly not ready to separate it across a network.\nThroughout, you need monitoring and a feature flag to route traffic back if the new path misbehaves.",
  project: "The SAP Synchronization Services is the closest thing I have done to this — integration logic that previously sat inside the application was built out as its own service with its own scheduling and retry behaviour, because it had genuinely different availability needs. Doing that one piece first, rather than reorganising everything, is the approach I would carry into a bigger decomposition.",
  remember: "Strangler fig, not rewrite. Clean the boundary in code before splitting it over a network."
}

]);
