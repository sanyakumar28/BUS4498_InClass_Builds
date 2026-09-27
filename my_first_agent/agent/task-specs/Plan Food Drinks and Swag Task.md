# Plan Food Drinks and Swag Task Specification  


```yaml

# BASIC INFORMATION
task_id: T9
task_name: Plan Food Drinks and Swag
task_owner: CPVC

# Agent Inference Configuration
Provider: Groq
Model: "openai/gpt-oss-120b"
Role: Supports Permitted Subtasks 1, 2, 4, and 5 by identifying missing or conflicting inputs, interpreting attendance uncertainty, comparing planning scenarios, and drafting the recommendation and its assumptions. All quantity and cost calculations are performed by the calculate_supply_quantities tool, not by the model.
Maximum inference requests per task run: 8
On inference failure or exhausted limits: Record the unresolved status and hand the case to the CPVC event organizer or designated resource-planning reviewer.
```

## 1. Task Goal

- **Objective:** Produce a draft supply plan that recommends quantities of food, drinks, and swag for the event across the low, likely, and high attendance scenarios. A successful plan stays within the available budget, keeps expected shortage and leftover levels within the organizer's stated limits, meets all organizer-provided requirements, and accounts for current inventory, package sizes, and minimum order quantities. Every quantity and cost must trace back to a workflow input or a clearly labeled permitted assumption. The plan uses only aggregate attendance data and is a recommendation for organizer review. It is not an approved plan or a purchase order.

## 2. Inbound Inputs

### Input 1

- **Input name:** Attendance forecast range
- **What it contains:** The low, likely, and high attendance estimates; aggregate registration and response counts; forecast date; confidence level; and reasons for uncertainty.
- **Source:** T8: Generate forecast range

### Input 2

- **Input name:** Event resource requirements
- **What it contains:** The requested supply categories, expected servings or units per attendee, purchasing deadline, and any organizer-provided requirements.
- **Source:** CPVC event organizer and event-planning records

### Input 3

- **Input name:** Budget and purchasing constraints
- **What it contains:** Available budget, current inventory, package sizes, estimated prices, minimum order quantities, purchasing restrictions, and acceptable shortage or waste limits.
- **Source:** CPVC event organizer or approved planning records

### Input 4

- **Input name:** Historical resource outcomes
- **What it contains:** Aggregate information from previous events, such as actual attendance, quantities purchased, leftovers, shortages, and total spending.
- **Source:** T12: Update aggregate forecast data or CPVC event records

## 3. Tool Permissions and Boundaries
### Task-Wide Limits

- **Total task timeout:** 15 minutes of elapsed time for one task run, including all tool calls, inference requests, and retries. Time spent waiting for organizer review in H1 is not counted, because the task stops and takes no autonomous action while awaiting review.
- **Maximum tool calls:** 20 total calls across all tools during one task run, including retries. If this limit is reached, the agent records the unresolved status and hands the case to the CPVC event organizer.

### Tool 1

- **Tool name:** `retrieve_planning_inputs`
- **Input:** Attendance forecast range; Event resource requirements; Budget and purchasing constraints; Historical resource outcomes
- **Output:** Validated planning inputs, with any missing or conflicting values flagged
- **Implementation Route:** Read-only database queries and file operations on approved CPVC planning records
- **Integration approach:** Direct integration
- **Role in this task:** Supports Permitted Subtask 1 (Validate planning inputs), including the one permitted lookup in approved CPVC planning records when information is missing
- **Task timeout:** 2 minutes
- **Maximum retries:** 2
- **Retry only when:** The request times out or returns a temporary connection or server error. Wait 10 seconds before each retry. This tool is read-only, so retries cannot create duplicate records. Do not retry when a record is simply missing or a value is empty; missing data is handled by the escalation rule in Subtask 1.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status as escalated, list which inputs could not be retrieved, and hand the case to the CPVC event organizer. Do not continue to calculations with incomplete inputs.

### Tool 2

- **Tool name:** `calculate_supply_quantities`
- **Input:** Validated planning inputs from Tool 1
- **Output:** Food, drink, and swag quantities and estimated costs for the low, likely, and high attendance scenarios, including buffers, package rounding, and inventory offsets
- **Implementation Route:** Functions/scripts (spreadsheet or calculation script)
- **Integration approach:** Direct integration
- **Role in this task:** Supports Permitted Subtask 2 (Interpret attendance uncertainty) and Permitted Subtask 3 (Calculate supply requirements)
- **Task timeout:** 1 minute per call
- **Maximum retries:** 2
- **Retry only when:** The results contain a calculation error or internal inconsistency, such as line items that do not add up to the total, or a quantity below current inventory offsets. This tool does not change any records. Do not retry because a package size, price, or per-attendee rate is missing; return to Tool 1's lookup or escalate instead.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status as escalated, attach the last calculation attempt and the inconsistency found, and hand the case to the CPVC event organizer or designated resource-planning reviewer. Do not present unverified quantities as a recommendation.

### Tool 3

- **Tool name:** `compare_supply_scenarios`
- **Input:** Scenario quantities and estimated costs from Tool 2; Budget and purchasing constraints
- **Output:** Comparison of conservative, balanced, and budget-sensitive plans by estimated cost, shortage risk, expected leftovers, and participant impact, including any lower-cost alternatives explored
- **Implementation Route:** Functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Supports Permitted Subtask 4 (Compare planning scenarios), including exploring feasible alternatives before escalation
- **Task timeout:** 1 minute per call
- **Maximum retries:** 1
- **Retry only when:** The comparison fails because of a temporary processing error. This tool does not change any records. Running an alternative scenario, such as a reduced buffer, is a new comparison rather than a retry, but it still counts toward the task-wide tool call limit.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the status as escalated, attach the scenarios that were successfully compared, and hand the unresolved tradeoff to the CPVC event organizer. If no scenario satisfies the budget and requirements, present the closest feasible options and what each gives up.

### Tool 4

- **Tool name:** `save_draft_recommendation`
- **Input:** Scenario comparison from Tool 3; labeled assumptions and evidence summary
- **Output:** Outbound deliverable (status, result or recommendation, evidence summary, subtasks performed, unresolved issues, handoff note, and next task or recipient) saved as a draft for H1: Organizer reviews recommendation
- **Implementation Route:** Database queries or file operations that write one draft record to CPVC planning records
- **Integration approach:** Direct integration
- **Role in this task:** Supports Permitted Subtask 5 (Prepare supply recommendation)
- **Task timeout:** 1 minute
- **Maximum retries:** 1
- **Retry only when:** The save fails with a confirmed error and no draft was created. Each draft is saved with a unique task-run ID. Before retrying, the tool checks whether a draft with that ID already exists; if it does, the tool does not save again, which prevents duplicate drafts. The tool never marks a plan as approved, places orders, or notifies participants.
- **On timeout, exhausted retries, or an error that cannot be retried:** If it is uncertain whether the draft was saved, do not retry. Record the status as escalated, keep a local copy of the recommendation, and hand the case to the CPVC event organizer or designated resource-planning reviewer to confirm whether the draft exists.

## 4. How the Agent Should Reason
Permitted and prohibited assumptions (applies to all subtasks):

The agent may make an assumption only if it is derived from a workflow input, and each assumption must be labeled with its source and flagged for organizer confirmation. Permitted assumptions include:

- Using the likely attendance estimate as the base scenario unless the organizer specifies otherwise.
- Applying a buffer calculated from historical shortage or leftover rates in Input 4.
- Rounding quantities up to the nearest available package size or minimum order quantity.
- Treating listed prices as current as of the date on the record.
- Choosing between conflicting values by preferring the most recent approved record, while flagging the conflict.

The agent may not introduce any price, package size, inventory count, per-attendee rate, or event requirement that does not appear in an input or an approved planning record. If such a value is missing, the agent must retrieve it from an approved source or escalate.

### Permitted Subtask 1

- **Subtask name:** Validate planning inputs
- **Subtask description:** Check whether the forecast, resource requirements, budget, inventory, and purchasing constraints are complete, current, and internally consistent.
- **Subtask boundary:** The agent may identify missing or conflicting information and apply permitted assumptions as defined above. It may not invent prices, quantities, inventory, or event requirements.
- **Retry limits:** If information is missing, check approved CPVC planning records once. If it is still unavailable, or if a conflict cannot be resolved using the permitted assumptions, hand off to the CPVC event organizer.

### Permitted Subtask 2

- **Subtask name:** Interpret attendance uncertainty
- **Subtask description:** Examine the low, likely, and high attendance estimates, the confidence level, and historical attendance accuracy to determine how much uncertainty should affect the supply buffer.
- **Subtask boundary:** The agent may compare scenarios and explain risk tradeoffs, but it may not convert uncertainty into a guaranteed attendance number.
- **Retry limits:** If the forecast is incomplete or its confidence level is missing, proceed using the available range and flag the unresolved uncertainty. Do not re-run the interpretation on the same data.
  
### Permitted Subtask 3

- **Subtask name:** Calculate supply requirements
- **Subtask description:** Calculate food, drink, and swag quantities for each attendance scenario using approved per-attendee requirements, package sizes, current inventory, and purchasing constraints.
- **Subtask boundary:** The agent may calculate and compare quantities, but it may not place an order or exceed the stated budget without organizer approval.
- **Retry limits:** Recalculate up to 2 times only to fix calculation errors or internal inconsistencies, such as totals that do not match line items. If package sizes, prices, or per-attendee rates are missing, retrieve them from an approved source or escalate rather than retrying.
  
### Permitted Subtask 4

- **Subtask name:** Compare planning scenarios
- **Subtask description:** Compare conservative, balanced, and budget-sensitive plans by estimated cost, shortage risk, expected leftovers, and participant impact.
- **Subtask boundary:** The agent may recommend a preferred scenario, but the organizer decides the acceptable tradeoff between waste and shortage risk.
- **Retry limits:** If a scenario exceeds the budget or the shortage and waste limits, first explore feasible alternatives, such as reducing the buffer toward the likely estimate, using more existing inventory, choosing different approved package sizes, or lowering swag quantities before food and drink quantities. These alternatives may never fall below organizer-provided requirements. Escalate only if no combination of approved options satisfies the budget, requirements, and shortage and waste limits, and present the closest feasible options and what each one gives up.

### Permitted Subtask 5

- **Subtask name:** Prepare supply recommendation
- **Subtask description:** Combine the strongest available evidence into a recommended quantity for each supply category, and explain the assumptions behind the recommendation.
- **Subtask boundary:** The agent may create a draft recommendation for review, but it may not approve, purchase, or communicate the plan as final.
- **Retry limits:** If any supply category cannot be completed, submit the partial recommendation with the gap clearly identified and escalate. Do not delay the other categories.

## 5. When to Stop or Hand Off to a Human

- **Stop successfully when:** The agent has produced a supply recommendation covering food, drinks, and swag. The recommendation includes quantities for each scenario, a selected scenario and buffer, labeled assumptions, and estimates of cost, shortage risk, and leftover risk, all prepared for organizer review.
- **Hand off early when:** Required forecast or purchasing information is missing from both the inputs and approved records. Inputs conflict in ways the permitted assumptions cannot resolve. No feasible plan satisfies the budget and requirements after alternatives have been explored. Privacy boundaries would be crossed. A purchase, payment, participant communication, or final approval is required.
- **Hand off to:** CPVC event organizer or designated resource-planning reviewer.

Stop at the first applicable handoff condition. While awaiting review, take no further autonomous action.

## 6. Outbound Deliverable
- **Status:** Completed or escalated to human.
- **Result or recommendation:**  Recommended quantities for food, drinks, and swag, including the selected planning scenario and any proposed buffer.
- **Evidence summary:**  The attendance forecast range, historical data, resource requirements, budget constraints, inventory, and calculations supporting the recommendation.
- **Subtasks performed:** The permitted subtasks completed, including any recalculations or alternatives explored.
- **Unresolved issues:**  Missing data, conflicting constraints, or assumptions that still require organizer confirmation.
- **Handoff note:** The reason for stopping, unresolved questions, and the decision the organizer needs to make. Write "Not applicable" for a completed task.
- **Next task or recipient:** H1: Organizer reviews recommendation. Unresolved cases go to the CPVC event organizer or designated resource-planning reviewer.
