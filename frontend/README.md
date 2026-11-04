# Next in Line — staff dashboard

Open `index.html` in Chrome on macOS, or open this frontend folder in Forge and select Code -> index.html. Reload/reopen it in Forge after external edits so an old editor buffer does not overwrite changes.

## Current behavior

- Starts in Department Staff View. The old Sailor kiosk and front-desk entry views are retained internally for teammate reference but hidden from navigation. Sailors use a separate public Microsoft Form.
- Local demo banner is always visible. Tickets/settings use a separate v2 browser storage key; earlier demo storage is not overwritten. There is no SharePoint connection, email flow, authentication, or department authorization in this build.
- Select a department, then choose a preset/custom message and reporting location. Call Next Customer selects the oldest Waiting ticket and asks for confirmation.
- Called -> Begin Serving -> Mark Done records actual timestamps. Done cannot skip Serving. Repeated Call on a non-Waiting ticket is rejected locally; this is not cross-user concurrency protection.
- Email simulation has separate Pending, Failed, and Simulated success states. Use the buttons to simulate success/failure, and Retry simulation after failure. Failure never changes the ticket status. No real email is sent.
- Add synthetic form arrival creates a browser-local sample ticket; it is not connected to Microsoft Forms. Refresh local data reloads this browser's storage only.
- Waiting-room board shows ticket/department/location without names, email, notes, or custom staff messages. This demo's view switcher is not an access-control boundary; a real display account must receive only sanitized data.
- Local sample history persists across refresh. Reset under Demo Configuration restores synthetic data. Device-local date is used for the prototype's Done today count; live integration needs the agreed NRC business timezone.

## Practice workflow

1. Add synthetic form arrival in your chosen department.
2. Enter location and message; Call Next Customer and confirm.
3. Simulate email failure. The ticket stays Called.
4. Retry simulation, then Simulate success.
5. Begin Serving, then Mark Done; observe the counts/history.
6. Refresh and confirm local demo data persists.
7. Open Waiting Room TV and confirm it shows no names.

## Checks

From the repository root:

```sh
node --test tests/staff-queue-workflow.test.cjs
```

Six focused tests cover transitions, accurate timestamps, duplicate-call rejection, invalid-call validation, missing recipients, and notification failure/retry independent of ticket status. A temporary headless-browser check also exercised the staff workflow, reload, and TV sanitization.

## Shipping

Use Forge -> Ship for SharePoint after testing. The new `staff-queue-workflow.js` is a required dependency; ensure Forge bundles it in the output. Keep script tags on separate lines from Forge developer scripts to avoid the export issue seen in connection-test. Existing `Shipped Apps` output has not been rebuilt and remains the earlier app until re-shipped. Inspect the exported artifact and verify it runs through Firepit before replacing a published build.

## Next integration

Anonymous Microsoft Forms -> Power Automate intake -> Tickets list; signed-in staff use this UI through Firepit. Map the actual list schema (SailorName, SailorEmail, Department, Service, Status, JoinedAt, FormResponseId, plus agreed call/service/completion/notification fields). Agree department code mapping and idempotent intake before enabling writes. Live ticket claims require server-side conditional updates or serialization and SharePoint-enforced permissions. Persist notification requests/status using the actual flow rather than enabling demo notification controls in live mode.
