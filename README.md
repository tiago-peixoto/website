# tiagop.dev.br

The personal site of Tiago Peixoto.
It is a static site built with [Eleventy](https://www.11ty.dev).

## Commands

- `npm start` serves the site at http://localhost:8080 and reloads on save.
- `npm test` builds the site into `_site` and checks it for broken internal links.

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
- `src/assets/style.css` holds all the styles.
- `eleventy.config.js` holds the pixel grids of the hero and the bug.
- `src/assets/game.js` holds the rules of the battle.
- `src/_data/site.json` holds the site name and the canonical domain.
