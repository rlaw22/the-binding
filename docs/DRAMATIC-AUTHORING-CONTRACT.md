# Dramatic Authoring Contract

**Status:** Mandatory for every new Storyline book

A book is not ready because its manifest is structurally valid. It is ready only when each scene carries an authored dramatic beat and each legal action carries a specific consequence beat through compilation, resolution, and presentation.

## The production pipeline

```text
source book
→ chapter dossier
→ dramatic beat map
→ playable opportunity
→ authored scene/action
→ compiler audit
→ server catalog
→ authoritative result
→ rendered next situation
```

The compiler is the publication boundary. `publicationMode: 'new-book'` requires the contract below. Compatibility manifests may remain on the legacy contract until deliberately migrated, but they must not be presented as new-book quality.

## Required scene beat

Every new-book scene must author:

- `situation`: what is happening now, in concrete sensory and social terms;
- `immediateObjective`: what the protagonist must decide or accomplish now;
- `pressure`: the clock, threat, uncertainty, obligation, or relationship tension narrowing the moment;
- `presentActors` or `actorStances`: who is present and what they want, fear, conceal, or resist;
- `nextQuestion`: the unresolved dramatic question created by the scene.

Opening prose must establish the protagonist's presence, a specific situation, and pressure. Chapter headings, metadata, generic summaries, and compiler instructions are never player-facing narration.

## Required action beat

Every player-facing action must author:

- `approach`: the player's concrete tactic or commitment;
- `stakes`: what may be gained, lost, exposed, delayed, or changed;
- `reaction`: a specific response from a person, environment, threat, or discovered fact;
- `changedSituation`: what is observably different after the action;
- `nextObjective`: the next immediate problem created by this result;
- `effects` or `effectSummary`: the deterministic state consequence and its narrative meaning.

An action is not acceptable when it merely says that the player learned something, made progress, or should decide what to do next. Each approach must produce a distinct authored response and leave the scene in a changed condition.

## Engagement standard

A strong beat should move through:

```text
understand → commit → suspense → consequence → agency
```

Use pressure, visible actors, concrete affordances, meaningful trade-offs, companion reactions, and immediate follow-up decisions. Preserve wide consequences with narrow convergence: choices may change knowledge, trust, resources, risk, or route while still reaching the authored backbone when the source requires it.

Optional discoveries must never become mandatory chores. Never consume every exploration action merely to unlock the exit. Never create buttons from chapter names or generic templates. Failed or missed discoveries should remain silent or alter the route without making essential progression impossible.

## Traceability and publication gates

Before publication, the audit must prove for every opening and sampled major beat:

1. source anchors map to a dossier and dramatic beat;
2. the beat maps to a playable opportunity;
3. each legal action has a concrete approach and differentiated consequence;
4. deterministic effects match the narrated result;
5. the result contains the reaction, changed situation, and next objective;
6. the next catalog presents the new situation rather than a transaction receipt;
7. the served API payload and browser rendering preserve the same content.

The compiler rejects missing or template-shaped dramatic fields. Tests must cover contract rejection and end-to-end preservation. A functioning renderer, a passing graph audit, or a valid action catalog is not evidence of dramatic quality by itself.

## Ownership

- Authors and ingestion own situation, pressure, actors, choices, reactions, and dramatic continuity.
- The deterministic domain engine owns legality, state mutation, checks, transitions, idempotency, and endings.
- Presentation owns layout and accessibility; it must not invent missing drama.
- Bounded language models may interpret constrained intent or narrate within authored bounds, but they cannot invent legal actions, plot facts, actors, locations, or consequences.

## Stateful scene affordances and local threads

A scene is an established space containing a bounded set of authored affordances and local dramatic threads. It is not only a branch node or a list of disposable buttons.

A new-book scene may declare:

- `threads`: named local dramatic threads with authored starting status;
- `affordances`: named opportunities grounded in the established space;
- action `affordanceId`, `affordanceKind`, `threadId`, `persistent`, `threadEffects`, and optional `resurface` metadata.

Affordance kinds are `core`, `contextual`, `discovery`, `state_dependent`, `atmosphere`, and `exit`. Core affordances can remain legal after an unrelated local action resolves. One-time discoveries and commitments normally become consumed; repeatable observation or conversation may remain available. An affordance may be dormant, active, resolved, temporarily unavailable, reopened, closed, or impossible only through authored state, requirements, time, movement, or consequence.

After a local action resolves, the next catalog is derived from the same current space plus the changed canonical state. Authors must state what remains unresolved and what closes each thread. A persistent affordance must not be an infinite clue generator: repeated examination uses bounded authored variants or reaches a natural confirmation/closure result.

The player-facing catalog contains only the currently legal authored actions and may contain one through six primary actions. Six is a ceiling, not a target. Never add filler to reach a count.
