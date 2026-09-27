# Estimate Initial Attendance Task Specification

## Basic Information

- **Task ID:** T2
- **Task name:** Estimate initial attendance
- **Task type:** Reason
- **Task owner:** CPVC event organizer

## 1. Task Description

This task gives each new registrant a starting attendance probability so the event forecast reflects expected attendance instead of raw registration counts. A fixed rule applies: the participant's probability equals CPVC's historical attendance-to-registration rate. If historical data shows a separate rate for the participant's attendance-confidence response, that rate is used instead. The task then updates the event-level forecast by adding the participant's probability to expected attendance.

## 2. Inputs

### Input 1

- **Input name:** Registration record
- **Contents and format:** Structured record with registration ID, registration date, event type, attendance-confidence response, reminder opt-out flag, and record status.
- **Source:** T1: Record registration

### Input 2

- **Input name:** Historical attendance data
- **Contents and format:** Aggregate table of past CPVC events with registration counts, actual attendance counts, attendance-to-registration rates, and, where available, attendance rates by response category (confirmed, declined, unsure, no response, and attendance-confidence response).
- **Source:** T12: Update aggregate forecast data

- **If a required input is missing or invalid:** If the Registration record is missing or incomplete, the task stops and returns the case to the CPVC event organizer. If no historical attendance-to-registration rate exists, the task does not assume one; it flags "Baseline rate missing" and hands the case to the CPVC event organizer to provide an approved baseline rate.

## 3. Outputs

### Output 1

- **Output name:** Participant forecast entry
- **Contents and format:** Structured record with registration ID, attendance status ("Registered – awaiting confirmation"), attendance probability (0 to 1), the historical rate used, reminders sent (0), and reminder opt-out flag.
- **Next task or recipient:** T3: Send confirmation request
- **Complete when:** The entry is saved in the HackTrack forecast store with an attendance probability and the source of that probability.

### Output 2

- **Output name:** Event attendance forecast record
- **Contents and format:** Aggregate structured record with event ID, total registrations, confirmed count, declined count, unsure count, no-response count, expected attendance (sum of participant probabilities), and last-updated time.
- **Next task or recipient:** HackTrack forecast store, used by T4, T5, T6, and T8
- **Complete when:** Total registrations and expected attendance include the new participant, and the last-updated time is refreshed.

## 4. Planned Tools

### Tool 1

- **Tool name:** `estimate_initial_attendance`
- **Input:** Registration record; Historical attendance data
- **Output:** Participant forecast entry; Event attendance forecast record
- **Implementation Route:** Database queries and functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Looks up the applicable historical rate, assigns it to the participant, and updates the event-level totals.
- **Task timeout:** 30 seconds
- **Maximum retries:** 2
- **Retry only when:** The database query or write times out or returns a temporary connection error. Wait 5 seconds before each retry. Before retrying, the tool checks whether a Participant forecast entry already exists for the registration ID; if it does, the event totals are not incremented again, which prevents double counting.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Initial estimate not saved" and hand the case to the CPVC event organizer. If it is uncertain whether the totals were updated, do not retry; the organizer confirms. Do not continue to T3.
