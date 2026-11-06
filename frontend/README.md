# Next in Line dashboard

Open the frontend folder in Forge and ship `index.html` for SharePoint. Upload the current export to the staff site and point the Firepit page at it.

- **Department Queue** uses the signed-in SharePoint account to call tickets, start service, and complete tickets.
- **Waiting Room TV** shows called tickets and waiting counts from SharePoint.
- **Metrics** reads ticket counts, wait times, and completed-ticket counts from SharePoint.
- **Configuration** reads reporting rooms from QueueConfiguration and documents the form, list, and flow setup.

The public intake uses a separate Microsoft Form.

See the [SharePoint and Power Automate setup guide](../SETUP.md) for deployment. After shipping, use a synthetic form response to verify queue loading, call-up email, service completion, TV updates, and Metrics in Firepit.
