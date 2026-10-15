// Fixture help-center articles and reply templates used by the responder's tools.
export const KB_ARTICLES = [
  { id: "KB-101", title: "How refunds work", tags: ["refund", "billing", "charge", "money back"], body: "Refunds are issued to the original payment method within 5-10 business days. Annual plans can be refunded pro rata within 30 days." },
  { id: "KB-102", title: "Understanding your invoice and VAT", tags: ["invoice", "vat", "tax", "billing"], body: "VAT is calculated from the billing address. Update it under Settings > Billing and we reissue the invoice." },
  { id: "KB-201", title: "Troubleshooting API 5xx errors", tags: ["api", "503", "500", "5xx", "error", "outage"], body: "Retry with exponential backoff, check status.acmecloud.example for active incidents, and include the request id when contacting support." },
  { id: "KB-202", title: "Webhook delivery and retries", tags: ["webhook", "delivery", "retry"], body: "Failed webhooks are retried for 72 hours with exponential backoff. Delivery logs are under Developers > Webhooks." },
  { id: "KB-301", title: "Resetting two-factor authentication", tags: ["2fa", "login", "locked", "password", "account"], body: "Use a backup code, or ask an organisation owner to reset 2FA from the Members page." },
  { id: "KB-401", title: "Reporting a security issue", tags: ["security", "vulnerability", "breach", "phishing"], body: "Email security@acmecloud.example. Do not include exploit details in a public ticket." },
];

export const RESPONSE_TEMPLATES = {
  acknowledge: "Hi {customer_name},\n\nThanks for reaching out about \"{subject}\". {body}\n\nBest regards,\n{company_name} Support",
  incident: "Hi {customer_name},\n\nWe are aware of an ongoing incident ({incident_id}) that matches what you describe and our engineers are working on it. {body}\n\nYou can follow updates on our status page.\n\nBest regards,\n{company_name} Support",
  escalated: "Hi {customer_name},\n\nThanks for your report. Given its urgency we have escalated it to our {team_name} team, who will reply within {sla_hours} hour(s). {body}\n\nBest regards,\n{company_name} Support",
  feature_request: "Hi {customer_name},\n\nThank you for the suggestion! We've shared it with our product team. {body}\n\nBest regards,\n{company_name} Support",
};
