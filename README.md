# 🌊 OceanFolx Platform

**A privacy-conscious, low-cost web platform supporting women-led ocean safety and surf education programs in rural Indonesia.**

OceanFolx empowers coastal communities by providing **free swim and surf education for women**, many of whom have never been taught to swim and lack access to traditional digital infrastructure (email, smartphones beyond WhatsApp, reliable connectivity).

This application was built to support **real-world nonprofit constraints**: limited funding, low technical access for users, and the need for strong data governance around vulnerable populations.

---

## ✨ Key Features

- 🧑‍🤝‍🧑 **Three distinct user roles** with strict access control  
- 🧾 **Participant registration & cohort tracking**
- 🏄 **Lesson attendance, skill progression, and level testing**
- 🎽 **Gear distribution tracking** (e.g. rash guards, sunscreen)
- 💸 **Free-tier architecture** (no paid auth services, no SMS gateways)

---

## 🧠 Design Philosophy

This project was intentionally designed around the following constraints:

- Most participants **do not have email addresses**
- Paid phone-number authentication services were **not an option**
- This is a **small, trust-based nonprofit**

The system prioritizes **safety, clarity, and sustainability** over scalability.

---

## 👥 User Roles & Access Model

The platform supports **three clearly defined user types**, each with specific permissions:

### 1. Admins
- Create and manage all user accounts
- Manage cohorts, lessons, and program structure
- Full visibility across participants and volunteers

### 2. Volunteers / Instructors
- Create and manage participant user accounts only
- Log lesson attendance
- Record skill progression and assessments
- Track gear distribution
- Cannot access admin-only data

### 3. Participants
- Do not have direct signup access
- Can log in to their own account
- Can view information relevant to them (e.g., progress, attendance, assigned gear — depending on implementation)
- No access to manage other users or system configuration

---

## 🔐 Authentication & Real-World Tradeoffs

### The Problem
Supabase authentication requires an email address, but many OceanFolx participants:
- Do not have email
- Communicate primarily via **WhatsApp**
- Have limited access to devices and stable identifiers

### The Constraints
- No paid SMS or phone-number authentication services
- Must remain on the **Supabase free tier**
- Must maintain access control and protect participant data

### The Solution: Provisioned Accounts (No Self-Signup)
- There is **no autonomous participant signup**
- Accounts are **created (provisioned) by Admins/Volunteers**
- Participants can then **log in** using the credentials associated with their provisioned account
- Email fields are used as **technical identifiers** to satisfy Supabase Auth requirements, not as the primary communication channel

This approach:
- Preserves Supabase Auth guarantees
- Avoids vendor lock-in or paid services
- Keeps the platform safely “closed” to the public internet
- Matches how the program operates on the ground

---

## 🗄️ Database Design

The schema is organized around four core domains:

1. **Identity**
2. **Program Delivery (Sessions + Attendance)**
3. **Learning Model (Skills + Levels + Progress)**
4. **Gear & Inventory**

### Tables

#### Identity
- `users`  
  Stores authenticated users (Admins / Volunteers / Participants), including role metadata and identifiers.

- `participants`  
  Participant profile/program data. This is separated from `users` to keep program-specific fields and relationships clean (and to support participant-specific reporting without overloading auth identity).

#### Learning Model
- `skills`  
  The atomic skills the program teaches (e.g., breath control, paddling, floating, pop-up, etc.)

- `levels`  
  A structured progression model (levels define milestones / learning stages).

- `participant_progress`  
  A participant’s progress over time (e.g., skill completions, level attainment, timestamps, assessor/volunteer notes depending on implementation).

> **Why this structure?**  
> Splitting `skills`, `levels`, and `participant_progress` keeps the learning framework configurable while allowing progress tracking to be append-only / auditable.

#### Program Delivery (Sessions + Attendance)
- `sessions`  
  A scheduled lesson/class instance.

- `session_participants`  
  Join table mapping participants to sessions (attendance + per-session notes/flags).

> **Why a join table?**  
> Attendance is inherently many-to-many: sessions contain many participants, and participants attend many sessions.

#### Gear & Inventory
- `gear_types`  
  Catalog of gear categories (rash guard, board, leash, wetsuit, etc.)

- `gear_inventory`  
  Track individual gear items or inventory counts (depending on whether items are uniquely identified).

- `gear_assignments`  
  Assignment history linking gear to participants (who received what, when, condition/return status as applicable).

## ⚖️ Architectural Tradeoffs

| Decision | Tradeoff |
|--------|---------|
| No public sign-up | Reduced frictionless growth, increased safety & integrity |
| Provisioned participant accounts | Manual overhead, stronger governance |
| Email-based auth under constraints | Slight awkwardness, zero cost |
| Free-tier infrastructure | Tight constraints, long-term sustainability |
| Closed system design | Less “SaaS-like”, more realistic for a nonprofit |

These tradeoffs were intentional and aligned with real nonprofit operations.

---

## 🛠️ Tech Stack

- **Frontend:** React / Next.js (Bolt)
- **Backend:** Supabase (Postgres, Auth, Row-Level Security)
- **Authentication:** Supabase Email-based Auth (provisioned accounts)
- **Hosting:** Vercel + Supabase Free Tier
- **Design Goal:** Simple, resilient, maintainable
  
## 🔧 Initial Scaffolding with Bolt
This project was initially scaffolded using Bolt, an AI-assisted development tool, to accelerate setup of the foundational application structure.
Bolt was used to:
- Generate the initial React / Next.js project structure
- Set up basic Supabase connectivity
- Create early-page scaffolding and boilerplate components

## 🤍 Acknowledgements

Built in collaboration with **OceanFolx**, a women-led nonprofit providing free swim and surf education in Lombok, Indonesia.

