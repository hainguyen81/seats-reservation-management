# 🗺️ SYSTEM WORKFLOW & CI/CD PIPELINE ARCHITECTURE

This document details the end-to-end automation lifecycle of the application—ranging from localized containerized development to the continuous integration (CI/CD) testing pipelines, concluding with the production cloud scaling layout.

---

## 🚀 1. End-to-End Pipeline Workflow (CI/CD Visualized)

The sequence diagram below models the precise continuous integration flow executed on every code integration (git push) to the main production branch.

[ Developer Machine ] ──( git push )──> [ GitHub Repository ]
                                                 │
                                         ( Triggers Workflow )
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │   GitHub CI Runner    │
                                     │  (Ubuntu Host Engine) │
                                     └───────────┬───────────┘
                                                 │
                                   ( Spawns Isolated Network )
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │  Ephemeral Services   │
                                     │  ├─ Postgres Container│
                                     │  └─ Redis Container   │
                                     └───────────┬───────────┘
                                                 │
                                        ( Internal Mapping )
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │      Steps Matrix     │
                                     │  1. Node 22 Setup     │
                                     │  2. Prisma Schema Push│
                                     │  3. Prisma Data Seed  │
                                     │  4. Playwright E2E    │
                                     └───────────┬───────────┘
                                                 │
                                        ( All Tests Pass )
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │   Docker Hub/Registry │
                                     │ 🐙 Push: Node22Alpine │
                                     └───────────┬───────────┘
                                                 │
                                       ( GitOps Auto-Trigger )
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │   Kubernetes Cluster  │
                                     │ 📦 Rolling Update     │
                                     └───────────────────────┘

---

## 🛠️ 2. Detailed Technical Execution Steps

### Phase A: Local Development & Decoupled Building
1. **Container Isolation:** The application isolates development environments using **Docker Compose** mapped via specific targeted environment files (`docker compose -f docker-compose.prod.yml up --build --force-recreate`).
2. **Alpine Footprint Optimization:** Microservices leverage official `node:22-alpine` bases to ensure minimized attack surfaces and fast container loading metrics.
3. **Caching Layer Bypassing:** Critical builds enforce automated invalidation (`build --no-cache`) alongside proper internal routing via path mappings configured cleanly inside the local `tsconfig.json`.

### Phase B: Automated Infrastructure Invalidation (GitHub Actions)
1. **Single Virtual Host Context:** To preserve data persistence between the structural setups and integration testing phases, all workflows run within a **single unified job**. 
2. **Ephemeral Supporting Grid:** GitHub Runners invoke decoupled background sidecar containers utilizing direct port forwarding:
   * **PostgreSQL Engine:** Runs natively inside the isolated runner segment using persistent status probes (`pg_isready`).
   * **Redis Caching Core:** Clears out old cache keys sequentially (`redis-cli flushall`) during startup testing.
3. **Database Population & Synchronization Execution:**
   * **Prisma Structure Push:** `npx prisma db push` analyzes structural entities and injects relational definitions straight to the database host.
   * **Seed Injection Execution:** Data seed actions (`npx prisma db seed`) inject system requirements, preventing UI test flakiness caused by unpopulated tables.

### Phase C: Playwright Autonomous Validation Suite
1. **Integrated Web Server Framework:** Playwright boots the production runtime natively via internal configurations (`config.webServer`) before test execution begins.
2. **Host-to-Container Routing Protocol (localhost Rule):** 
   * Local scripts communicate securely via **localhost loops** because the test scripts are running directly on the runner host machine, communicating into mapped container ports.
   * Inside production nodes (such as Docker Compose orchestration layers), internal cross-container service strings apply natively (e.g., `redis://redis-cache:6379`).
3. **Auto-Waiting Test Matrix Execution:** Dynamic elements such as user seat selection forms enforce strictly native accessible elements (`getByRole('button')`) wrapped with fail-safe thresholds (`waitFor({ state: 'visible' })`) to guarantee reliable assertions under limited CI system resources.

---

## 📦 3. Production Deployment & Cloud Scale Layout

When workloads graduate out of the continuous integration network, the artifacts are containerized and scaled across a high-availability cloud architecture.

                    [ Public Internet User Traffic ]
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │     K8s Ingress Controller    │
                   │  (Cloud Managed LoadBalancer) │
                   └───────────────┬───────────────┘
                                   │
                    ( Even Traffic Distribution )
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
         ┌───────────────────────┐   ┌───────────────────────┐
         │     Next.js / Node    │   │     Next.js / Node    │
         │     Pod 1 (Replica)   │   │     Pod 2 (Replica)   │
         └───────────┬───────────┘   └───────────┬───────────┘
                     │                           │
         ┌───────────┴───────────┐   ┌───────────┴───────────┐
         ▼                       ▼   ▼                       ▼
┌─────────────────┐    ┌───────────────────┐    ┌──────────────────┐
│  Redis Cluster  │    │  Database Master  │    │ Firebase Cloud   │
│ (Shared State)  │    │   (Write Node)    │    │ (Serverless Ops) │
└─────────────────┘    └─────────┬─────────┘    └──────────────────┘
                                 │
                     ( Real-Time Replication )
                                 │
                                 ▼
                       ┌───────────────────┐
                       │ Database Replica  │
                       │    (Read Pool)    │
                       └───────────────────┘

### 📈 Scaling Specifications & Best Practices
* **State Management Separation:** The application instances remain fully **stateless**. All transient properties (sessions, transaction tracking, concurrency states) bypass internal disk constraints and offload to the distributed **Redis Cluster**.
* **Horizontal Pod Autoscaling (HPA):** Pod scaling is regulated automatically via the Kubernetes HPA configuration controller. Micro-node instances automatically duplicate or spin down when aggregate processor/memory utilization crosses 75%.
* **Database IOPS Maximization:** Write transactions pass straight into the Primary Database node via short-lived Prisma links, while read queries distribute natively across read-only replica matrices.
* **Serverless Compute Protection:** Static heavy operations, media assets hosting, and push tokens route through secure, distributed client-to-cloud serverless paradigms (Firebase Architecture), keeping the core compute footprint lean and stable.
