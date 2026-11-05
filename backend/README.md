# SharePoint and Power Automate integration — V1 next step

This folder documents the integration; no standalone backend server is planned.

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
