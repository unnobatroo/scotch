# 🥃 Scotch

Ich lerne Deutsch — und irgendwann hatte ich keine Lust mehr, zwischen fünf verschiedenen Apps hin- und herzuwechseln. Anki ist zu klobig, Notion zu generisch, Duolingo eher Gamification als echtes Lernen. Also hab ich mein eigenes Ding gebaut.

Scotch ist eine persönliche Lern-App mit drei Bereichen: Karteikarten mit Leitner-System, Markdown-Notizen im Kanban-Board-Stil, und ein KI-Korrektor der meine Übungsantworten gegen den echten Lösungsschlüssel aus dem Buch prüft. Alles mobile-first, weil ich meistens im Bus oder in der U-Bahn lerne.

## Was drin steckt

Die Karteikarten sind auf deutsche Grammatik zugeschnitten — Nomen haben Artikel + Singular/Plural und sind farblich nach Genus kodiert (`der` blau, `die` pink-rot, `das` grün, Pluralwörter gelb), Verben haben die drei Stammformen plus Hilfsverb, und für alles andere gibt's ein freies Format. Beim Lernen läuft Spaced Repetition nach dem Leitner-System: richtige Antwort → nächste Box, falsche → zurück zu Box 1. Simple, aber es funktioniert.

Die Notizen sind ein schlanker Notion-Ersatz für Grammatiknotizen. Der Editor ist CodeMirror 6 mit Obsidian-style Live-Preview — Formatierungszeichen verschwinden wenn der Cursor weg ist, Tabellen und Bilder werden als echte Elemente gerendert, die Markdown-Quelle bleibt die einzige Source of Truth. Tab in einer Tabelle formatiert automatisch alle Spalten auf die gleiche Breite (JetBrains-Stil) und springt zur nächsten Zelle.

Der KI-Korrektor ist der Teil, an dem ich am längsten saß und den ich am häufigsten benutze. Lösungsschlüssel einmal als PDF hochladen, dann nur noch Antworten reinkopieren. `lib/retrieval.js` findet die richtigen Seiten per Token-Überlappung, schickt sie an ein LLM, und bekommt zurück: was falsch war, welche Grammatikregel dahintersteckt, und wo im Buch das erklärt wird. Kein Vektorspeicher, kein Overhead — funktioniert für den Anwendungsfall gut genug.

## Stack

Next.js 14 mit App Router, JavaScript (kein TypeScript — für ein Soloprojekt war die Reibung nicht wert), deployed auf Vercel. Datenbank und Auth über Supabase: Postgres mit Row-Level Security auf jeder Tabelle, sodass `user_id = auth.uid()` auf Datenbankebene erzwungen wird und nicht im App-Code. Der anon-Key im Browser ist sicher genau weil RLS alles filtert.

Für die KI ist Groq der Standard (kostenlos, schnell), Claude die Empfehlung für den Korrektor weil er bei deutschen Grammatikerklärungen deutlich besser ist. Beide laufen über `lib/llm.js`, API-Keys nur server-seitig.