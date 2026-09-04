# Interface copy

Use this reference whenever an interface contains words: labels, actions, headings, errors, empty screens, confirmations, and captions. Words are design content, not decoration. A design is not finished while its copy is generic.

## Rule class and authority

Established brand voice, legal or regulatory wording, and platform conventions outrank everything here. Where those are absent, treat the mechanics below as invariants and the register guidance as a contextual default. The countable observations at the end are anti-pattern warnings: each one is a signal to inspect intent, not a prohibition.

## Name things as the user understands them

Name by what the person is doing, not by how the system is built. Someone manages notifications, not webhook configuration. Describe what a thing is or does in plain terms rather than selling it. Specific and legible beats clever.

Keep one vocabulary across the whole product. A concept that is called one thing in navigation is called the same thing in a heading, a button, a confirmation, and an error. The interface's vocabulary is the signposting people learn to navigate by, so an inconsistent name is a broken sign.

## Actions

An action says what happens when it is used. `Save changes`, not `Submit`. Write it in the active voice.

An action keeps its verb through the whole flow: a button that says `Publish` produces a confirmation that says `Published`, not `Success`. When the verb changes between steps, the person has to work out whether the same thing happened.

Two actions with the same intent on one page is a defect, not emphasis. `Get in touch`, `Contact us`, and `Let's talk` on one page are one action with three names — pick one and use it everywhere, including navigation and the footer.

A primary action fits on one line at every width. Three words is the practical ceiling; one or two is better.

## Failure and emptiness

An error states what happened and what to do next, in the interface's voice. It does not apologise, does not blame the person, and is never vague about which thing failed. `Connection failed. Try again.` — not `Oops! Something went wrong.`

Attach the message to the thing that failed. A form error belongs beside its field, not in a dialog that hides the field it describes.

An empty screen is an invitation to act. Say what will appear here and give the action that puts something in it. An empty screen that only says `No results` wastes the one moment the person is most willing to be directed.

A success message is confident rather than loud. Remove the exclamation mark.

## Register and mechanics

- Sentence case for headings, labels, and actions. Title case on every heading reads as template chrome.
- One copy register per surface. Do not mix technical notation, editorial prose, and marketing punch in the same composition unless the brand voice genuinely does.
- The hint text inside a field never doubles as the field's only label. A label that vanishes on focus is not a label.
- Let each written element do exactly one job. If a heading, a subheading, and a caption all say the same thing, keep the one that says it best.
- Real draft copy, never filler Latin. Filler hides the fact that the layout has not been tested against real language.

## Evidence

Numbers, quotations, awards, and customer names are claims. A statistic the product cannot support is invented precision, and invented precision is the most damaging kind of generic copy because it reads as fact. `92%`, `4.1×`, and `48k` written to fill a statistics band are fabrications unless the product measured them.

Attribute a quotation to a name and a role, not a first name alone. Keep a quotation short enough to read in one pass — three lines of body is usually the ceiling. Use typographic quotation marks or none.

Where content is invented to unblock a layout, mark it as such so a later stage recognises it rather than shipping it. See [design contract](design-contract.md) for how content provenance is recorded, and [natural color and humanization](natural-color-and-humanization.md) for the specificity gate that copy is scored against.

## Countable observations

Report these as observations with a count, then judge them in context. None is a defect on its own.

| Observation | Why it matters |
|---|---|
| Two or more actions on one page resolving to the same intent | The person cannot tell the options apart |
| A primary action longer than three words, or wrapping at any width | The action stops reading as an action |
| A verb that changes between an action and its confirmation | Breaks the chain that tells the person what happened |
| An error that apologises, or names no next step | Emotion in place of direction |
| An empty state with no action in it | The moment of highest intent is spent on a status message |
| Headings in title case, where the product otherwise uses sentence case | Template chrome rather than a decision |
| A statistic, award, or quotation with no traceable source | Invented precision presented as fact |
| Filler Latin, or a field whose hint text is its only label | Layout untested against real language |
