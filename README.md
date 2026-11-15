# WonderWorlds

**[Play WonderWorlds](https://mykeil-tzul.github.io/wonderworlds/)**

WonderWorlds is a small learning arcade for young children to explore with a grown-up nearby. Each adventure takes five rounds. A child can take their time, hear the prompt again, and try another answer with a hint. There are no timers, streaks, required sign-ins, or chat.

## Five adventures

| Game | What the child practices |
| --- | --- |
| Treasure Count | Tap and count themed objects, then choose a total from 1–10 as the level grows |
| Number Echo | Match a spoken or written number to a numeral |
| Color Cove | Match a color sample |
| Shape Harbor | Match an outline to a filled shape |
| Pattern Path | Continue a repeating sequence |

The map starts in Ocean World. The grown-up area can switch to Space, Animals, or a Noah’s ark-inspired theme. Themes change the characters and objects while the skills stay the same.

## How practice adapts

Five choices of game share three difficulty tiers, each tracked separately for each learner. Three recent first-try answers can raise a game’s difficulty. Two rounds that needed retries can lower it. The map suggests a game using first-try practice history and offers hints after incorrect choices. It awards one badge per completed game. The app uses curated rules. It does not use a chatbot or generate lessons from children’s input.

A completed adventure and first-try answers are simple practice measures. They have not been validated as educational assessments.

## Privacy and the grown-up area

The app asks for a preset nickname only. Game progress and settings stay in browser storage. There is no account, analytics, advertising, chat, or microphone access. Spoken prompts are pre-recorded and hosted with the app. The browser still makes normal requests to GitHub Pages to load the site. WonderWorlds adds no tracking service.

A short arithmetic prompt separates the grown-up controls from the play screen. It is an interface cue, not authentication, identity verification, or verifiable parental consent. A grown-up can switch profiles, reset progress, remove profiles, or clear all WonderWorlds data. Anyone who can access the same browser profile can view the saved state. This portfolio MVP has not undergone a COPPA compliance review. [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)

## Run locally and test

```sh
python3 -m http.server 8000 --directory site
node --test tests/*.test.mjs
```

Open `http://localhost:8000`. GitHub Actions checks question validity, number bounds, answer uniqueness, adaptation, suggestions, and bundled audio before publishing to GitHub Pages. The optional `scripts/make_audio.py` regenerates English prompts on macOS.
