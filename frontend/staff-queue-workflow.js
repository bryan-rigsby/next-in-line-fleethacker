/* Shared, side-effect-free-until-validated local demo transitions. No network operations. */
(function (root) {
  "use strict";
  function apply(ticket, action, options = {}) {
    if (!ticket) throw new Error("Ticket not found. Refresh the queue.");
    const now = options.now ?? Date.now();
    const requireStatus = expected => {
      if (ticket.status !== expected) throw new Error(`Action requires ${expected}; ticket is ${ticket.status}.`);
    };
    if (action === "call") {
      requireStatus("Waiting");
      const room = String(options.room || "").trim();
      const message = String(options.message || "").trim();
      if (!room || room.length > 100 || !message || message.length > 250) throw new Error("Provide a location (1–100 characters) and message (1–250 characters).");
      ticket.status = "Called";
      ticket.calledAt = now;
      ticket.firstCalledAt = ticket.firstCalledAt || now;
      ticket.room = room; ticket.message = message;
      ticket.notification = { status: ticket.email ? "Pending" : "Failed", attempts: ticket.email ? 1 : 0, error: ticket.email ? "" : "Missing email address; no notification can be requested." };
    } else if (action === "serve") {
      requireStatus("Called"); ticket.status = "Serving"; ticket.servedAt = now;
    } else if (action === "done") {
      requireStatus("Serving"); ticket.status = "Done"; ticket.doneAt = now;
    } else if (action === "no-show") {
      requireStatus("Called"); ticket.status = "NoShow"; ticket.doneAt = now;
    } else if (action === "email-sent" || action === "email-failed") {
      if (ticket.notification?.status !== "Pending") throw new Error("Only a pending simulated notification can be resolved.");
      ticket.notification.status = action === "email-sent" ? "Simulated success" : "Failed";
      ticket.notification.error = action === "email-failed" ? "Simulated delivery failure. Ticket status is unchanged." : "";
    } else if (action === "email-retry") {
      if (ticket.notification?.status !== "Failed" || !ticket.email) throw new Error("A failed notification with an email address is required to retry.");
      ticket.notification.status = "Pending"; ticket.notification.error = ""; ticket.notification.attempts++;
    } else throw new Error("Unsupported queue action.");
    ticket.events = [...(ticket.events || []), { action, at: now, actor: "Local demo staff" }];
    return ticket;
  }
  const api = { apply };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.StaffQueueWorkflow = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
