---
name: clarify-before-code
description: >-
  Forces a discovery interview with chat choice buttons before writing code.
  Use when creating something new, adding a feature, introducing a module,
  redesigning UX, scaffolding, or when the user says создай, добавь, сделай,
  new feature, implement, build, or introduce. Do not use for tiny one-line
  fixes, typos, or explicitly scoped "just do X" requests where all details
  are already given.
---

# Clarify Before Code

Stop and clarify before coding. Write code only after enough decisions are locked.

## Hard rules

1. **No code first.** Do not create/edit files, run scaffolds, or dump large code blocks until discovery is done (or the user explicitly says skip / just implement).
2. **Ask with buttons.** For every fixed-choice decision, use the `AskQuestion` tool so options appear as clickable choices in chat. Do **not** paste long numbered A/B/C lists when `AskQuestion` is available.
3. **One question at a time.** At most **one** `AskQuestion` call per assistant turn.
4. **Short labels.** Option text: concise (about 2–6 words). Always include one escape: `Свой вариант (напишу сам)` / `Something else (I will type it)`.
5. **No duplicate escapes.** Never put both "Other" and "Something else" in the same question.
6. **Reuse answers.** Do not re-ask what the user already stated in this thread.
7. **Code only when ready.** Proceed to implementation only after the readiness checklist below passes, or the user explicitly overrides.

If `AskQuestion` is unavailable: ask the same single question in prose with 3–5 short options and wait.

## When this applies

- New feature, module, screen, API, skill, integration
- Non-trivial redesign or architecture choice
- Vague requests ("сделай лучше", "добавь X")

## When to skip discovery

- Typo / rename / one-liner with clear target
- User already answered the key choices in the same message
- User says: `без вопросов`, `просто сделай`, `skip discovery`, `just implement`

Still confirm only if a destructive or irreversible action is involved.

## Discovery workflow

### Phase 0 — Classify (silent)

Decide: **create** | **extend** | **redesign** | **fix**.  
If fix and fully specified → implement. Else → Phase 1.

### Phase 1 — Goal (buttons)

Ask what success looks like. Example options:

- MVP / минимально рабочее
- Полный функционал сразу
- Сначала дизайн / заглушки
- Свой вариант (напишу сам)

### Phase 2 — Cover the gaps (buttons, one per turn)

Ask only what is still unknown. Typical axes (pick what matters):

| Axis | Example options |
|------|-----------------|
| Scope | только UI / только backend / full stack |
| UX | отдельное окно / вкладка / панель / в чате |
| Data | local only / cloud / both |
| Stack | как в проекте / предложи / свой стек |
| Priority | скорость / качество / простота |
| Language | RU / EN / оба |
| After ship | сразу код / сначала план файлов |

Prefer concrete options tied to **this** request, not a generic questionnaire.

### Phase 3 — Brief (no code yet)

After enough answers, write a short brief (5–10 lines):

- Goal
- In scope / out of scope
- UX shape
- Technical choices
- First slice to build

Then **one** final `AskQuestion`:

- `Всё верно — пиши код`
- `Ещё уточнить`
- `Изменить подход`
- `Свой вариант (напишу сам)`

### Phase 4 — Implement

Only after `Всё верно — пиши код` (or equivalent override):

- Implement the **agreed first slice**
- Do not expand scope silently
- If a new fork appears mid-work, pause and `AskQuestion` again

## Readiness checklist

Before coding, you should know:

- [ ] What "done" means for this slice
- [ ] Where it lives in the product (screen/API/module)
- [ ] Constraints (stack, local/cloud, language)
- [ ] What is explicitly out of scope
- [ ] User confirmed the brief (or skipped discovery)

If any box is empty and material → ask another button question.

## Tone

- Direct, short, Russian if the user writes Russian
- No lectures; options do the explaining
- After confirmation, act — do not keep interviewing

## Portable use

- **All projects (personal):** `~/.cursor/skills/clarify-before-code/`
- **One repo (shared):** copy the folder to `.cursor/skills/clarify-before-code/`

Copy the whole directory (`SKILL.md` + any extras) into another project to reuse.
