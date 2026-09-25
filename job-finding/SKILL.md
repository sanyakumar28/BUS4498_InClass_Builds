---
name: "job-finding"
description: "Turn open job opportunities in the user’s target field into a clear, prioritized list of roles to apply for. Use when the user asks for daily job updates or help finding open positions. This Skill recommends and adds jobs to the list; it does not submit applications."
---

# job-finding

## User inputs
On each run , the user supplies target field, role type, or industry (for example: marketing, information systems, technology consulting, or data analytics)
Preferred location and whether remote, hybrid, or in-person roles are acceptable
Experience level, graduation date, and work authorization if relevant
Any preferences or limits, such as company size, salary range, job type, or roles to avoid
How often the user wants updates and how many jobs they want included. If an essential detail is missing, ask the user for it before searching. At minimum, confirm the target role or field, location/remote preference, and experience level.

## Procedure
1. Review the user’s job preferences and identify the search criteria for this update.
2. Search for currently open roles that match the user’s target field, experience level, location, and work preferences.
3. Review each role for relevance, checking the job title, company, location, qualifications, and application deadline when available.
4. Exclude duplicate, expired, clearly mismatched, or senior-level roles unless the user asks to include them.
5. Prioritize the strongest opportunities based on fit with the user’s preferences and qualifications.
6. Add the selected roles to a clear job list, including a direct application link and a brief explanation of why each role may be a good fit.
7. If there are few strong matches, tell the user and suggest a related role title, location, or industry to expand the search.

## Output
Return a prioritized list of open roles. For each role, include:
- Job title and company
- Location and work arrangement
- Brief description of why it matches the user’s interests
- Key qualifications or requirements
- Application link
- Deadline, if listed

## Boundaries
This Skill finds and recommends jobs but does not apply, submit applications, contact recruiters, or make decisions for the user. Ask for clarification if the user’s target field or preferences are too broad to search effectively.
