// Common flow patterns that can be used as starting points

export const FLOW_TEMPLATES = {
  screenContactCapture: {
    prompt:
      "Create a screen flow that captures a contact's first name, last name, and email, then creates a Contact record",
    description: "Basic contact capture screen flow",
  },
  screenCaseSubmission: {
    prompt:
      "Create a screen flow for submitting a support case with subject, description, and priority, then creates a Case record",
    description: "Support case submission form",
  },
  autoLeadConversion: {
    prompt:
      "Create an auto-launched flow that triggers when a Lead is updated, checks if the Lead status is 'Qualified', and if so creates an Account and Contact from the Lead data",
    description: "Automated lead conversion",
  },
  screenApprovalRequest: {
    prompt:
      "Create a screen flow that allows a user to submit an approval request for an Opportunity. Show the opportunity details on screen, collect approval comments, and create a Task for the approver",
    description: "Opportunity approval request",
  },
  autoEmailNotification: {
    prompt:
      "Create an auto-launched flow that triggers after an Account is created, looks up the Account owner's email, and sends a welcome notification email",
    description: "New account email notification",
  },
};
