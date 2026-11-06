# SharePoint and Power Automate integration — V1 next step

The staff queue uses Firepit and Power Automate.

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
   - In **SendCallEmail**, use **CalledLocation** from **Get item** in the body after “Please report to”. Use the Tickets column’s dynamic content. If using an expression and the action is internally named `Get_item`, enter `body('Get_item')?['CalledLocation']`.
   - For a new test ticket, enter a reporting location in Staff Tools and click **Call Next**. Check the ticket’s CalledLocation column first, then check the **Get item** outputs and **SendCallEmail** inputs in run history. The same location should appear in all three places.
6. On success, update only NotificationStatus = Sent, NotificationSentAt = utcNow(), and clear NotificationError. Use a failure/timeout branch to write Failed and a short reason. If the flow stops at Sending or Outlook times out, check run history and the sending mailbox before manually requeuing. Sent means Outlook accepted the message for sending. A later bounce can still occur.
7. Ship the frontend to the staff-only Firepit test page. With synthetic Waiting rows, use two independent staff sessions to attempt to call the same oldest ticket. Check that a stale write gets 412, only one call is recorded for that ticket, and one call-up email is sent. Verify a missing address or email failure leaves the ticket Called. The staff page shows Pending when the call succeeds. Inspect the list or run history for the final email result.


### Shared sender for intake and call-up emails

1. Identify an approved NRC shared mailbox and grant the account behind the Outlook flow connection **Send As** permission and any mailbox access required by the connector.
2. In each flow, replace the existing Outlook send step with **Send an email from a shared mailbox (V2)**. Set **Original Mailbox Address** to the shared mailbox address and copy the recipient, subject, body, and any retry settings from the existing action.
3. In the call-up flow, check the success and failure branches' **Configure run after** settings against the replacement send action so the ticket still records Sent or Failed correctly.
4. Test both flows with synthetic tickets. Verify the visible From address, the reporting location in the call-up email, and delivery to an approved external test address.

### Staff service attribution

Before deploying the dashboard, add an optional **Single line of text** column to **Tickets** named exactly `ServiceProvidedBy`. Start service saves the signed-in SharePoint account email here. Metrics counts Done tickets by this email for the selected ticket join dates. Older Done tickets without an email appear as Unattributed.

### Reporting locations at another site

Create a SharePoint list named **QueueConfiguration** in the dashboard's site. Add **ReportingRoom** as a single line of text. Create one item per department using its Tickets department code as **Title** and its room as **ReportingRoom**. Give dashboard users list read access and maintainers list edit access. Staff can update existing rooms from Configuration. Add department rows in SharePoint and keep department codes aligned across the form, intake flow, Tickets list, and dashboard choices. Set the dashboard source's site URL and default room for the new deployment before shipping. Room changes made afterward use SharePoint and require no rebuild. Open Configuration to reload room values on an already-open dashboard.
