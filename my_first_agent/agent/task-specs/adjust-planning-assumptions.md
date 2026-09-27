# Adjust Planning Assumptions Task Specification

## Basic Information

- **Task ID:** T10
- **Task name:** Adjust planning assumptions
- **Task type:** Reason
- **Task owner:** CPVC event organizer

## 1. Task Description

This task runs when the organizer does not approve the supply plan. It converts the organizer's written revision request into specific, structured changes to the planning assumptions so the forecast and supply plan can be regenerated. It follows a fixed procedure: a language model reads the revision request and maps each requested change to one of the approved assumption fields, and the task applies only those changes. The model may not add changes the organizer did not state, and any ambiguous request goes back to the organizer. The updated assumptions then flow back to T8 and, through approved planning records, to T9.

## 2. Inputs

### Input 1

- **Input name:** Organizer revision request
- **Contents and format:** Written notes from the organizer stating what to change.
- **Source:** H1: Organizer reviews recommendation

### Input 2

- **Input name:** Current planning assumptions
- **Contents and format:** Structured record of the forecast settings (past events included, forecast date) and planning inputs (budget, per-attendee rates, buffer preference, supply categories, shortage and waste limits) used in the rejected plan.
- **Source:** CPVC approved planning records

- **If a required input is missing or invalid:** If the revision request is missing or names no specific change, no assumptions are changed and the case returns to the CPVC event organizer for clarification. If the current planning assumptions cannot be retrieved, the case is handed to the CPVC event organizer.

## 3. Outputs

### Output 1

- **Output name:** Adjusted planning assumptions
- **Contents and format:** Structured list of changes, each showing the field, the old value, the new value, and the part of the organizer's request it came from, plus a revision number.
- **Next task or recipient:** T8: Generate forecast range, and CPVC approved planning records (used by T9: Plan food drinks and swag)
- **Complete when:** Every requested change is mapped to a field and saved, no unrequested fields were changed, and the revision number is incremented.

## 4. Planned Tools

### Tool 1

- **Tool name:** `interpret_revision_request`
- **Input:** Organizer revision request; Current planning assumptions
- **Output:** Adjusted planning assumptions (proposed changes, not yet saved)
- **Implementation Route:** Web API calls to the Groq API using model `openai/gpt-oss-120b`
- **Integration approach:** Direct integration
- **Role in this task:** Maps each change in the organizer's notes to an approved assumption field and flags any part of the request that is ambiguous or outside the approved fields.
- **Task timeout:** 1 minute
- **Maximum retries:** 1
- **Retry only when:** The API call times out, returns a temporary server error, or returns a change to a field outside the approved list. Wait 10 seconds before retrying. This tool does not change any records.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Revision not interpreted" and return the case to the CPVC event organizer to enter the changes directly. Do not send unchanged assumptions to T8 as if they were revised.

### Tool 2

- **Tool name:** `adjust_planning_assumptions`
- **Input:** Adjusted planning assumptions (proposed changes)
- **Output:** Adjusted planning assumptions
- **Implementation Route:** Database queries
- **Integration approach:** Direct integration
- **Role in this task:** Saves the mapped changes to the approved planning records with a new revision number.
- **Task timeout:** 30 seconds
- **Maximum retries:** 2
- **Retry only when:** The database write times out or returns a temporary connection error. Wait 5 seconds before each retry. Each save uses the revision number as a unique key, and the tool checks whether that revision already exists before retrying, which prevents duplicate revisions.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Assumptions not saved" and hand the case to the CPVC event organizer. If this is the third revision cycle for the same event without approval, hand the case to the designated resource-planning reviewer instead of looping again.
