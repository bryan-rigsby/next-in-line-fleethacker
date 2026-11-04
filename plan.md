# Next in Line — Fleet Hacker implementation plan

## Goal and agreed direction

Build the NRC customer-service queue using the existing frontend. A Sailor scans one QR code, opens a SharePoint page, selects a department/service, joins the queue, and sees their ticket. Staff call the next Sailor; the ticket updates and an email is sent.

User decisions override the original PRD where they differ:
- Forge is optional for development; its SharePoint shipping/integration tools can be used as needed.
- The target site has access to the Firepit client-side solution. Verify that it is installed and usable on the specific deployment site.
- Start with email notifications, not Teams Flow bot.
- First milestone is the working QR-code/queue loop. The complete PRD is the backlog, not the initial delivery commitment.
- Develop locally on macOS. A teammate with Flank Speed access performs deployment and authenticated integration tests.
- Production hosting is SharePoint Online through Firepit, with SharePoint lists and standard Power Automate connectors. No separate application server, UDS, Kubernetes, Helm, Zarf, external database, premium connector, or new paid service is planned.

## Current repository assessment

- `frontend/v1.html`: existing single-page customer/staff/display/configuration prototype with inline styling and JavaScript.
- State currently lives in browser `localStorage`, with synthetic seed tickets and a browser-local ticket sequence. It is not a shared multi-user queue yet.
- Existing ticket actions mutate local state. Email and SharePoint archive messages are simulated toasts, not integrations.
- Completion currently fabricates missing call/service timestamps; replace this with valid transitions and actual timestamps before collecting real metrics.
- `frontend/devconsole.js` and `frontend/testRecorder.js`: existing untracked developer tooling; preserve teammate work. Decide explicitly what is excluded from the shipped artifact, especially recording/logging that could capture identity or ticket data.
- `frontend/README.md` and `backend/README.md` are empty. The backend folder can hold list schemas, integration contracts, and flow documentation rather than a standalone API server.
- Forge was inspected at `/Users/bryanrigsby/Downloads/Forge.html`. Its embedded deployment guide describes Firepit hosting, SharePoint list integration, and email-flow tooling. This establishes an intended integration path, not a verified deployment.

## Target architecture

```text
Stable QR code
    -> NRC SharePoint site page
    -> Firepit loads a compiled HTML asset from a site document library
    -> HTML/CSS/JavaScript application
       -> SharePoint adapter -> protected lists and PII-free queue board
       -> authorized queue operations -> notification requests
    -> Power Automate + approved Outlook connection -> email
```

Use the current user's SharePoint identity and permissions through the supported Firepit/Forge runtime. Never put credentials, API keys, or privileged service tokens in frontend code. Browser role selectors and hidden controls are demo/UI features, not authorization.

Keep the interface separate from data access:
- **Local adapter:** synthetic users and records for interface/state-machine development; explicitly labeled demo mode. Local storage is isolated per browser and does not establish multi-user correctness.
- **SharePoint adapter:** persistent records, authenticated identity, permission-aware reads, conditional writes, and polling through a verified integration.
- Keep operation contracts consistent so the same UI can switch adapters. Production failures must not silently fall back to local storage or display fabricated success.

## Phase 1 — Prove the deployment path

- [ ] Obtain the target site URL, deployment contact, and command-owned app/flow maintainer.
- [ ] Verify the teammate can add/use Firepit, upload and replace an HTML file, create/edit the page, and publish it.
- [ ] Verify who can create lists, configure permissions, create flows, and use the approved Outlook connector under existing licensing.
- [ ] Deploy a minimal HTML page through Firepit and confirm it opens on a phone after Flank Speed sign-in.
- [ ] Create a synthetic test list and prove read/create/update through Firepit from two separate accounts/browsers.
- [ ] Verify how the installed Firepit version supplies identity/context and permits list requests. Forge's guide says Lockdown mode disables SharePoint API connections; use the appropriate approved configuration.
- [ ] Send one real email through an approved Power Automate flow; inspect delivery and flow-run results.

**Exit:** a page on the actual target site reads/writes shared test data and causes an email to arrive. Do not describe a local simulation as this milestone.

## Phase 2 — Agree the minimal data and operation contracts

Suggested initial lists (final types/internal names documented after the integration spike):

| List | Purpose and minimum fields |
| --- | --- |
| Departments | Code/prefix, name, room, active, sort order; service menu via Services list |
| Services | Department reference, name, active, optional self-service links |
| Tickets | Internal ID, display number, Sailor identity, department/service, status, source, queue date, join/order/call/service/completion timestamps, call message/location, actor, operation identifiers |
| QueueBoard | Ticket ID/number, department, status, order time, room; no names, email, reasons, or free-text staff messages |
| TicketEvents | Ticket reference, action, timestamp, actor, operation ID; minimize message content |
| NotificationRequests | Ticket/event reference, approved recipient, bounded message, delivery status, attempt/error information, deduplication key; restricted access |

Reuse a proven Forge-provisioned notification queue/schema if available rather than inventing a competing one. Do not implement two independent writers or triggers for the same notification.

- [ ] Define operations: get departments/services, get my tickets, join, cancel own waiting ticket, get authorized staff queue, call next, mark serving, mark done, get display board, refresh.
- [ ] Define valid state transitions: Waiting -> Called -> Serving -> Done; Waiting -> Cancelled. Add recall/no-show/transfer only after the initial loop works.
- [ ] Use stable operation IDs for retry safety. Enforce one active ticket per Sailor/department in authoritative storage, not only in the browser.
- [ ] Choose numbering explicitly. PRD department/day numbering requires authoritative serialized allocation or equivalent safeguards. A SharePoint-ID-based display number is a simplification requiring product-owner agreement, not an unnoticed substitution.
- [ ] Agree the NRC's business timezone for queue dates/daily resets; store event instants consistently. Do not derive business dates from each device's timezone.
- [ ] Resolve access before real data: Sailors read only their own tickets; staff access only authorized departments; the public board contains no PII. Do not assume SharePoint Created By matches the Sailor when a flow or staff member creates a ticket.
- [ ] Prevent customers from directly changing protected status/order/identity fields. Define which writes run under user permissions and which are mediated by validated flows.

## Phase 3 — Adapt the existing frontend locally

- [ ] Preserve the teammate's visual work and review changes together; avoid a wholesale rewrite.
- [ ] Extract or wrap browser-local state behind the data-access contract.
- [ ] Support asynchronous operations with saving, success, failure, and retry states. Disable duplicate submissions while a request is pending.
- [ ] Replace simulated integration toasts with truthful demo messages or confirmed integration results.
- [ ] Remove synthetic timestamp backfilling from real operation paths.
- [ ] Make a minimal customer journey: departments -> services -> join -> ticket/status -> cancel.
- [ ] Make a minimal staff journey: authorized queue -> call next with room/message -> serving -> done.
- [ ] Show only ticket number and location on the display; safely render text without interpreting user input as HTML.
- [ ] Show refresh time, connection failures, and clear demo/live environment identification. Use bounded polling and backoff rather than repeatedly writing whole application state.
- [ ] Check mobile layout, keyboard navigation, labels, readable contrast, and screen-reader status updates.

**Exit:** the complete initial journey works with synthetic data and cleanly defined adapter calls. No claim of real identity, emails, or shared persistence yet.

## Phase 4 — Connect the live SharePoint queue

- [ ] Implement the SharePoint adapter using the verified Firepit/Forge integration and agreed schemas. Inspect runtime requirements and dependency packaging instead of assuming ordinary browser fetch will work unchanged inside the sandbox.
- [ ] Create indexed filter columns such as department, status, queue date, and owner identity as appropriate. Bound live queries to current relevant tickets; test the actual list/query limits.
- [ ] Use server-recorded timestamps where available and deterministic ordering with a stable tie-breaker.
- [ ] Implement safe create/claim behavior. Reading Waiting then writing Called is not an atomic claim; use a verified conditional update (ETag/version) or serialized authoritative operation. Return/retry cleanly on conflict.
- [ ] Keep authoritative queue mutations separate from slower email delivery; a notification failure must not undo or hide a successful call.
- [ ] Update/reconcile the sanitized board and event records, including partial failures. Do not copy PII-bearing free-text messages into the public board.
- [ ] Enforce permissions in SharePoint/validated operations and test direct list access using ordinary customer/staff accounts.
- [ ] Confirm shared status changes across two customer browsers and a separate staff browser. A local adapter cannot validate this.

## Phase 5 — Email, stable page, and QR code

- [ ] Configure one command-maintained email flow using standard connectors permitted in the target environment.
- [ ] Generate a notification only for an actual call event; joining confirmation is optional initially.
- [ ] Validate recipients and allowed actions at the trusted boundary. Do not expose a privileged generic email sender that accepts arbitrary browser inputs.
- [ ] Track request, sent/failed status, retry information, and event deduplication. A successful app click is not proof of email delivery; aim for bounded retry without duplicate requests and acknowledge connector delivery ambiguity.
- [ ] Use ticket number, department, reporting location/message, and return link; exclude reasons and unnecessary identity details.
- [ ] Measure actual delivery on phones; treat the PRD's 60 seconds as an acceptance target to verify, not a guaranteed platform SLA.
- [ ] Ship for SharePoint, package required frontend assets, upload the stable current HTML asset, and configure the Firepit page to use it.
- [ ] Generate the QR code only after the stable published SharePoint page URL is agreed. It must not point to localhost, an HTML download URL, or a transient preview.
- [ ] Replace the same HTML asset for subsequent releases; verify cache/refresh behavior and preserve a rollback copy.

## Acceptance checks for the first working release

- [ ] Sailor A scans the QR on a phone and opens the published app with their actual Flank Speed identity.
- [ ] A joins a department and receives a persistent ticket; repeating the request returns the existing active ticket.
- [ ] Sailor B joins the same department; both see the correct relative order without seeing each other's PII.
- [ ] Staff calls next; exactly one Waiting ticket becomes Called, the display updates, and the correct Sailor receives an email.
- [ ] Two staff attempt Next simultaneously: no ticket is claimed twice; losing requests refresh/retry predictably.
- [ ] Serving and Done retain accurate history and remove the ticket from the waiting queue.
- [ ] Refreshing/reopening from another session retains authoritative data; no browser-local illusion of persistence.
- [ ] An email failure is visible to staff while the Called state remains available to the Sailor/display.
- [ ] Customers cannot browse others' protected records or modify protected fields; unauthorized staff cannot operate another department.
- [ ] The shipped build has no demo role bypass, synthetic data seeding, embedded credentials, unnecessary recording, or misleading delivery messages.

## Later backlog

Bring back PRD requirements deliberately after the initial slice: all nine departments and complete menus, pause/resume, front-desk entry, recall/no-show, transfer with preserved order, multi-stop handling, configurable presets, service-document email, historical metrics/export, retention cleanup, daily close, accessible TV behavior, and multi-NRC provisioning.

The first release must still have correct access control, truthful state, shared persistence, and safe concurrent operations. Scope reduction applies to features, not to pretending these foundations are implemented.

## Ownership and handoff

| Work | Local developer | Teammate / site owner with Flank Speed access |
| --- | --- | --- |
| Frontend and local testing | Build and review | Review workflows |
| Adapter/schema/flow design | Define and implement source/configuration | Verify tenant capabilities |
| Lists and permissions | Supply explicit schema and access matrix | Provision and validate |
| Firepit publishing | Supply compiled artifact/instructions | Upload, configure, publish |
| Email flow | Supply package or exact setup | Import/configure connection, run tests |
| Acceptance | Supply test cases and resolve defects | Execute authenticated multi-user/phone tests |

Keep connection-specific settings outside shared logic. Keep operational ownership/co-ownership documented so the queue survives personnel changes.

## Deliverables

1. Existing frontend adapted into a working, documented queue application.
2. Local synthetic-data mode and a separate SharePoint adapter.
3. SharePoint list schemas, indexes, permission matrix, and seed configuration.
4. Standard-connector email-flow package or reproducible setup instructions.
5. Firepit-compatible shipped HTML with required assets included and versioned rollback copy.
6. Deployment/setup guide, acceptance results, and explicit unresolved limitations.
7. QR placard targeting the final stable page URL.

## Immediate next actions

1. Teammate proves Firepit hosting plus list read/write and an email on the target site.
2. Review `frontend/v1.html` together and identify the exact initial customer/staff screens to retain.
3. Agree ownership/permissions, safe numbering, and the create/call operation boundary.
4. Implement the local adapter and minimal journey, then connect the verified SharePoint integration.

## References

- Source PRD: NRC Customer Service Queue — Requirements for Development Team, November 4, 2026; user decisions above supersede its Forge-only and Teams-first assumptions.
- Forge's embedded SharePoint Deploy Guide: Resources -> SharePoint Deploy Guide; SharePoint shipping uses Firepit, not a new custom web part for each application.
- Microsoft SPFx overview: https://learn.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview
- SharePoint conditional updates: https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/working-with-lists-and-list-items-with-rest

## Updated implementation direction — anonymous intake and staff dashboard

The Sailor will not sign into SharePoint. An anonymous Microsoft Forms intake has been tested successfully. Staff use Firepit/SharePoint. Automatic Sailor identity capture and the authenticated customer app in the original plan are superseded; names/email are self-entered. The QR targets the anonymous form. Personal live position tracking is deferred. Two accounts have successfully read and added synthetic entries through the separate connection test.

Local staff adaptation is implemented in frontend/index.html and staff-queue-workflow.js: staff default, synthetic arrival, ordered queue, room/message confirmation, validated Called -> Serving -> Done, separate simulated notification states, and sanitized display. Frontend README documents usage and limitations. Real Forms/SharePoint/email integration, authoritative concurrency, permissions, and multi-user acceptance remain outstanding. Existing Forge shipped output is stale until rebuilt.

## V1 progress and next handoff

Anonymous Forms -> Get response details -> SharePoint Create item is confirmed working by the team. The next milestone is read-only live Tickets in the staff dashboard, followed by concurrency-safe staff actions and real email notification. Capture the actual Tickets schema and department values before mapping. See backend/README.md for the handoff checklist. V2 administration is planned separately in plan-v2.md and does not block V1.
