# Pass to GPT Codex — does Android font scaling reach the app at all?

Status: a pass on one open triangulate node, written July 25, 2026 after shipping commit `926ded1`.
Receiver: GPT-5.6 / Codex with the `settle-in` repository mounted. `AGENTS.md` binds you as before.

## The game signal

Your Q5 verdicts are implemented, verified, and live. This is a single new question that surfaced
during that work, and it is the kind I do not want to resolve alone: answering it wrong changes
every screen Clare has already learned to read.

It is also **not yet answerable** — it needs one observation from Clare's Pixel first. I am passing
it now so the analysis is ready when that evidence lands, not so you can guess ahead of it.

## Everything Q5 settled (so you can skip it)

Q5a, Q5b, Q5c are done exactly as you ruled, plus the verification repair gate. The new
strict-production Playwright project runs against the built artifact under the real production CSP
and refuses to measure anything until it has proven the stylesheet is applied — with a spec that
disables the sheets and asserts its own readings collapse, so it cannot pass against an unstyled
document. It is now a CI gate. Details are in `docs/decision-log.md` (five July 25 entries).

## The question

`src/ui/styles/app.css` sets `html { -webkit-text-size-adjust: 100%; text-size-adjust: 100% }`,
and `src/ui/styles/tokens.css` defines the entire type scale in pixels. The wall clock is the one
exception (`clamp(72px, 23vw, 104px)`).

**If that combination means Chrome on Android never enlarges Settle In's text when Clare raises her
system font size, then two things are true at once:**

1. Acceptance J1, J2, and J10 all specify checks at "125% Android font size." If the device never
   applies that scaling to this app, those checks have been measuring a condition that cannot occur
   — a second instance of the exact failure mode that voided our layout evidence, where the oracle
   could not see the thing it asserted.
2. A real accessibility need goes unserved. Clare teaches in a dim room and glances at this from
   arm's length; if she ever needs larger text, the system control that should provide it does
   nothing.

Our own emulation cannot answer it. The strict suite scales by overriding the root font size, which
proves the *layout reflows correctly when text grows* — it does not prove Android will ever grow it.

## What Clare will bring you

`docs/device-checklist.md` now ends with a three-step observation: photograph a live pose screen at
the default Android font size, raise the system font size to its largest standard step, reopen and
photograph the same screen, and record whether the text changed size at all. That yes/no is the
input to everything below.

## What I want from you

**If the answer is "no, the text does not change":**

1. Confirm the mechanism, and mark it **[UNVERIFIED]** if you are reasoning from spec rather than
   known Chrome behavior. My understanding is that `text-size-adjust: 100%` disables Chrome's
   automatic text-inflation algorithm, and that Android's accessibility font-scale setting reaches
   web content through that same mechanism — so pinning it to 100% opts the app out of both. I am
   not confident in the second half of that claim and would rather be corrected than believed.
2. Recommend the smallest change that restores user font scaling **without** destabilizing a visual
   system Clare has already internalized. The obvious candidate is a relative-unit type scale
   (`rem`-based, root font size inherited), but that alters every screen at once and interacts with
   the `100dvh` bounded-height layout we just fixed. Name the risk to J10 specifically: taller text
   inside `.live`, which is `overflow: hidden` and cannot scroll.
3. Say whether this is a v1 change or a post-pilot change. Clare has a class to teach. Principle 4
   puts legibility above decoration, but the field-learning rule also says not to expand scope on
   speculation — and no student or teacher has yet reported unreadable text.

**If the answer is "yes, the text does change":** say so plainly, and tell me what J1/J2/J10 should
assert instead so the acceptance criteria describe the mechanism that actually operates.

**Either way:** rule on whether `docs/acceptance-tests.md` should stop saying "125% Android font
size" and say something the device can actually be observed doing.

## What I am NOT asking for

- Do not re-open Q5a, Q5b, Q5c, or the verification repair gate. They are settled and shipped.
- Do not propose a design-system overhaul. The palette, hierarchy, and motion are not in question.
- Do not edit files; return prose verdicts and I will resolve them into the decision log as Y/N
  entries.

## Cognitive lineage

The condition is pre-existing — it entered with the M4a stylesheet and is named in no treaty. It
surfaced because the implementing Opus agent flagged it as a Y/N question rather than silently
assuming the font-scale tests were meaningful; that instinct is why it is in front of you now
instead of being discovered in a studio. Recorded as the sole open triangulate node at the top of
`docs/decision-log.md`.

## The next move

Clare runs the three-step observation on her Pixel, brings the yes/no back, and you rule. Nothing
in the app changes before that evidence exists.
