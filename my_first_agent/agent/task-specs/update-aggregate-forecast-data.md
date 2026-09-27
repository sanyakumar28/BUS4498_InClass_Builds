# Update Aggregate Forecast Data Task Specification

## Basic Information

- **Task ID:** T12
- **Task name:** Update aggregate forecast data
- **Task type:** Learn
- **Task owner:** CPVC event organizer

## 1. Task Description

This task closes the workflow by comparing the forecast with actual attendance and saving the results so future forecasts and supply plans improve. A fixed rule applies: it calculates the actual attendance-to-registration rate, the attendance rate for each response category, and the forecast error (the difference between the likely estimate and actual attendance). It combines these with the organizer's report of what was purchased, left over, and short. Only aggregate data is saved; no individual participant identities are kept in the historical record.

## 2. Inputs

### Input 1

- **Input name:** Event attendance summary
- **Contents and format:** Aggregate structured record with event ID, total checked-in registrants, walk-in count, total attendance, and check-in period times.
- **Source:** T11: Record event check-ins

### Input 2

- **Input name:** Attendance forecast range
- **Contents and format:** The final forecast range used for the approved plan, with low, likely, and high estimates, aggregate response counts, forecast date, and confidence level.
- **Source:** T8: Generate forecast range

### Input 3

- **Input name:** Post-event supply outcomes
- **Contents and format:** Structured report with quantities purchased, leftovers, and shortages for each supply category, and total spending.
- **Source:** CPVC event organizer

- **If a required input is missing or invalid:** If the Event attendance summary or Attendance forecast range is missing, no historical record is saved and the case is handed to the CPVC event organizer. If the Post-event supply outcomes are missing, the attendance results are saved, the record is marked "Supply outcomes pending," and the CPVC event organizer is asked to provide them. The workflow is not complete until they are added.

## 3. Outputs

### Output 1

- **Output name:** Historical attendance data
- **Contents and format:** Aggregate record added to the historical table with event ID, registration count, actual attendance, attendance-to-registration rate, rates by response category, and forecast error.
- **Next task or recipient:** HackTrack historical data store, used by T2: Estimate initial attendance, T4: Update attendance forecast, T6: Apply historical probability, and T8: Generate forecast range for future events
- **Complete when:** The record is saved once for the event ID with all attendance fields filled in.

### Output 2

- **Output name:** Historical resource outcomes
- **Contents and format:** Aggregate record with event ID, actual attendance, quantities purchased, leftovers, shortages, and total spending.
- **Next task or recipient:** CPVC event records, used by T9: Plan food drinks and swag (Input 4) for future events
- **Complete when:** The record is saved once for the event ID with all supply fields filled in. When both outputs are complete, the workflow reaches C1: Workflow complete.

## 4. Planned Tools

### Tool 1

- **Tool name:** `update_aggregate_forecast_data`
- **Input:** Event attendance summary; Attendance forecast range; Post-event supply outcomes
- **Output:** Historical attendance data; Historical resource outcomes
- **Implementation Route:** Database queries and functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Calculates the actual rates and forecast error and saves one aggregate historical record per event.
- **Task timeout:** 2 minutes
- **Maximum retries:** 2
- **Retry only when:** The query or write times out or returns a temporary connection error. Wait 10 seconds before each retry. Each record is keyed by event ID, and the tool checks whether that event's record already exists before retrying, so the same event is never added to the history twice.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Historical data not updated" and hand the case to the CPVC event organizer. If it is uncertain whether the record was saved, do not retry; the organizer confirms. The workflow does not reach C1 until the records are saved.
