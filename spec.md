# Web app spec

## Overview

A simple app to set nested Objectives and Key Results across an org. Both Objectives and Key Results are modeled as goals and distinguished by the goal\_type field.

Key results can only map to one objective. This makes the design simpler and avoids metrics conflation.

Auth is via Auth0, which creates an entry in the local users table. Users can then be connected to the programs and initiatives to which they belong. Anyone can see any OKRs in the system, but you can only create and edit them in programs and initiatives to which you belong.

- Overview
- [Auth](#auth)
- [Schema](#schema)
- [API](#api)
- [UI](#ui)
- [Stack](#stack)
- [Implementation details](#implementation-details)
- [Suggested monorepo structure](#suggested-monorepo-structure)

## Auth

Auth should happen through Auth0. When a user is created on Auth0, the callback should create a corresponding entry in the users table.

All users should be able to see all non-admin pages, but users should only be able to add to or edit goals (objectes, key\_results) that are under organizations they belong to.

# Schema

The Postgres DB tables should be based on this.

**goals**

goal is the generic object for both Objectives and KRs, to allow them to be nested and also to support any higher-order construct users may want, like a user-exposed "Goal" they can create that objectives roll up to. But probably the UI will just be O's and KR', which can nest

- id (pk)
- parent\_goal\_id (fk → goals.id, nullable, indexed)
- title (string, not null)
- description (text, nullable)
- status (enum, not null: draft, active, archived)
- goal\_type (enum, not null: objective, key\_result)
- organization\_id (fk → organizations.id, not null, indexed)
- start\_date(date, not null)
- end\_date (date, not null)
- created\_at (datetime, not null)
- created\_by (fk -> users.id, not null)
- updated\_at (datetime, not null)
- updated\_by (fk -> users.id, nullable)
- deleted\_at (datetime, nullable, indexed)
- Constraints:
- end\_date >= start\_date

**assessments**

This is for the periodic evaluation of progress toward a goal.

- id (pk)
- goal\_id (fk → goals.id, indexed, not null)
- assessment\_date (datetime, not null, indexed)
- period\_start (date, nullable)
- period\_end (date, nullable)
- status (enum, not null: not\_started, on\_track, at\_risk, off\_track, completed )
- score (numeric(5,2), nullable)
- confidence (enum, nullable: low, medium, high)
- narrative (text)
- created\_at (datetime, not null)
- created\_by (fk -> users.id, not null)
- updated\_at (datetime, not null)
- updated\_by (fk → users.id, nullable)
- deleted\_at (datetime, nullable, indexed)
- Constraints:
- unique(goal\_id, date\_trunc('day', assessment\_date))
- CHECK (score IS NULL OR (score >= 0 AND score <= 100))

**users**

Starting with simplified Auth0, will move to Entra later

- id (pk)
- sub (string, not null)
- auth\_provider (enum, not null: auth0, entra)
- name (string)
- email (string, indexed)
- created\_at (datetime, not null)
- updated\_at (datetime, not null)
- deleted\_at (datetime, nullable, indexed)
- Constraints:
- unique(auth\_provider, sub)
- ADD CONSTRAINT email\_rmi\_domain\_check, CHECK (email IS NULL OR lower(email) ~ '^[^@]+@rmi.org$');

**organizations**

- id (pk)
- name (string, not null)
- org\_type (enum, not null: program, initiative, default to program. programs are the top level)
- parent\_id (fk → organizations.id, nullable, indexed)
- created\_at (datetime, not null)
- updated\_at (datetime, not null)
- deleted\_at (datetime, nullable, indexed)
- Constraints
- parent\_id != id
- unique(name, parent\_id)

**users\_organizations**

- user\_id (fk -> users.id)
- organization\_id (fk -> organizations.id)
- created\_at (datetime, not null)
- created\_by (fk -> users.id, not null)
- updated\_at (datetime, not null)
- deleted\_at (datetime, nullable, indexed)
- Constraints:
- PRIMARY KEY (user\_id, organization\_id)

## API

Use FastAPI.

Auth

- POST /auth/callback — Auth0 callback, creates user if not exists

**Users**

- GET /users/me — current user's profile and org memberships
- GET /users — admin only, list all users
- POST /users/{user\_id}/organizations — admin only, add user to org
- DELETE /users/{user\_id}/organizations/{org\_id} — admin only, remove user from org

**Organizations**

- GET /organizations — all orgs (used by admin and nav dropdown)
- GET /organizations/programs — all orgs where org\_type=program (programs page, nav dropdown)
- GET /organizations/{org\_id} — single org (program page)
- POST /organizations — admin only, create org
- PATCH /organizations/{org\_id} — admin only, edit org

**Goals**

- GET /organizations/{org\_id}/goals — all goals for an org, used to render program page
- GET /goals/{goal\_id} — single objective or KR page
- GET /goals/{goal\_id}/children — KRs nested under an objective
- POST /goals — create objective or KR (goal\_type in body)
- PATCH /goals/{goal\_id} — edit objective or KR
- DELETE /goals/{goal\_id} — soft delete

**Assessments**

- GET /goals/{goal\_id}/assessments — all assessments for an objective or KR
- GET /assessments/{assessment\_id} — single assessment page
- POST /assessments — create assessment
- PATCH /assessments/{assessment\_id} — edit assessment
- DELETE /assessments/{assessment\_id} — soft delete

## UI

**Nav bar**

- Top left, RMI logo
- Logged out:
- 'login/signup' at top right
- Logged in:
- Middle of nav bar, a dropdown with all the programs, anyone can see the OKRs of any program by doing to that program's main page
- Your name at top right to show you're logged in. Click it and get a dropdown with a link to log out.
- If you're an admin (described below), a link to the admin page

**Home page**

- A list of the orgs you belong to, and nested under them that org's (ie program's or initiative's) objectives. This is like the way objectives are displayed on the program page, but the user homepage will show them for all programs the user is part of. It's just a convenience so you don't need to go through the main nav

**Programs page**

List of all programs, each linked to a program page. A program is just an organization where org\_type = program . Each program should be expandable to show its objectives.

**Program page**

Page for a specific program, lists the Objectives (goals with goal\_type of objective), with KRs nested below each goal, and 'New Objective' and 'New key result' in the appropriate places.

**Objective page**

- At top beneath objective name it says the program the objective is for, linked to that program's page.
- Beneath that it lists the KRs for the objective (goals with goal\_type KR).
- There's a button 'Add KR,' which links to the "new key result form" page.
- Should show all assessments for this objective, as well as a "New assessment" button

**New objective form**

Form to add an objective, based on 'goals' schema.

**Key result page**

- Linked to from the Objective page that this key result is nested under, possibly from the 'key results' page
- Should show all assessments for this KR, as well as a "New assessment" button.

**New key result form**

This is actually the same form as for objectives, just pass goal\_type as a query param, which determins whether it's for an objective or key\_result. The page should visually distinguish between objectives or KRs based on the queurystring.

**Assessment page**

Shows an assessment. Linked from key result and objective pages

**New assessment form**

How to create a new assessment, form with fields based on schema. Linked from key result and objective pages

**Admin pages**

**Main admin page**

There should be admin pages which you can reach only if your email address is jmcgrath@rmi.org, cblock@rmi.org, or rhall@rmi.org. It will contain links to:

- Admin programs
- Admin users

**Admin programs page**

- A nested list of organizations (based on parent\_id), split up by organization type, with initiatives under the program they belong to, roughly like this:
- Climate Intelligence
- SPD
- Carbon Market
- Climate Aligned Industries
- Waste Methane Initiative
- etc
- A button to add a new organization

**Admin users page**

- A list of users, with a dropdown next to them where you can associate them with an organization
- You can associate a user with multiple organizations
- It will look roughly like this for each user:
- John McGrath.       [dropdown: Select organization].  [button: add to org]
- Member of: Climate Intelligence, SPD

**New organization form**

Form to create a new organization, including the ability to set it as a child of an existing organization. Form fields based on schema

 ## Stack

Use the most recent stable version of each of these, confirming that all versions are compatible.

- Auth: Auth0 integration
- Frontend: React + Vite
- CSS: Tailwind + shadcn/ui
- API: Fast API
- ORM, migrations, validation: SQLAlchemy, Alembic, Pydantic
- Database: Postgres
- Task queue: Celery + Redis

## Implementation details

Dockerize the app.

Include a docker-compose file to spin up both the app and a Postgres database.

Write tests where appropriate.

The README should include:

- How to run tests
- How to run docker-compose to start the app and DB
- Any necessary env vars (what needs to be in .env) for Auth0 and the like

Order in which we should build:

- Scaffold the FastAPI project structure
- Define all SQLAlchemy models + the initial Alembic migration
- Verify it populates Postgres cleanly
- Build features in slices:
- Auth + user sessions; API support for callback that will populate the user table
- Add organizations (programs and initiatives), including the UI to view, forms to add, admin page to associate users with organizations, and associated API endpoints
- Associate user with organizations via admin, UI & endpoints
- Add goals (objectives and KRs)

## Suggested monorepo structure

```
rmi-okr/

├── CLAUDE.md
├── README.md
├── .gitignore
├── docker-compose.yml
│
├── backend/
│ ├── alembic/
│ │ ├── versions/
│ │ └── env.py
│ ├── app/
│ │ ├── main.py
│ │ ├── config.py
│ │ ├── database.py
│ │ ├── auth.py
│ │ ├── models/
│ │ ├── schemas/
│ │ ├── routers/
│ │ └── dependencies.py
│ ├── tests/
│ ├── alembic.ini
│ ├── pyproject.toml
│ └── .env.example
│
└── frontend/
├── src/
│ ├── main.tsx
│ ├── App.tsx
│ ├── api/
│ ├── components/
│ ├── pages/
│ └── lib/
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── .env.example
```