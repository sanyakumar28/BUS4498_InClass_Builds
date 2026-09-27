# Remove Expected Attendee Task Specification

## Basic Information

- **Task ID:** T5
- **Task name:** Remove expected attendee
- **Task type:** Remember
- **Task owner:** CPVC event organizer

## 1. Task Description

This task updates the forecast when a participant says they cannot attend, either in the confirmation request or the final check-in. A fixed rule applies: the participant's status becomes "Declined," their attendance probability becomes 0, no further reminders are sent to them, and the event totals are recalculated. The registration itself is not deleted, since changing registration records is outside HackTrack's role.

## 2. Inputs

### Input 1

- **Input name:** Confirmation response or Final check-in response
- **Contents and format:** Structured record with registration ID, response "cannot attend," response time, and reminders sent.
- **Source:** T3: Send confirmation request (through D1), or T7: Send final check-in (through D4)

### Input 2

- **Input name:** Event attendance forecast record
- **Contents and format:** Aggregate structured record with event ID, total registrations, confirmed, declined, unsure, and no-response counts, expected attendance, and last-updated time.
- **Source:** HackTrack forecast store (maintained by T2, T4, T5, and T6)

- **If a required input is missing or invalid:** If the response or forecast record is missing, the forecast is not changed and the case is handed to the CPVC event organizer.

## 3. Outputs

### Output 1

- **Output name:** Updated attendance forecast
- **Contents and format:** The participant's updated forecast entry (status "Declined," attendance probability 0, reminders stopped) and the recalculated Event attendance forecast record.
- **Next task or recipient:** T8: Generate forecast range
- **Complete when:** The participant's status is "Declined," their probability is 0, they are excluded from further reminders, and the event totals reflect the change exactly once.

## 4. Planned Tools

### Tool 1

- **Tool name:** `remove_expected_attendee`
- **Input:** Confirmation response or Final check-in response; Event attendance forecast record
- **Output:** Updated attendance forecast
- **Implementation Route:** Database queries and functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Sets the participant's status to "Declined," sets their probability to 0, stops their reminders, and recalculates the event totals.
- **Task timeout:** 30 seconds
- **Maximum retries:** 2
- **Retry only when:** The database write times out or returns a temporary connection error. Wait 5 seconds before each retry. The tool recalculates totals from all participant entries rather than subtracting from them, so a retry cannot remove a participant twice.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Forecast update failed" with the response attached and hand the case to the CPVC event organizer. Do not continue to T8 until the update is saved.
