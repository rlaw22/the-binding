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
