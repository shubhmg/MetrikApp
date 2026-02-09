# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
I want to build a full in-house ERP system similar in scope to Vyapar, but optimized for manufacturing + trading businesses.

This is NOT an MVP.
This is a production-grade, long-term scalable platform.

Claude should take full ownership of architecture, schema design, API structure, UI planning, and engineering decisions.

Tech stack is fixed:

Backend:

Node.js

Express

MongoDB with Mongoose

Frontend:

PWA (React preferred)

Offline support

Modern mobile-first UI

Auth:

JWT + refresh tokens

Must support:

Multiple businesses (multi tenant)

Role based access

Audit logs

Offline sync

Core Functional Requirements

System must support:

Voucher creation (generic engine)

Multiple Material Centres (factory, godown, contractor, shop)

Inventory per MC

Multiple item groups:

Raw materials

Finished goods

Semi-finished

Packaging

Consumables

Production (in-house + contractors)

Inter-MC transfers

Bills of Materials (with versioning)

Parties (customers / vendors / contractors)

Accounting ledgers (double entry)

Employees + payroll

Orders (sales + purchase)

Purchase entries + GRN

Audits (stock + ledger + production)

Reports (P&L, trial balance, party ledger)

Item costing

Wastage tracking

All stock movement must be ledger based.
No direct inventory edits.

Everything must flow through vouchers.

Architectural Expectations

Backend must be modular:

Each module contains:

model

routes

controller

service

Use:

MongoDB transactions

Soft deletes

createdBy / updatedBy

timestamps

UUIDs

indexes

service layer business logic

Voucher engine must be central.

Inventory and accounting must be event driven.

System must scale to:

10k+ items

100+ material centres

1M vouchers per year

multiple businesses

Design Principles

Schema-first

Ledger-based accounting

Event driven stock

Audit safe

No business logic in routes

Future extensibility

SAP-lite structure

Deliverables

Claude must produce:

Folder structure

Database schemas

Voucher engine design

Inventory ledger logic

Accounting ledger logic

Production workflow

BOM workflow

MC transfer logic

Payroll flow

Order → invoice flow

Audit system

API contracts

UI navigation map

Offline sync strategy

Sample Node code for:

Voucher posting

Inventory updates

Ledger posting

Production entry

Explain step by step.

Assume real factories and real money.

No shortcuts.

Design for future expansion.

Take initiative.
## Commands

- **Run API:** `npm run dev:api` (starts Express with --watch on port 4000)
- **Run Web:** `npm run dev:web` (starts Vite dev server on port 5173)
- **Build Web:** `npm run build --workspace=web`
- **Tests:** No test framework configured yet