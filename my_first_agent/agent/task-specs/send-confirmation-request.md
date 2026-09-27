# Send Confirmation Request Task Specification

## Basic Information

- **Task ID:** T3
- **Task name:** Send confirmation request
- **Task type:** Act
- **Task owner:** CPVC event organizer

## 1. Task Description

This task sends one concise confirmation request several days before the event and captures the participant's answer so the forecast can use real responses. A fixed rule applies: send exactly one request per registration ID, never send to participants who opted out, and record the response as plans to attend, cannot attend, unsure, or no response when the response window closes. The response window and send date are set by the CPVC event organizer in the event settings.

## 2. Inputs

### Input 1

- **Input name:** Participant forecast entry
- **Contents and format:** Structured record with registration ID, attendance status, attendance probability, reminders sent, and reminder opt-out flag.
- **Source:** T2: Estimate initial attendance

### Input 2

- **Input name:** Reminder settings
- **Contents and format:** Structured settings with the confirmation request send date, response window length, and approved message text.
- **Source:** CPVC event organizer

- **If a required input is missing or invalid:** If the Participant forecast entry is missing, or the Reminder settings have no send date, response window, or approved message text, no message is sent. The case is flagged "Reminder not configured" and handed to the CPVC event organizer.

## 3. Outputs

### Output 1

- **Output name:** Confirmation response
- **Contents and format:** Structured record with registration ID, response (plans to attend, cannot attend, unsure, or no response), response time, send status (sent, not sent because opted out, or uncertain), and reminders sent (1, or 0 if opted out).
- **Next task or recipient:** D1: Participant response?, which routes to T4: Update attendance forecast, T5: Remove expected attendee, or T6: Apply historical probability
- **Complete when:** A response is recorded, or the response window has closed and the response is recorded as "no response." Opted-out participants are recorded as "no response" without a message being sent.

## 4. Planned Tools

### Tool 1

- **Tool name:** `send_confirmation_request`
- **Input:** Participant forecast entry; Reminder settings
- **Output:** Confirmation response (send status and reminders sent)
- **Implementation Route:** Web API calls to the CPVC registration system's messaging service
- **Integration approach:** Direct integration
- **Role in this task:** Sends the approved confirmation message to the participant by registration ID and records the send status. Contact details are looked up by the messaging service and are not stored by HackTrack.
- **Task timeout:** 1 minute
- **Maximum retries:** 1
- **Retry only when:** The messaging service returns a confirmed failure showing the message was not sent. Wait 1 minute before retrying. Each message uses the registration ID plus "confirmation request" as a unique key, and the tool checks the send log before retrying, so the same participant never receives the request twice.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the send status as "not sent" or "uncertain." If uncertain, do not resend. Hand the case to the CPVC event organizer, and record the response as "no response" so the participant stays at the historical probability in T6. Do not record the request as successfully sent.

### Tool 2

- **Tool name:** `record_confirmation_response`
- **Input:** Participant replies from the messaging service
- **Output:** Confirmation response
- **Implementation Route:** Web API calls and database queries
- **Integration approach:** Direct integration
- **Role in this task:** Captures the participant's reply, maps it to one of the four response values, and saves the Confirmation response. When the response window closes without a reply, it records "no response."
- **Task timeout:** 30 seconds per response recorded
- **Maximum retries:** 2
- **Retry only when:** The database write times out or returns a temporary connection error. Wait 5 seconds before each retry. Only one Confirmation response is stored per registration ID; a retry updates the same record rather than creating a new one.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Response not saved" with the raw reply attached and hand the case to the CPVC event organizer. Do not route the participant through D1 until the response is saved.
