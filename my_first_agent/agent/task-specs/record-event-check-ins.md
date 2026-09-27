# Record Event Check-Ins Task Specification

## Basic Information

- **Task ID:** T11
- **Task name:** Record event check-ins
- **Task type:** Sense
- **Task owner:** CPVC event organizer

## 1. Task Description

This task starts the event-day stage when the event check-in period begins. It records who actually arrives so the forecast can be compared with real attendance. A fixed rule applies: each check-in is matched to a registration ID and marks that participant "Checked in" exactly once; arrivals without a registration are counted as walk-ins without storing personal details. When the check-in period ends, the task produces an aggregate attendance summary.

## 2. Inputs

### Input 1

- **Input name:** Check-in entries
- **Contents and format:** Structured entries with registration ID (or "walk-in") and check-in time, captured at the event check-in desk.
- **Source:** CPVC check-in volunteers using the event check-in system

### Input 2

- **Input name:** Check-in period settings
- **Contents and format:** Check-in period start and end times.
- **Source:** CPVC event organizer

- **If a required input is missing or invalid:** An entry with an unknown registration ID is not matched to anyone; it is flagged "Unmatched check-in" for the CPVC event organizer to resolve. If the check-in period settings are missing, the task does not produce a final summary until the CPVC event organizer confirms the end of check-in.

## 3. Outputs

### Output 1

- **Output name:** Event attendance summary
- **Contents and format:** Aggregate structured record with event ID, total checked-in registrants, walk-in count, total attendance, count of unmatched check-ins, and check-in period start and end times.
- **Next task or recipient:** T12: Update aggregate forecast data
- **Complete when:** The check-in period has ended, each registration ID is counted at most once, unmatched check-ins are resolved or listed, and the summary is saved.

## 4. Planned Tools

### Tool 1

- **Tool name:** `record_event_check_ins`
- **Input:** Check-in entries; Check-in period settings
- **Output:** Event attendance summary
- **Implementation Route:** Database queries
- **Integration approach:** Direct integration
- **Role in this task:** Marks each matched registration as "Checked in," counts walk-ins, and builds the aggregate summary when the check-in period ends.
- **Task timeout:** 30 seconds per check-in entry, and 5 minutes to produce the final summary
- **Maximum retries:** 2
- **Retry only when:** The database write times out or returns a temporary connection error. Wait 5 seconds before each retry. A registration ID can be marked "Checked in" only once, so a retry or a repeated scan cannot count the same person twice.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Check-in not saved" with the entry attached, and the check-in volunteer notes the arrival on the backup paper list. Hand the case to the CPVC event organizer to enter it. Do not produce a final summary until all failed entries are resolved.
