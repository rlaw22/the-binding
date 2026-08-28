# Stateful Scene Authoring Worksheet

Use one worksheet per dramatic beat or established space. Complete this record before compiling a new-book manifest.

## 1. Source and canon

- `sourceId`:
- `chapterOrCluster`:
- `sourceAnchors`:
- `canonicalEvents`: events that must remain true:
- `agencyBoundary`: what the player may change locally:

## 2. Established space

- `spaceId` / `location`:
- `situation`: what is happening now:
- `protagonistPresence`:
- `presentActors` and each actor's stance:
- `establishedObjects`:
- `establishedLocations`:
- `pressure` / clock / uncertainty:
- `immediateObjective`:
- `nextQuestion`:

Only established people, objects, and locations may receive affordances. Mentioned-but-unestablished material remains atmosphere or connective tissue.

## 3. Local threads

For every thread:

- `threadId`:
- `startingStatus`: dormant | active
- `owner`: actor | object | relationship | route | threat
- `question`:
- `activationAction`:
- `resolutionAction`:
- `closure`: authored_resolution | movement_or_commitment | time | world_state | impossible

Movement/time closures must specify which local threads become closed, which affordances transform or disappear, and what state/history is retained after the boundary.
- `reopenCondition` (if any):

## 4. Affordances

For every player-facing opportunity:

- `affordanceId`:
- `kind`: core | contextual | discovery | state_dependent | atmosphere | exit
- `establishedBy`: actor/object/location ID
- `threadId`:
- `sourceClass`: canonical_event | decision | discovery | atmosphere | connective_tissue | non_playable
- `persistent`:
- `replay`: repeatable | consumable
- `returnBehavior`: resurface_while_plausible | consumed_or_transformed | closed | never
- `closure`:
- `boundedExamination` (if repeatable): variant count and final confirmation/closure:
- `examinationVariants` (if repeatable): ordered authored variants with `requires`, `maxVisit`, narration, and deterministic effects; each variant must be knowledge/state-grounded.

Do not turn every paragraph, mentioned object, or canon event into a button. A canonical event may be narrated without being selectable. A discovery is optional unless the source and route contract make it essential; essential progression must remain possible when it is skipped.

## 5. Action beat

For each legal action:

- `actionId` / `label`:
- `approach`:
- `stakes`:
- `reaction`:
- `changedSituation`:
- `nextObjective`:
- deterministic `effects`:
- immediate consequence:
- named later consequence (if any):
- convergence target (if any):

Each alternative must differ in immediate situation, knowledge, risk, relationship, resource, or a named later consequence. Never add filler to reach six actions; one through six meaningful actions is valid.

## 6. Ingestion classification decision

Mark each source unit exactly once:

- **canonical_event** — must happen or remain true for canon fidelity; usually narration or an authored transition.
- **decision** — player-controlled approach or commitment with stakes and consequence.
- **discovery** — optional knowledge/object/person finding that can alter later play.
- **atmosphere** — sensory/social texture with no standalone state mutation.
- **connective_tissue** — travel, compression, or continuity needed between beats.
- **non_playable** — source material retained for traceability but not exposed as an action or scene.

Record why it is playable, why it is bounded, and what remains possible if it is skipped.

## 7. Review gates

- [ ] Protagonist, situation, objective, and pressure are concrete.
- [ ] Every actor/object/location is established before exposure.
- [ ] Every thread has an owner, activation path, and closure.
- [ ] Every affordance has replay, return, and closure semantics.
- [ ] Repeatable examination has bounded authored variants, changes when authored knowledge changes, and closes at the visit bound.
- [ ] No action label is a heading, ID, or generic command.
- [ ] Optional actions do not become a checklist funnel.
- [ ] Deterministic effects match the narrated result.
- [ ] Canonical events are preserved without removing local agency.
- [ ] The compiled catalog has one to six meaningful primary actions.
