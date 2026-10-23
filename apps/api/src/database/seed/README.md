# Demo seed

`yarn workspace api seed` is idempotent: it inserts missing rows and never changes existing ones.

## Users

| Email | Name | Password |
|---|---|---|
| alice@demo.local | Alice | `SEED_DEMO_PASSWORD` from `.env.local` |
| bob@demo.local | Bob | same |

## Catalog

Merchants: SoundHub, TechCorner, HomeGoods. Categories: Audio, Sports, Home, Books, Kitchen.
35 products, all in EUR.

### Items sold by two merchants

Use these for quickstart S2 (comparison). The cheaper offer should win.

| Item ref | Cheaper | Dearer |
|---|---|---|
| `audio-runbuds-pro` | TechCorner 79.00 | SoundHub 89.00 |
| `audio-studio-max` | TechCorner 229.00 | SoundHub 249.00 |
| `audio-bassbox-mini` | SoundHub 49.00 | TechCorner 54.00 |
| `sports-trail-bottle` | HomeGoods 15.00 | TechCorner 19.00 |
| `home-desk-lamp` | HomeGoods 39.00 | TechCorner 42.00 |
| `books-agentic-guide` | TechCorner 22.00 | HomeGoods 24.00 |
| `kitchen-chef-knife` | HomeGoods 39.00 | TechCorner 45.00 |

A request such as "wireless running earbuds" matches `audio-runbuds-pro`.

### Edge cases

- `audio-clip-earbuds` (SoundHub, 39.13): the simulated gateway declines prices ending in
  `.13` (`SIMULATED_DECLINE_CENTS`).
- `audio-neckband-sport` (SoundHub): stock 0, never eligible.
