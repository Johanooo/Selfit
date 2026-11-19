---
name: Browserprov mot förhandsvisningen
description: Tillförlitlig väntan på React-sidor när de testas via Chromium i Replits förhandsvisning.
---

Vid automatiserade browserprov via Chromium ska navigation följas av en tidsbegränsad väntan på en unik komponent på målsidan, inte bara en fast kort paus.

**Why:** Den proxade React/Vite-förhandsvisningen kan bli klar efter en kort fördröjning, så tester som antar att sidan redan renderats får falska fel.

**How to apply:** I CDP- eller liknande browserprov, vänta tills sidans route och viktigaste testselektor finns innan du fokuserar eller läser element.
