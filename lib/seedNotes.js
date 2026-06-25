/**
 * Seed notes imported from the user's Notion "German Grammar Notes" database.
 *
 * Each entry becomes a note inside a topic group on first import. Content is
 * stored as Markdown. Notion-hosted images that used short-lived signed S3 URLs
 * were reconstructed here as Markdown tables so the notes stay self-contained
 * and never show broken images. Publicly hosted diagram URLs are kept as-is.
 *
 * @typedef {Object} SeedNote
 * @property {string} title    Note title.
 * @property {string} group    Topic group it belongs to.
 * @property {string} level    CEFR level (A2/B1/B2/C1).
 * @property {string} content  Markdown body.
 */

/** @type {SeedNote[]} */
export const SEED_NOTES = [
  {
    title: "Cases (Kasus)",
    group: "Nouns & Cases",
    level: "A2",
    content: `> **4 cases = 4 roles in a sentence.** Think of them as job titles: Nominativ = the CEO (does the action), Akkusativ = the direct target, Dativ = the indirect recipient, Genitiv = the owner. The case changes article and adjective endings.

## Nominativ — the subject
Asks **Wer? / Was?** It is the person/thing performing the action.
Copula verbs (act like "="): **sein, werden, heißen** keep the following noun in the Nominativ.
- *Ich bin der Student.* · *Max wird Arzt.*
- Prepositions: **none** govern the Nominativ.

## Akkusativ — the direct object
Asks **Wen? / Was? / Wohin? / Wie lange?**
Always-Akkusativ prepositions: **ohne, um, bis, durch, gegen, für** (mnemonic: *O-U-B-D-G-F*).

## Dativ — the indirect object
Asks **Wem?**
Always-Dativ prepositions: **aus, bei, mit, nach, seit, von, zu, gegenüber**.

## Genitiv — possession
Asks **Wessen?**
Genitiv prepositions: **(an)statt, trotz, während, wegen**.

## Two-way (Wechsel) prepositions
**an, auf, hinter, in, neben, über, unter, vor, zwischen** → Akkusativ for movement (**wohin?**), Dativ for location (**wo?**).`,
  },
  {
    title: "Personalpronomen",
    group: "Pronouns",
    level: "A2",
    content: `Personal pronouns across all 4 cases. Formal **Sie** is always capitalised.

| Person | Nominativ | Akkusativ | Dativ |
|---|---|---|---|
| 1. Sg. | ich | mich | mir |
| 2. Sg. | du | dich | dir |
| 3. Sg. m | er | ihn | ihm |
| 3. Sg. f | sie | sie | ihr |
| 3. Sg. n | es | es | ihm |
| 1. Pl. | wir | uns | uns |
| 2. Pl. | ihr | euch | euch |
| 3. Pl. | sie | sie | ihnen |
| formal | Sie | Sie | Ihnen |

> Tip: only **er → ihn** changes shape in the Akkusativ for singulars; the Dativ is where most forms shift (*mir, dir, ihm, ihr, ihm, uns, euch, ihnen*).`,
  },
  {
    title: "Word Order Cheatsheet",
    group: "Sentence Structure",
    level: "B1",
    content: `> **3 sentence types:** Aussage (statement) · W-Frage (open question) · Ja/Nein-Frage. Only the verb position changes between them.

## Aussage (statement) — verb in position 2
**Sub(1) + conjVerb(2) + ObjDat + Te + Ka + Mo + ObjAkk + Lo + infVerb/Part2**
Whatever occupies position 1 (subject, time, place) forces the conjugated verb into slot 2.

### TeKaMoLo — adverbial order
Stack adverbials as **Time → Cause → Manner → Place**.

| Slot | Meaning | Key question |
|---|---|---|
| **Te** | Temporal | Wann? Wie lange? |
| **Ka** | Kausal | Warum? |
| **Mo** | Modal | Wie? |
| **Lo** | Lokal | Wo? Woher? Wohin? |

## W-Frage (open question)
**W-Wort + conjVerb + Subjekt … + inf/Part2?** — same V2 rule.
- *Wann bist du an die Uni gekommen?* · *Welches Buch magst du?*

## Ja/Nein-Frage
**conjVerb + Subjekt … + inf/Part2?** — verb jumps to position 1.
- *Kochst du gerne?*

| Type | Pos. 1 | Pos. 2 |
|---|---|---|
| Aussage | Subject/adverb | **Verb** |
| W-Frage | W-Wort | **Verb** |
| Ja/Nein | **Verb** | Subject |`,
  },
  {
    title: "Adjektivdeklination",
    group: "Adjectives",
    level: "B1",
    content: `Adjective endings change with **article type × case × gender/number**. Three patterns.

## 1. After definite article (der/die/das) — *weak*
| | m | f | n | pl |
|---|---|---|---|---|
| Nom | -e | -e | -e | -en |
| Akk | -en | -e | -e | -en |
| Dat | -en | -en | -en | -en |
| Gen | -en | -en | -en | -en |

## 2. After indefinite article (ein/kein/mein) — *mixed*
| | m | f | n | pl |
|---|---|---|---|---|
| Nom | -er | -e | -es | -en |
| Akk | -en | -e | -es | -en |
| Dat | -en | -en | -en | -en |
| Gen | -en | -en | -en | -en |

## 3. No article — *strong* (adjective shows the case)
| | m | f | n | pl |
|---|---|---|---|---|
| Nom | -er | -e | -es | -e |
| Akk | -en | -e | -es | -e |
| Dat | -em | -er | -em | -en |
| Gen | -en | -er | -en | -er |

> Rule of thumb: if the article already shows the gender/case signal, the adjective relaxes to **-e/-en**; if there's no article, the adjective must carry the signal itself.`,
  },
  {
    title: "Imperativ",
    group: "Verbs & Tenses",
    level: "B1",
    content: `> **Two modes:** Direkt = giving a command face-to-face. Indirekt = reporting someone else's command.

## Direkt — direct commands
Conjugated verb first; subject optional (only Sie/wir require it).

| Target | Ending | Example |
|---|---|---|
| **Sie** (formal) | -en | *Lesen Sie das Buch! · Seien Sie nett!* |
| **ihr** (plural du) | -t | *Lest das Buch! · Seid nett!* |
| **du** (informal) | drop -st | *Lies das Buch! · Mach das! · Sei nett!* |

Key irregular du-forms: *sein → Sei!* · *lesen → Lies!* (e→ie) · *arbeiten → Arbeite!* (keeps -e).

## Indirekt — reported commands
**[Speaker] sagt, [Subject] soll + [Obj] + [Infinitiv]** — use **sollen**, verb stays Infinitiv and moves to clause end.
- *Der Lehrer sagt, ich soll dieses Buch lesen.*
- *Mach die Hausaufgaben!* → *Sie sagt, du sollst die Hausaufgaben machen.*`,
  },
  {
    title: "Futur 1 & 2",
    group: "Verbs & Tenses",
    level: "B1",
    content: `> **Futur 1** = *werden* + Infinitiv. **Futur 2** = *werden* + Partizip II + *haben/sein*. In speech, present + time adverb is more common for real future.

## Futur 1 — werden + Infinitiv
*Ich werde nach Wien fliegen.*

| Construction | Certainty | Example |
|---|---|---|
| Present + time adverb | ~100% | *Ich fliege morgen nach Wien.* |
| Futur 1 | ~50% | *Ich werde morgen nach Wien fliegen.* |

> Switching to Futur 1 is like adding "probably" — it softens certainty.

## Futur 2 — werden + Partizip II + haben/sein
For actions **completed** by a future point ("will have done").
- *Mein Bachelor wird 2027 beendet sein.*

## Special present-tense uses of *werden + Infinitiv*
- **Aufforderung** (firm command): *Du wirst es jetzt machen!*
- **Vermutung** (speculation): *Er wird in der Kantine sein.*`,
  },
  {
    title: "Konjunktiv I",
    group: "Verbs & Tenses",
    level: "B2",
    content: `> **Use:** reporting what someone said, neutrally (journalism, formal writing). You're a relay station — transmit without amplifying.

## Formation: Infinitivstamm + KI endings
Drop -en from the infinitive, add -e / -est / -e / -en / -et / -en.

| Pronoun | Ending | *machen* | *haben* |
|---|---|---|---|
| ich | -e | mache | habe |
| du | -est | machest | habest |
| **er/sie/es** | -e | **mache** ← most used | **habe** |
| wir | -en | machen | haben |
| ihr | -et | machet | habet |
| sie/Sie | -en | machen | haben |

Irregular *sein*: **sei, seiest, sei, seien, seiet, seien**. — *Er sagte, er sei krank.*

## Direct → indirect speech
1. Shift pronouns (*ich → er/sie*). 2. Drop quotes, optionally add *dass*. 3. With *dass*, verb goes to clause end.
- *Der Arzt sagt, der Patient brauche Ruhe.*

## Substitution rule
If the KI form looks identical to the Indikativ → use **Konjunktiv II**; if that also clashes → **würde + Infinitiv**.
- *Sie haben kein Geld* ❌ → *sie hätten kein Geld* ✓`,
  },
  {
    title: "Konjunktiv II",
    group: "Verbs & Tenses",
    level: "B2",
    content: `> **Use:** hypotheticals, unreal conditions (*wenn ich reich wäre…*), polite requests (*Könnten Sie…?*).

## Formation — two routes
**Route A — strong verbs:** Präteritum stem + Umlaut + KII endings.

| Verb | Präteritum | er/sie/es KII |
|---|---|---|
| sein | war | **wäre** |
| haben | hatte | **hätte** |
| werden | wurde | **würde** |
| kommen | kam | **käme** |
| können | konnte | **könnte** |
| müssen | musste | **müsste** |

**Route B — weak verbs:** KII = Präteritum, so use **würde + Infinitiv** instead. — *Ich würde das machen.*

## sein & haben (memorise)
| | sein | haben |
|---|---|---|
| ich | wäre | hätte |
| du | wärest | hättest |
| er/sie/es | wäre | hätte |
| wir | wären | hätten |
| ihr | wäret | hättet |
| sie/Sie | wären | hätten |

## Core uses
1. **Unreal conditional:** *Wenn ich mehr Zeit hätte, würde ich mehr lesen.*
2. **Polite:** *Könnten Sie mir helfen?* · *Ich hätte gerne einen Kaffee.*
3. **Past KII** (unreal past): KII of haben/sein + Partizip II — *Wenn ich gelernt hätte, hätte ich bestanden.*`,
  },
  {
    title: "Passiv (Prozess vs Zustand)",
    group: "Verbs & Tenses",
    level: "B2",
    content: `> **Two passive types:** Vorgangspassiv (*werden*) = action in progress. Zustandspassiv (*sein*) = resulting state. Like "the door is being painted" vs "the door is painted".

## Vorgangspassiv (process) — Obj + werden + von + Sub + Part2
| Tense | Formula | Example |
|---|---|---|
| Präsens | Obj + **wird** + von… + Part2 | *Das Haus wird von mir gebaut.* |
| Präteritum | Obj + **wurde** + … + Part2 | *Das Haus wurde von mir gebaut.* |
| Perfekt | Obj + **ist** + … + Part2 + **worden** | *Das Haus ist von mir gebaut worden.* |
| Plusquam. | Obj + **war** + … + Part2 + **worden** | *Das Haus war von mir gebaut worden.* |
| Futur | Obj + **wird** + … + Part2 + **werden** | *Das Haus wird von mir gebaut werden.* |

Modal: *Das Haus kann von mir gebaut werden.*

## Zustandspassiv (state) — Obj + sein + Part2
- Präsens: *Das Haus ist von mir gebaut.*
- Präteritum: *Das Haus war von mir gebaut.*

## Causative *lassen*
- Self: *Ich wasche mein Auto.* → Delegated: *Ich lasse mein Auto waschen.*

## Ersatz (passive replacements)
- **sich lassen + Infinitiv:** *Die Experimente lassen sich durchführen.*
- **sein + zu + Infinitiv:** *Die Experimente sind durchzuführen.*
- **sein + -bar/-lich:** *Die Experimente sind durchführbar.*`,
  },
];
