# Generate Forecast Range Task Specification

## Basic Information

- **Task ID:** T8
- **Task name:** Generate forecast range
- **Task type:** Reason
- **Task owner:** CPVC event organizer

## 1. Task Description

This task turns the event's current attendance data into a low, likely, and high attendance range that T9 uses for supply planning. It follows a fixed procedure. First, a calculation tool computes the likely estimate as the sum of participant probabilities and the low and high estimates from the spread between past forecasts and actual attendance in the historical data. Then a language model, working inside that procedure, assigns a confidence level from a fixed scale (low, medium, or high) and writes a short plain-language explanation of the reasons for uncertainty, such as a large share of non-responses. The model does not change any calculated numbers. The range is regenerated when responses change, on the forecast date set by the organizer, and after T10 adjusts planning assumptions.

## 2. Inputs

### Input 1

- **Input name:** Event attendance forecast record
- **Contents and format:** Aggregate structured record with event ID, total registrations, confirmed, declined, unsure, and no-response counts, expected attendance, and last-updated time.
- **Source:** HackTrack forecast store, updated by T4: Update attendance forecast, T5: Remove expected attendee, and T6: Apply historical probability

### Input 2

- **Input name:** Historical attendance data
- **Contents and format:** Aggregate table of past CPVC events with registration counts, actual attendance, attendance-to-registration rates, rates by response category, and past forecast error.
- **Source:** T12: Update aggregate forecast data

### Input 3

- **Input name:** Adjusted planning assumptions
- **Contents and format:** Structured list of organizer-approved changes to forecast settings, such as which past events to include or the forecast date. Present only after an organizer revision.
- **Source:** T10: Adjust planning assumptions

- **If a required input is missing or invalid:** If the Event attendance forecast record is missing or its counts do not add up to total registrations, no range is produced and the case is handed to the CPVC event organizer. If Historical attendance data is missing, the task does not invent a spread; it flags "Historical data missing" and hands the case to the CPVC event organizer. Adjusted planning assumptions are optional.

## 3. Outputs

### Output 1

- **Output name:** Attendance forecast range
- **Contents and format:** Structured record with low, likely, and high attendance estimates; aggregate registration and response counts; forecast date; confidence level (low, medium, or high); and reasons for uncertainty in two to four sentences.
- **Next task or recipient:** T9: Plan food drinks and swag (Input 1), and H1: Organizer reviews recommendation
- **Complete when:** All three estimates are present with low ≤ likely ≤ high, the confidence level and reasons are filled in, and the record is saved with its forecast date.

## 4. Planned Tools

### Tool 1

- **Tool name:** `generate_forecast_range`
- **Input:** Event attendance forecast record; Historical attendance data; Adjusted planning assumptions
- **Output:** Attendance forecast range (low, likely, and high estimates and counts)
- **Implementation Route:** Database queries and functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Calculates the likely estimate and the low and high estimates using the fixed forecasting formula and saves the numeric range.
- **Task timeout:** 1 minute
- **Maximum retries:** 2
- **Retry only when:** The query or calculation times out or returns a temporary error. Wait 5 seconds before each retry. The tool saves one range per event and forecast date, so a retry replaces the same record rather than creating a new one.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Forecast range not generated" and hand the case to the CPVC event organizer. Do not send a partial range to T9.

### Tool 2

- **Tool name:** `explain_forecast_uncertainty`
- **Input:** Attendance forecast range (numeric estimates and counts); Historical attendance data
- **Output:** Attendance forecast range (confidence level and reasons for uncertainty)
- **Implementation Route:** Web API calls to the Groq API using model `openai/gpt-oss-120b`
- **Integration approach:** Direct integration
- **Role in this task:** Selects a confidence level from the fixed scale and writes the reasons for uncertainty using only the counts and historical data provided. It cannot change the calculated estimates.
- **Task timeout:** 1 minute
- **Maximum retries:** 1
- **Retry only when:** The API call times out, returns a temporary server error, or returns a confidence level outside the fixed scale. Wait 10 seconds before retrying. This tool does not change any records until its output passes the check.
- **On timeout, exhausted retries, or an error that cannot be retried:** Save the numeric range with confidence level "Not assessed" and reasons "Explanation unavailable," mark the range "Incomplete," and hand the case to the CPVC event organizer. Do not send the incomplete range to T9 as complete.
