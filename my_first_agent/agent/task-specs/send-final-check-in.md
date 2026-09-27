# Send Final Check-In Task Specification

## Basic Information

- **Task ID:** T7
- **Task name:** Send final check-in
- **Task type:** Act
- **Task owner:** CPVC event organizer

## 1. Task Description

This task sends the second and last reminder shortly before the event and captures the participant's answer so it can update the forecast. A fixed rule applies: send only when D2 has determined a final reminder is needed, the participant has received exactly one reminder, and the participant has not opted out or declined. This keeps HackTrack at a maximum of two reminders per participant. The response is recorded as plans to attend, cannot attend, unsure, or no response when the response window closes.

## 2. Inputs

### Input 1

- **Input name:** Updated attendance forecast
- **Contents and format:** The participant's forecast entry (registration ID, attendance status, attendance probability, reminders sent, opt-out flag) and the Event attendance forecast record.
- **Source:** T4: Update attendance forecast or T6: Apply historical probability (through D2)

### Input 2

- **Input name:** Reminder settings
- **Contents and format:** Structured settings with the final check-in send date, response window length, and approved message text.
- **Source:** CPVC event organizer

- **If a required input is missing or invalid:** If the participant's reminders sent is not exactly 1, or the participant has opted out or declined, no message is sent and the participant continues to T8 with their current forecast. If the Reminder settings are incomplete, no message is sent, the case is flagged "Reminder not configured," and it is handed to the CPVC event organizer.

## 3. Outputs

### Output 1

- **Output name:** Final check-in response
- **Contents and format:** Structured record with registration ID, response (plans to attend, cannot attend, unsure, or no response), response time, send status (sent or uncertain), and reminders sent (2).
- **Next task or recipient:** D4: Final check-in response?, which routes to T4: Update attendance forecast, T5: Remove expected attendee, or T6: Apply historical probability
- **Complete when:** A response is recorded, or the response window has closed and the response is recorded as "no response." Reminders sent is set to 2 so D2 does not send another reminder.

## 4. Planned Tools

### Tool 1

- **Tool name:** `send_final_check_in`
- **Input:** Updated attendance forecast; Reminder settings
- **Output:** Final check-in response (send status and reminders sent)
- **Implementation Route:** Web API calls to the CPVC registration system's messaging service
- **Integration approach:** Direct integration
- **Role in this task:** Checks the reminder count and opt-out flag, sends the approved final check-in message by registration ID, and records the send status.
- **Task timeout:** 1 minute
- **Maximum retries:** 1
- **Retry only when:** The messaging service returns a confirmed failure showing the message was not sent. Wait 1 minute before retrying. Each message uses the registration ID plus "final check-in" as a unique key, and the tool checks the send log before retrying, so the participant never receives the final check-in twice.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the send status as "not sent" or "uncertain." If uncertain, do not resend. Set reminders sent to 2 so no further reminder is attempted, hand the case to the CPVC event organizer, and record the response as "no response" so it routes to T6. Do not record the check-in as successfully sent.

### Tool 2

- **Tool name:** `record_final_check_in_response`
- **Input:** Participant replies from the messaging service
- **Output:** Final check-in response
- **Implementation Route:** Web API calls and database queries
- **Integration approach:** Direct integration
- **Role in this task:** Captures the participant's reply, maps it to one of the four response values, and saves the Final check-in response. When the response window closes without a reply, it records "no response."
- **Task timeout:** 30 seconds per response recorded
- **Maximum retries:** 2
- **Retry only when:** The database write times out or returns a temporary connection error. Wait 5 seconds before each retry. Only one Final check-in response is stored per registration ID; a retry updates the same record rather than creating a new one.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status "Response not saved" with the raw reply attached and hand the case to the CPVC event organizer. Do not route the participant through D4 until the response is saved.
