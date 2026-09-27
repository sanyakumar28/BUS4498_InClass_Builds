# Organizer Reviews Recommendation Task Specification

## Basic Information

- **Task ID:** H1
- **Task name:** Organizer reviews recommendation
- **Task type:** Decide
- **Task owner:** CPVC event organizer

## 1. Task Description

In this task, the CPVC event organizer reviews the attendance forecast range and the draft supply recommendation from T9 and decides whether to approve the supply plan. This is human judgment: the organizer weighs the tradeoff between shortage risk and leftover waste, checks the labeled assumptions, and resolves any unresolved issues or escalations T9 reported. HackTrack only retrieves the materials and records the decision; it never approves on the organizer's behalf. Approval allows the organizer to handle purchasing. Rejection sends a revision request to T10.

## 2. Inputs

### Input 1

- **Input name:** Draft supply recommendation
- **Contents and format:** Structured document with status (completed or escalated), recommended quantities for food, drinks, and swag, selected scenario and buffer, evidence summary, labeled assumptions, subtasks performed, unresolved issues, and handoff note.
- **Source:** T9: Plan food drinks and swag

### Input 2

- **Input name:** Attendance forecast range
- **Contents and format:** Structured record with low, likely, and high estimates, aggregate counts, forecast date, confidence level, and reasons for uncertainty.
- **Source:** T8: Generate forecast range

- **If a required input is missing or invalid:** If the Draft supply recommendation or Attendance forecast range is missing, the organizer does not approve. The organizer records the decision "Not approved – materials incomplete," which sends the case to T10 or back to T9 for regeneration.

## 3. Outputs

### Output 1

- **Output name:** Organizer decision
- **Contents and format:** Structured record with the decision (approved or not approved), organizer name or role, decision date, and the approved scenario and quantities if approved.
- **Next task or recipient:** If approved: the organizer handles purchasing, and the workflow waits until event day (E1: Event check-in period begins). If not approved: T10: Adjust planning assumptions.
- **Complete when:** The decision is recorded with the organizer's name or role and date. A missed deadline or no response is not a decision and is never treated as approval.

### Output 2

- **Output name:** Organizer revision request
- **Contents and format:** Written notes from the organizer stating what to change, such as budget, per-attendee rates, buffer preference, supply categories, or forecast settings.
- **Next task or recipient:** T10: Adjust planning assumptions
- **Complete when:** The request is saved and names at least one specific change. Required only when the decision is "not approved."

## 4. Planned Tools

### Tool 1

- **Tool name:** `retrieve_recommendation_for_review`
- **Input:** Draft supply recommendation; Attendance forecast range
- **Output:** Review packet shown to the organizer (no decision)
- **Implementation Route:** Database queries
- **Integration approach:** Direct integration
- **Role in this task:** Retrieves the latest draft and forecast range and presents them together to the organizer. It does not summarize away escalations or unresolved issues.
- **Task timeout:** Human response deadline: 2 business days after the draft is saved, or 1 business day before the purchasing deadline, whichever comes first. Retrieval itself times out after 30 seconds.
- **Maximum retries:** Not applicable — manual task. Retrieval may be retried 2 times on a temporary connection error.
- **Retry only when:** Retrieval times out or returns a temporary connection error; wait 5 seconds before each retry. Retrieval is read-only and cannot create duplicates.
- **On timeout, exhausted retries, or an error that cannot be retried:** If retrieval fails, the organizer is notified that the review packet is unavailable and the recommendation stays unapproved. If the human response deadline passes without a decision, the case is recorded as "Review overdue – not approved" and handed to the designated resource-planning reviewer.

### Tool 2

- **Tool name:** `record_organizer_decision`
- **Input:** Organizer's decision and any revision notes
- **Output:** Organizer decision; Organizer revision request
- **Implementation Route:** Database queries
- **Integration approach:** Direct integration
- **Role in this task:** Records exactly what the organizer decided. It does not make, infer, or change the decision.
- **Task timeout:** 30 seconds
- **Maximum retries:** 2
- **Retry only when:** The database write times out or returns a temporary connection error. Wait 5 seconds before each retry. Each decision is saved with the draft's task-run ID, and the tool checks whether a decision for that ID already exists before retrying, which prevents duplicate decisions.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Decision not saved," keep the organizer's entry, and ask the organizer to confirm it. The plan is not treated as approved until the decision is saved.
