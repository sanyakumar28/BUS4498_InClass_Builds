# Plan Food Drinks and Swag Task Specification  

Examples:

- `Grade Item Condition` becomes `grade-item-condition.md`
- `Customer Dispute & Compensation Assessment` becomes `customer-dispute-and-compensation-assessment.md`

Keep the **exact** task ID and task name from `workflow-of-tasks.md` inside the file. Replace all bracketed prompts. Leave Section 3 empty; tool permissions and boundaries will be added next week. 

*Remove this sentence and the instructions above before your submission.*

```yaml
# BASIC INFORMATION
task_id: T9
task_name: Plan Food Drinks and Swag
task_owner: CPVC
```

## 1. Task Goal

- **Objective:** The goal of this task is to have the system autonomously created a recommended resource plan using forecasting and budgeting.

## 2. Inbound Inputs

*Remove this instruction before your submission.* Describe what the enclosing workflow must provide. Describe the structure of each input; do not invent customer, employee, or event data.


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
- **Source:** Update aggregate forecast data or CPVC event records

*Copy the “Input” block for each additional input.*

## 3. Tool Permissions and Boundaries
The agent may:

  - Read the workflow inputs and approved aggregate planning records.
  - Use calculation, spreadsheet, forecasting, or inventory-planning tools.
  - Compare multiple supply scenarios.
  - Calculate recommended quantities, estimated costs, buffers, leftovers, and shortage risks.
  - Produce a draft plan for organizer review.

The agent may not:

  - Purchase supplies, submit orders, make payments, or commit CPVC funds.
  - Approve the final supply plan.
  - Send messages to participants without separate authorization.
  - Collect or infer sensitive personal information.
  - Use individual participant identities when aggregate information is sufficient.
  - Change registration records or attendance responses.
  - Treat an estimate as a confirmed attendance count.

## 4. How the Agent Should Reason

### Permitted Subtask 1

- **Subtask name:** Validate planning inputs
- **Substask description:** Examine whether the forecast, resource requirements, budget, inventory, and purchasing constraints are complete, current, and internally consistent.
- **Subtask boundary:** The agent may identify missing or conflicting information and use clearly labeled assumptions, but it may not invent prices, quantities, inventory, or event requirements.
- **Retry limits:** Attempt up to 2 times before handing the case to the CPVC event organizer.

### Permitted Subtask 2

- **Subtask name:** Interpret attendance uncertainty
- **Substask description:** Examine the low, likely, and high attendance estimates and determine how much uncertainty should affect the supply buffer.
- **Subtask boundary:** The agent may compare scenarios and explain risk tradeoffs, but it may not convert uncertainty into a guaranteed attendance number.
- **Retry limits:** Attempt up to 2 times before using the available forecast and flagging the unresolved uncertainty.

### Permitted Subtask 2

- **Subtask name:** Calculate supply requirements
- **Substask description:** Calculate the food, drink, and swag quantities required for each attendance scenario using approved per-person requirements, package sizes, inventory, and purchasing constraints.
- **Subtask boundary:** The agent may calculate and compare quantities, but it may not place an order or exceed the stated budget without organizer approval.
- **Retry limits:** Attempt up to 3 times if calculation inputs or package sizes are incomplete.

### Permitted Subtask 4

- **Subtask name:** Compare planning scenarios
- **Substask description:** Compare conservative, balanced, and budget-sensitive plans by evaluating estimated cost, shortage risk, expected leftovers, and participant impact.
- **Subtask boundary:** The agent may recommend a preferred scenario, but the organizer must decide the acceptable tradeoff between waste and shortage risk.
- **Retry limits:** Attempt up to 2 times before presenting the unresolved tradeoff to the organizer.

### Permitted Subtask 5

- **Subtask name:** Prepare supply recommendation
- **Substask description:** Combine the strongest available evidence into a recommended quantity for each supply category and explain the assumptions behind the recommendation.
- **Subtask boundary:** The agent may create a draft recommendation for review, but it may not approve, purchase, or communicate the plan as final.
- **Retry limits:** Attempt up to 2 times before escalating the incomplete recommendation.

**

## 5. When to Stop or Hand Off to a Human

- **Stop successfully when:** The agent has produced a supply recommendation covering food, drinks, and swag; included quantities and relevant scenarios; explained assumptions; estimated cost, shortage risk, and leftover risk; and prepared the result for organizer review.
- **Hand off early when:** Required forecast or purchasing information is missing; inputs conflict; the recommendation would exceed the available budget; privacy boundaries would be crossed; the agent cannot make useful progress within the retry limits; or a purchase, payment, participant communication, or final approval is required.
- **Hand off to:** CPVC event organizer or designated resource-planning reviewer.

Stop at the first applicable budget limit or handoff condition. While awaiting review, take no further autonomous action.

## 6. Outbound Deliverable

- **Status:** completed or escalated to human.
- **Result or recommendation:**  Recommended quantities for food, drinks, and swag, including the selected planning scenario and any proposed buffer.
- **Evidence summary:**  Attendance forecast range, historical data, resource requirements, budget constraints, inventory, and calculations supporting the recommendation.
- **Subtasks performed:**  The permitted subtasks completed, including any repeated attempts.
- **Unresolved issues:**  Missing data, conflicting constraints, or assumptions that still require organizer confirmation.
- **Handoff note:** Reason for stopping, unresolved questions, and the decision the organizer needs to make; write “Not applicable” for a completed task.
- **Next task or recipient:** H1: Organizer reviews recommendation; unresolved cases go to the CPVC event organizer or designated resource-planning reviewer.
