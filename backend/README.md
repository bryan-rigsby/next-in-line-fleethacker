# SharePoint and Power Automate integration — V1 next step

The staff queue uses Firepit and Power Automate. The public Sailor status page uses the separate read-only status server described below.

## Confirmed

- Firepit can load the frontend on the target site.
- Two accounts can read/create synthetic records in QueueConnectionTest.
- Anonymous Microsoft Forms submission works.
- Forms -> Get response details -> SharePoint Create item successfully creates Tickets rows.

## Next: read actual Tickets in the staff dashboard

Before mapping fields, capture:
1. Site home URL, not a SitePages/list/sharing URL.
2. Tickets list URL or GUID and exact display title.
3. Column display names, internal names, and types. A List settings -> Columns screenshot is useful; internal names can be read from schema metadata or the column settings URL's Field parameter.
4. Exact Department and Service choice/text values created by a synthetic form response. Existing demo department codes differ from human-readable Forms labels; map explicitly.
5. Confirmed staff permissions and intended department scope.

Expected initial intake fields (verify rather than assuming): Title, SailorName (text), SailorEmail (text), Department (text), Service (text), Status (choice), JoinedAt (date/time), FormResponseId (text). SharePoint's built-in ID provides the stable technical key; display-number format remains a separate product decision.

First live milestone is read-only: retrieve Waiting tickets, map actual fields, filter the department, order by JoinedAt with ID as a tie-breaker, show current identity and refreshed time, and verify two independent staff sessions see new form arrivals. No demo records or email simulation controls in live mode. A failed live read must display an error rather than fall back to synthetic data.

## Then enable staff actions

Agree fields for first/last call time, serving time, done time, reporting location, staff message, actor, and notification state. Add these only with the site owner's agreed schema. Implement authoritative conditional/serialized claims before Next Customer writes, and validate state transitions and department permissions. The current local workflow module only prevents invalid actions within one browser; it is not cross-user locking.

## Notification integration

Call event -> approved notification request/flow -> Outlook email -> persisted sent/failed result. Use event/request identifiers to avoid duplicate requests, keep notification status independent of ticket status, and validate recipient and content. A successful SharePoint update does not prove mail delivery. Preserve a clear staff fallback if email fails.

## Intake hardening before operational use

Verify one new ticket per FormResponseId even when flow actions retry; support the chosen uniqueness/idempotency method. Do not use anonymous self-entered email as verified identity. Keep Tickets staff-only and publish only sanitized board data. Test ordinary staff accounts as well as the site owner.

## V2

See ../plan-v2.md for the admin dashboard; it is deferred until the V1 live queue/email loop works.

## Sailor status link deployment

The public status page and API are served together by `node backend/status-server.mjs` on Node 20+. The existing staff Firepit deployment remains a separate entry point. Deploy the status server only to a command-approved public HTTPS host with approved access to the Flank Speed tenant.

- Configure STATUS_TENANT_ID, STATUS_CLIENT_ID, STATUS_CLIENT_SECRET through the host secret store, plus STATUS_SITE_ID and STATUS_LIST_ID from Microsoft Graph for the NRC Houston staff site and Tickets list. The browser-facing MCAS URL is not the Graph site identifier. PORT defaults to 8080 and STATUS_BIND_HOST defaults to loopback for a local reverse proxy.
- Provision an approved Entra application identity with read access scoped to Tickets or its site. Verify the tenant supports the selected grant before deployment. The adapter targets DoD L5 Graph and the US Government login authority. It uses indexed Department and StatusTokenHash filters separately.
- Add optional StatusTokenHash (single line of text, unique/indexed) and StatusTokenExpiresAt (date and time) to Tickets. Keep Department indexed. Use the internal field names from the Tickets setup guide.
- The trusted intake or notification process must generate a distinct 256-bit token, save only its SHA-256 digest and an expiry on the new ticket, then include `https://APPROVED-HOST/t/<token>` in the Sailor’s confirmation email. The `createStatusToken()` function in ticket-status.mjs implements token generation for a trusted issuer. The existing Power Automate flow still needs that issuer integration. Clear the digest or expire it to revoke a link. Terminal ticket statuses also invalidate links.
- Use HTTPS, disable URL-path capture in logs and telemetry for the two token routes, and apply approved rate limits at the host edge before public exposure. Confirm test links expire and inaccessible or nonexistent tickets return the same 404 response.
- The browser calls the relative `/api` address on the same HTTPS host. No CORS or SharePoint authentication is required in the Sailor's browser. The endpoint returns an explicit display-field allowlist. It calculates position from Waiting rows with matching Department, sorting by JoinedAt and using item ID only as an internal tie-breaker.
- For acceptance, create synthetic tickets across two departments, including tied times and Called rows. Verify each link returns just its ticket, older Waiting rows affect its rank, and expired or terminal links reveal no ticket data. Test a confirmation email with the actual approved host before distributing links.

## Call Next and the call-up email

Staff select one department and enter a reporting location. Call Next reads the oldest current Waiting item ordered by JoinedAt and ID. A SharePoint MERGE with the item's exact ETag sets Called, preserves the first call time, updates the last call time and location, increments CallCount, and queues email with NotificationStatus = Pending. A 412 refreshes the queue without automatically claiming another Sailor. Staff need permission to edit the relevant Tickets items.

Set up a separate automated cloud flow before enabling live call-up:

1. Add Sending to the Tickets NotificationStatus choices. Keep the existing NotRequested, Pending, Sent, and Failed choices.
2. Use SharePoint **When an item or a file is modified** for NRC Houston's Tickets list. Set trigger concurrency to 1. Add this trigger condition for the Choice field shape. Confirm the paths against the trigger output in a synthetic run.
   ```
   @and(equals(triggerBody()?['Status']?['Value'],'Called'),equals(triggerBody()?['NotificationStatus']?['Value'],'Pending'))
   ```
3. Get item using the trigger ID. Continue only if the fresh item is still Called and Pending. This check skips queued duplicate trigger runs after another run has handled the notification. Maintain one call-up flow for the list.
4. If SailorEmail is blank, set NotificationStatus to Failed and NotificationError to a short missing-address message. Otherwise set NotificationStatus to Sending before invoking Outlook. Use a SharePoint partial update for notification fields so the flow preserves concurrent ticket changes. If using SharePoint Send an HTTP request, use the current item ETag with MERGE and stop on conflict. Avoid writing old Status or call details back to the ticket.
5. Send a separate email via the approved Outlook connection. To = SailorEmail from Get item. Subject = NRC Houston queue - It's your turn. Body includes the ticket reference (Title, or # plus ID if blank), department, and CalledLocation. Set the Outlook action retry policy to None if available to reduce repeat sends after an ambiguous timeout.
6. On success, update only NotificationStatus = Sent, NotificationSentAt = utcNow(), and clear NotificationError. Use a failure/timeout branch to write Failed and a short reason. If the flow stops at Sending or Outlook times out, check run history and the sending mailbox before manually requeuing. Sent means Outlook accepted the message for sending. A later bounce can still occur.
7. Ship the frontend to the staff-only Firepit test page. With synthetic Waiting rows, use two independent staff sessions to attempt to call the same oldest ticket. Check that a stale write gets 412, only one call is recorded for that ticket, and one call-up email is sent. Verify a missing address or email failure leaves the ticket Called. The staff page shows Pending when the call succeeds. Inspect the list or run history for the final email result.
