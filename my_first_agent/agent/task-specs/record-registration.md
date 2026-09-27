# Record Registration Task Specification

## Basic Information

- **Task ID:** T1
- **Task name:** Record registration
- **Task type:** Remember
- **Task owner:** CPVC event organizer

## 1. Task Description

This task starts the workflow when a participant registers for the CPVC event. It stores only the information HackTrack needs for attendance planning so that later tasks can estimate and update attendance. A fixed rule applies: the task keeps the registration ID, registration date, event type, optional attendance-confidence response, and reminder opt-out choice. It does not store unrelated personal data or infer sensitive characteristics. Contact details stay in CPVC's registration system and are referenced only by registration ID.

## 2. Inputs

### Input 1

- **Input name:** Registration submission
- **Contents and format:** Structured form record containing registration ID, registration date and time, event type, optional attendance-confidence response (likely, unsure, or blank), and reminder opt-out flag (yes or no).
- **Source:** CPVC event registration form

- **If a required input is missing or invalid:** If the registration ID, registration date, or event type is missing or invalid, the record is not saved. The submission is flagged as "Invalid registration" and routed to the CPVC event organizer for correction. A blank attendance-confidence response is allowed and is stored as "Not provided."

## 3. Outputs

### Output 1

- **Output name:** Registration record
- **Contents and format:** Structured record with registration ID, registration date, event type, attendance-confidence response, reminder opt-out flag, and record status "Registered."
- **Next task or recipient:** T2: Estimate initial attendance
- **Complete when:** The record is saved in the HackTrack registration store with a unique registration ID and status "Registered."

## 4. Planned Tools

### Tool 1

- **Tool name:** `record_registration`
- **Input:** Registration submission
- **Output:** Registration record
- **Implementation Route:** Database queries
- **Integration approach:** Direct integration
- **Role in this task:** Validates the required fields, keeps only the permitted fields, and writes one Registration record to the HackTrack registration store.
- **Task timeout:** 30 seconds
- **Maximum retries:** 2
- **Retry only when:** The database write times out or returns a temporary connection error. Wait 5 seconds before each retry. Before retrying, the tool checks whether a record with the same registration ID already exists; if it does, the tool does not write again, which prevents duplicate records.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Registration not saved" with the error details and hand the case to the CPVC event organizer. If it is uncertain whether the record was saved, do not retry; the organizer confirms. Do not continue to T2.
