# Apply Historical Probability Task Specification

## Basic Information

- **Task ID:** T6
- **Task name:** Apply historical probability
- **Task type:** Reason
- **Task owner:** CPVC event organizer

## 1. Task Description

This task handles participants who answered "unsure" or did not respond, so their uncertainty is reflected in the forecast instead of being counted as a yes or a no. A fixed rule applies: the participant's attendance probability becomes the historical attendance rate for that response category (unsure or no response), and the event totals are recalculated. Opted-out participants and participants whose message status was uncertain are treated as "no response."

## 2. Inputs

### Input 1

- **Input name:** Confirmation response or Final check-in response
- **Contents and format:** Structured record with registration ID, response "unsure" or "no response," response time, send status, and reminders sent.
- **Source:** T3: Send confirmation request (through D1), or T7: Send final check-in (through D4)

### Input 2

- **Input name:** Historical attendance data
- **Contents and format:** Aggregate table of past CPVC events, including attendance rates for unsure and no-response registrants.
- **Source:** T12: Update aggregate forecast data

### Input 3

- **Input name:** Event attendance forecast record
- **Contents and format:** Aggregate structured record with event ID, total registrations, confirmed, declined, unsure, and no-response counts, expected attendance, and last-updated time.
- **Source:** HackTrack forecast store (maintained by T2, T4, T5, and T6)

- **If a required input is missing or invalid:** If the response or forecast record is missing, the forecast is not changed and the case is handed to the CPVC event organizer. If no historical rate exists for the response category, the participant keeps the overall historical rate assigned in T2, and the task flags "Category rate missing" for the CPVC event organizer.

## 3. Outputs

### Output 1

- **Output name:** Updated attendance forecast
- **Contents and format:** The participant's updated forecast entry (status "Unsure" or "No response," new attendance probability, the rate used, reminders sent, opt-out flag) and the recalculated Event attendance forecast record.
- **Next task or recipient:** D2: Final reminder needed and not yet sent?, which routes to T7: Send final check-in or T8: Generate forecast range
- **Complete when:** The participant's status and probability are saved, the event totals reflect the change exactly once, and the last-updated time is refreshed.

## 4. Planned Tools

### Tool 1

- **Tool name:** `apply_historical_probability`
- **Input:** Confirmation response or Final check-in response; Historical attendance data; Event attendance forecast record
- **Output:** Updated attendance forecast
- **Implementation Route:** Database queries and functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Looks up the historical rate for the response category, assigns it to the participant, and recalculates the event totals.
- **Task timeout:** 30 seconds
- **Maximum retries:** 2
- **Retry only when:** The database query or write times out or returns a temporary connection error. Wait 5 seconds before each retry. The tool recalculates totals from all participant entries, so a retry cannot double count a participant.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Forecast update failed" with the response attached and hand the case to the CPVC event organizer. Do not continue to D2 until the update is saved.
