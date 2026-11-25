# tiagop.dev.br

The personal site of Tiago Peixoto.
It is a static site built with [Eleventy](https://www.11ty.dev).

## Commands

- `npm start` serves the site at http://localhost:8080 and reloads on save.
- `npm test` builds the site into `_site` and checks internal links, battle rules, and plaza movement and content.

## Plaza preview

Open `/play/` for English or `/pt/play/` for Portuguese after starting the local server.
The existing portfolio and battle stay at `/` and `/pt/`.
The preview uses temporary shapes, not finished artwork.

Choose “Enter the plaza”, then use arrows or WASD to walk.
Face the university door and press Enter or Space to read.
Escape closes the panel or leaves play, and Tab leaves the map normally.
Touch controls move one tile per tap.
The directory opens the university without walking and links to the complete regular portfolio.

The preview draws only after input, with no animation, timers, held-input state, music, or saved progress.
The visible portfolio links work without JavaScript or a drawing context.
Serve `_site` over HTTP to run JavaScript modules, rather than opening its files with `file://`.
Preview assets use relative paths so a copied build also works under a subdirectory.

## Write a post

Create a markdown file in `src/posts`, for example `src/posts/reproduce-first.md`:

```md
---
title: Reproduce first
date: 2026-11-20
---

The text of the post.
```

The post appears in the journal and on the home page with no other edit.

## Where things live

- `src/index.liquid` holds the home page structure, shared by both languages.
- `src/_data/i18n.json` holds the home page text in English and Portuguese.
- `src/assets/style.css` holds the regular portfolio styles.
- `src/play.liquid` and `src/_data/plaza.json` hold the bilingual preview page and its controls text.
- `src/_data/university.json` shares the university name and dates between both presentations.
- `src/assets/plaza.css`, `plaza.js`, and `plaza-map.js` hold the preview styles, browser controls, and map rules.
- `check-plaza.js` checks movement, collision, reachability, panel state, and university wording.
- `src/assets/sprites/` holds the burgundy character sheet and green beetle as lossless WebP images.
- `eleventy.config.js` selects each sprite's region and accessible description.
- `src/assets/game.js` holds the rules of the battle.
- `src/_data/site.json` holds the site name and the canonical domain.
