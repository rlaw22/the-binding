# Whole-book ingestion contract

Every new Storyline book must be processed through the following authored stages before it can be marked `publicationMode: "new-book"`:

```text
versioned source → chapter dossiers → dramatic beat map → playable opportunities → manifest → compiler → API/browser gate
```

The manifest is an executable publication artifact, not a raw chapter export. The compiler rejects a new-book manifest unless every scene and player-facing action carries the dramatic contract defined in [`../../docs/DRAMATIC-AUTHORING-CONTRACT.md`](../../docs/DRAMATIC-AUTHORING-CONTRACT.md).

## Required source-side record

For each chapter or dramatic cluster, retain:

- source anchors and canon facts;
- situation and protagonist presence;
- immediate objective;
- pressure, clock, threat, or uncertainty;
- present actors and their stances;
- meaningful approaches and trade-offs;
- reaction and changed situation;
- next objective/question;
- consequences, convergence, and recovery semantics.

Do not derive scene prose or action labels from headings alone. Do not expose dossier fields, chapter metadata, internal IDs, or authoring instructions to the player. Optional discoveries must never become mandatory chores, and every action must leave a specific authored consequence rather than a generic acknowledgement.

## Publication sequence

1. Analyze the complete versioned source before scene authoring.
2. Create chapter dossiers and identify dramatic clusters; chapter boundaries are anchors, not automatic scene boundaries.
3. Author the dramatic beat and playable opportunities.
4. Compile with `publicationMode: "new-book"`; missing or template-shaped drama is a hard failure.
5. Run structural, agency, dramatic, source-traceability, and play-quality audits.
6. Inspect the compiled catalog and resolved result, not only source files.
7. Verify the served API payload and browser rendering preserve the situation, pressure, reaction, changed situation, and next objective.
8. Enable only after the opening vertical slice and publication gates pass.

## Stateful scene authoring gate

Each dramatic beat must additionally record the established space, persistent core affordances, active and unresolved local threads, one-time discoveries, state-dependent variants, return-to-space behavior, and authored closure conditions. A local branch must not silently erase unrelated plausible affordances. The compiler/runtime may normalize these records into deterministic actions, but the source-side affordance and thread records must remain inspectable for review and regeneration.

The ingestion audit must exercise at least one reordered local path, one path that skips optional affordances, one repeated examination path, and one time/movement closure path where the source supports them. It must distinguish an affordance that transforms from one that is consumed.

## Source-unit classification

Use [`AUTHORING-WORKSHEET.md`](./AUTHORING-WORKSHEET.md) for each beat. Every source unit receives exactly one classification: `canonical_event`, `decision`, `discovery`, `atmosphere`, `connective_tissue`, or `non_playable`. Canonical events may remain narrated rather than selectable; decisions require a concrete approach and consequence; discoveries must define what remains possible when skipped; atmosphere and connective tissue do not become buttons by default; non-playable material remains traceable but is never exposed. No paragraph, heading, mentioned object, or canon event becomes an action merely because it exists in the source.

The source-quality audit should report classification counts and reject playable opportunities with a missing or unsupported classification. This keeps ingestion reviewable before manifest compilation and prevents structurally valid chapter exports from masquerading as authored gameplay.
