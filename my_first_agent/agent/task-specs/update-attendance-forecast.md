# Update Attendance Forecast Task Specification

## Basic Information

- **Task ID:** T4
- **Task name:** Update attendance forecast
- **Task type:** Remember
- **Task owner:** CPVC event organizer

## 1. Task Description

This task updates the forecast when a participant says they plan to attend, either in the confirmation request or the final check-in. A fixed rule applies: the participant's status becomes "Confirmed," their attendance probability becomes the historical attendance rate for confirmed registrants, and the event totals are recalculated. Confirmed participants are still not counted as certain attendees.

## 2. Inputs

### Input 1

- **Input name:** Confirmation response or Final check-in response
- **Contents and format:** Structured record with registration ID, response "plans to attend," response time, and reminders sent.
- **Source:** T3: Send confirmation request (through D1), or T7: Send final check-in (through D4)

### Input 2

- **Input name:** Historical attendance data
- **Contents and format:** Aggregate table of past CPVC events, including the attendance rate for confirmed registrants.
- **Source:** T12: Update aggregate forecast data

### Input 3

- **Input name:** Event attendance forecast record
- **Contents and format:** Aggregate structured record with event ID, total registrations, confirmed, declined, unsure, and no-response counts, expected attendance, and last-updated time.
- **Source:** HackTrack forecast store (maintained by T2, T4, T5, and T6)

- **If a required input is missing or invalid:** If the response or forecast record is missing, the forecast is not changed and the case is handed to the CPVC event organizer. If no historical rate for confirmed registrants exists, the task does not assume one; it flags "Confirmed rate missing" and hands the case to the CPVC event organizer.

## 3. Outputs

### Output 1

- **Output name:** Updated attendance forecast
- **Contents and format:** The participant's updated forecast entry (status "Confirmed," new attendance probability, reminders sent, opt-out flag) and the recalculated Event attendance forecast record.
- **Next task or recipient:** D2: Final reminder needed and not yet sent?, which routes to T7: Send final check-in or T8: Generate forecast range
- **Complete when:** The participant's status is "Confirmed," the event totals reflect the change exactly once, and the last-updated time is refreshed.

## 4. Planned Tools

### Tool 1

- **Tool name:** `update_attendance_forecast`
- **Input:** Confirmation response or Final check-in response; Historical attendance data; Event attendance forecast record
- **Output:** Updated attendance forecast
- **Implementation Route:** Database queries and functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Changes the participant's status and probability and recalculates the event totals.
- **Task timeout:** 30 seconds
- **Maximum retries:** 2
- **Retry only when:** The database write times out or returns a temporary connection error. Wait 5 seconds before each retry. The tool recalculates totals from all participant entries rather than adding to them, so a retry cannot double count a participant.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Forecast update failed" with the response attached and hand the case to the CPVC event organizer. Do not continue to D2 until the update is saved.
