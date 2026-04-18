# Recipe RE – Reverse Engineering Suite

A web-based Next.js application for reverse-engineering recipes from finished products, then running and tracking experimental protocols.

## Features

### Core Capabilities
- **Target Product Definition** – Define the product being reverse-engineered with composition targets and observed attributes
- **Ingredient Intelligence Library** – Structured database of ingredients with full composition metadata (water, fat, protein, sugar, starch, salt, hydrocolloid fractions)
- **Mass-Balance Formulation Solver** – Auto-generate candidate formulas from target composition using constraint-based solving
- **Protocol Lab** – Design and compare manufacturing methods with step-by-step process definition
- **Trial Tracking** – Lab notebook for every experiment with scoring, observations, and measurements
- **Analysis & Ranking** – Compare trials by composition match, outcome scores, and combined ranking

### Key Features
- **Formula Builder** with ingredient lines, lock/unlock, mass balance calculation
- **Contribution Heatmap** showing each ingredient's component breakdown
- **Sensitivity Analysis** for "what-if" ingredient changes
- **Score Radar Chart** for multi-dimensional trial evaluation
- **Evidence & Reasoning** panel with system-generated improvement suggestions
- **JSON Export/Import** for complete project portability

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Radix UI** (Tabs, Dialog, Select, Progress, Label, Slider, Tooltip, Accordion)
- **Recharts** (Bar, Radar, Line charts)
- **localStorage** persistence with JSON import/export

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard
│   ├── target/             # Target product setup
│   ├── ingredients/        # Ingredient library
│   ├── formulas/           # Candidate formulas
│   │   └── [id]/           # Formula detail (builder, heatmap, sensitivity)
│   ├── protocols/          # Protocol lab
│   │   └── [id]/           # Protocol detail (step editor, timeline)
│   ├── trials/             # Trial log
│   │   └── [id]/           # Trial detail (scoring, observations)
│   ├── analysis/           # Ranking, comparison, reasoning
│   ├── attachments/        # Notes and file references
│   └── settings/           # Project config, import/export
├── components/
│   ├── sidebar.tsx         # Navigation sidebar
│   └── ui/                 # Reusable UI components
└── lib/
    ├── types.ts            # TypeScript interfaces and constants
    ├── store.tsx           # React context store with localStorage
    ├── solver.ts           # Formulation solver, mass balance, scoring
    ├── seed.ts             # Example/demo seed data
    └── utils.ts            # Utility functions
```

## Data Model

The app uses a single JSON source of truth persisted in localStorage. Key entities:

- **Project** – Single workspace
- **Target Product** – The product being reverse-engineered
- **Ingredients** – Library with composition data
- **Formulas** – Candidate formulations with ingredient lines
- **Protocols** – Manufacturing methods with ordered steps
- **Trials** – Experiment logs with scoring and observations
- **Notes & Attachments** – Lab notebook entries

## Routes

| Route | Description |
|-------|-------------|
| `/` | Project dashboard |
| `/target` | Target product setup |
| `/ingredients` | Ingredient library |
| `/formulas` | Candidate formulas |
| `/formulas/[id]` | Formula detail |
| `/protocols` | Protocol library |
| `/protocols/[id]` | Protocol detail |
| `/trials` | All trials |
| `/trials/[id]` | Trial log |
| `/analysis` | Scoring, comparisons, reasoning |
| `/attachments` | Notes and files |
| `/settings` | Project configuration |
