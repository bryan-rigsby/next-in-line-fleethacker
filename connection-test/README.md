# SharePoint connection test

This is a separate diagnostic app; the queue frontend is unchanged.

1. In Forge, open this `connection-test` folder as the app folder.
2. Ship -> Ship for SharePoint. If offered list integration, choose Ship as-is: this test already has explicit read/create calls against QueueConnectionTest. It does not need the full sync library for this diagnostic.
3. Use synthetic data only. Review actual compiler findings; do not treat Firepit hosting as proof of application authorization.
4. Upload the shipped current HTML to a separate Firepit test page. Enable the host's approved SharePoint API access configuration; Lockdown must not block these requests.
5. Enter the target site's home URL and click Connect and read list. Confirm the signed-in identity and list result.
6. Add Alpha-Test from account A. From a separate account B with test-list read access, connect and refresh. Confirm Alpha-Test appears. Have B add Bravo-Test (requires add permission) and refresh A.
7. Record exact success/error text. A 403 indicates permissions/policy to investigate; a 404 can mean wrong site/list or concealed access. A browser/network error can indicate sandbox/host request restrictions; this test uses the browser fetch surface as exposed by the installed Firepit version, not a guessed private bridge. Do not disable security controls or add tokens to work around failures.

Scope: reads current user, latest 20 list IDs/titles, obtains SharePoint request digest, creates a Title-only item. No list creation, permission changes, notifications, deletion, local persistence, external dependencies, or automatic fallback. Live operation requires testing on the real tenant. Refresh shows at most 20 latest entries, not the complete list.
