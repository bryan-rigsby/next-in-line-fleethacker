# V2 — Queue administration dashboard

## Objective

Give designated NRC maintainers one place to manage routine queue configuration and find the native Microsoft editors for the intake form, SharePoint lists, and Power Automate flows. This follows the V1 delivery; it does not delay the working intake/queue/email loop.

## Confirmed architecture

- Sailors submit an anonymous Microsoft Form; they do not sign into SharePoint.
- Staff/admins sign into Flank Speed and use the Firepit-hosted application.
- SharePoint lists hold tickets and configuration; approved standard-connector Power Automate flows process intake and notifications.
- No separate server, premium connector, or new paid hosting is assumed.

## Administration scope

| Capability | V2 behavior | Enforcement |
| --- | --- | --- |
| Departments | Edit display name, code mapping, room/location, active state, sort order | Authorized configuration-list writers only |
| Services | Add/edit/deactivate services and optional resource links | Validate department relationship and allowed links |
| Message presets | Edit call-up message presets | Department/admin permissions enforced by SharePoint |
| Email templates | Edit bounded subject/body templates using approved placeholders | Notification flow reads validated config; recipients come from ticket records |
| Intake form | Open native Microsoft Forms editor and response summary | Form-owner/collaborator permissions required |
| Automation | Open named intake/notification flows and run history | Flow co-owner permissions required; no privileged tokens in frontend |
| Lists | Open Tickets/configuration lists and settings | Underlying SharePoint permissions determine access |
| Setup information | Display current configured site/list/form/flow references and maintainer contacts | Restrict editing of operational destinations |

## Proposed Admin screen

1. Queue Settings: departments, services, locations, and active state.
2. Messages: presets and email template editor with synthetic preview.
3. Administration Links: Edit Intake Form, Form Responses, Intake Automation, Notification Automation, Open Tickets List, and configuration lists.
4. Setup and Ownership: environment label, configuration status, designated owner/co-owner, and deployment instructions.

Links do not grant access. Show unavailable/not configured states explicitly. Do not claim flow health based on a link or simulate run-history data. Automatic health checks are optional and depend on approved access/licensing; native run-history links are the baseline.

## Data-driven settings

Use SharePoint configuration lists so routine edits require no frontend republish or flow redesign. Read settings in the staff adapter and relevant flows, with bounded refresh, validation, and defined defaults.

Suggested records:
- Departments: stable identifier/code, display name, room, active, sort order.
- Services: stable identifier, department reference, name, active, sort order, optional approved URLs.
- MessagePresets: department, type, text, active, sort order.
- EmailTemplates: event type, subject/body, approved placeholder set, active/version information.
- AppSettings: approved form response/edit links, flow administration links, maintainer contacts. Store no credentials or secrets.

Coordinate final schemas with V1 before adding lists. Preserve historical ticket references when departments/services are renamed or deactivated. Avoid destructive deletion as a routine admin action.

## Forms synchronization limitation

Do not promise that editing a Services list updates Microsoft Forms questions or choices. Baseline V2 is a documented two-step process: edit configuration, then update the Microsoft Form in its native editor and submit a test response. Show an explicit checklist and last-reviewed date. Form question changes can require remapping Get response details/Create item fields in the intake flow. Keep the public response URL stable to preserve the QR placard.

## Email configuration design

- Use placeholders such as ticket number, department, reporting location, and message; reject unknown placeholders.
- Preview using synthetic values; display text safely and avoid arbitrary script/HTML execution.
- Template settings do not permit arbitrary recipients or unrestricted email sending.
- A saved template is configuration, not evidence of email delivery.
- Test missing/invalid template fallback, connector failure, and retries. Flow updates may be needed once to introduce config lookup; later template edits should be data-only.

## Permissions and change management

- Agree role boundaries: department staff, configuration admin, and form/flow maintainer can be different people.
- Enforce access at the list/operation boundary. Hiding the Admin tab alone does not secure configuration.
- Grant only necessary rights; form collaborators and flow co-owners have separate access from SharePoint membership.
- Use conditional updates/version checks to prevent one administrator silently overwriting another's edits.
- Enable suitable version history and record actor/time for configuration changes; document restore/rollback.
- Provisioning is initially done by authorized maintainers, not by granting every app user site-owner privileges.

## Delivery sequence

1. Finish V1 intake, live staff queue, and email call-up; confirm actual site/list/flow ownership.
2. Define the configuration schema and permissions matrix; migrate existing hardcoded values with matching department keys.
3. Implement configuration reads and safe authorized edits with validation, errors, conflict handling, and synthetic previews.
4. Modify notification flow to read templates/settings through approved connectors.
5. Add native editor/run-history links and the Forms synchronization checklist.
6. Test with ordinary staff and designated admins in the target tenant.
7. Publish through Forge/Firepit and hand off a short maintainer guide with owner/co-owner contacts.

## Acceptance

- Admin changes a reporting room; staff see it after the documented refresh interval without republishing.
- Template changes affect subsequent test notifications without editing the flow design.
- Unauthorized staff cannot change configuration by app or direct list access.
- Admin can find the form and both flows from one screen, subject to native permissions.
- Editing a service clearly identifies the separate Forms update required; a new form response maps to the intended department/service.
- Deactivation retains historical tickets; conflicting edits produce a clear conflict rather than silent overwrite.
- Rollback and personnel handoff are documented and tested.

## Deferred

Embedding full Forms/Power Automate designers, programmatic form schema editing, automatic deployment/provisioning across NRCs, and automatic tenant-wide role management. These are not prerequisites for useful administration.
