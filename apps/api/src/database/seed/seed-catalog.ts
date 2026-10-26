import type { DataSource } from "typeorm";
import { v5 as uuidv5 } from "uuid";
import {
  CategoryEntity,
  MerchantEntity,
  ProductEntity,
} from "../../catalog/infrastructure/catalog.entities";

// Ids are derived from slugs so every run produces the same rows (idempotent seed).
const NAMESPACE = "6f1c9a52-3b7e-4d0a-9c1e-5a2b8d4f7e90";
const idFor = (kind: string, key: string) => uuidv5(`${kind}:${key}`, NAMESPACE);

const MERCHANTS = [
  { slug: "soundhub", name: "SoundHub" },
  { slug: "techcorner", name: "TechCorner" },
  { slug: "homegoods", name: "HomeGoods" },
] as const;

const CATEGORIES = [
  { slug: "audio", name: "Audio" },
  { slug: "sports", name: "Sports" },
  { slug: "home", name: "Home" },
  { slug: "books", name: "Books" },
  { slug: "kitchen", name: "Kitchen" },
] as const;

type MerchantSlug = (typeof MERCHANTS)[number]["slug"];
type CategorySlug = (typeof CATEGORIES)[number]["slug"];

// [merchant, category, item ref, name, description, price in cents, stock]
type Row = [MerchantSlug, CategorySlug, string, string, string, number, number];

const PRODUCTS: readonly Row[] = [
  // Audio. Items sold by two merchants are listed together; see README.md.
  ["soundhub", "audio", "audio-runbuds-pro", "RunBuds Pro Running Earbuds", "Wireless running headphones, in-ear, sweat-proof, 8 h battery", 8900, 12],
  ["techcorner", "audio", "audio-runbuds-pro", "RunBuds Pro Running Earbuds", "Wireless running headphones, in-ear, sweat-proof, 8 h battery", 7900, 5],
  ["soundhub", "audio", "audio-studio-max", "Studio Max Headphones", "Wireless over-ear headphones with noise cancelling", 24900, 6],
  ["techcorner", "audio", "audio-studio-max", "Studio Max Headphones", "Wireless over-ear headphones with noise cancelling", 22900, 3],
  ["soundhub", "audio", "audio-bassbox-mini", "BassBox Mini", "Portable bluetooth speaker, waterproof", 4900, 20],
  ["techcorner", "audio", "audio-bassbox-mini", "BassBox Mini", "Portable bluetooth speaker, waterproof", 5400, 8],
  ["soundhub", "audio", "audio-clip-earbuds", "Clip Earbuds", "Wireless earbuds with ear hooks for sport", 3913, 10],
  ["soundhub", "audio", "audio-neckband-sport", "Neckband Sport", "Wireless neckband headphones for running", 5900, 0],
  ["soundhub", "audio", "audio-wired-classic", "Classic Wired Earphones", "Wired earphones with microphone", 1900, 40],
  ["techcorner", "audio", "audio-podcast-mic", "Podcast USB Microphone", "USB condenser microphone", 6900, 7],
  ["soundhub", "audio", "audio-kids-headphones", "Kids Headphones", "Volume-limited wireless headphones for children", 2900, 15],
  // Sports
  ["techcorner", "sports", "sports-trail-bottle", "Trail Bottle 750 ml", "Insulated running bottle", 1900, 30],
  ["homegoods", "sports", "sports-trail-bottle", "Trail Bottle 750 ml", "Insulated running bottle", 1500, 25],
  ["techcorner", "sports", "sports-gps-watch", "Pace GPS Watch", "Running watch with GPS and heart rate", 14900, 4],
  ["techcorner", "sports", "sports-armband", "Phone Armband", "Running armband for phones up to 6.7 in", 1200, 50],
  ["homegoods", "sports", "sports-yoga-mat", "Yoga Mat", "Non-slip mat, 6 mm", 2900, 18],
  ["homegoods", "sports", "sports-resistance-bands", "Resistance Bands", "Set of five bands", 1800, 22],
  ["techcorner", "sports", "sports-headlamp", "Run Headlamp", "Rechargeable headlamp, 400 lumens", 3400, 9],
  // Home
  ["homegoods", "home", "home-desk-lamp", "LED Desk Lamp", "Dimmable lamp with USB charging", 3900, 14],
  ["techcorner", "home", "home-desk-lamp", "LED Desk Lamp", "Dimmable lamp with USB charging", 4200, 6],
  ["homegoods", "home", "home-throw-blanket", "Throw Blanket", "Soft fleece blanket", 2500, 16],
  ["homegoods", "home", "home-plant-pot", "Ceramic Plant Pot", "Pot with drainage, 20 cm", 1600, 30],
  ["homegoods", "home", "home-wall-clock", "Wall Clock", "Silent quartz wall clock", 2200, 11],
  ["techcorner", "home", "home-smart-plug", "Smart Plug", "Wi-Fi plug with energy monitoring", 1700, 35],
  // Books
  ["homegoods", "books", "books-agentic-guide", "A Practical Guide to Agents", "Paperback, 320 pages", 2400, 9],
  ["techcorner", "books", "books-agentic-guide", "A Practical Guide to Agents", "Paperback, 320 pages", 2200, 4],
  ["homegoods", "books", "books-running-log", "The Running Log", "Training journal", 1400, 20],
  ["homegoods", "books", "books-cookbook-quick", "Quick Weeknight Cooking", "Hardcover cookbook", 2800, 7],
  ["techcorner", "books", "books-typescript", "TypeScript in Depth", "Paperback, 450 pages", 3900, 5],
  // Kitchen
  ["homegoods", "kitchen", "kitchen-chef-knife", "Chef Knife 20 cm", "Stainless steel chef knife", 3900, 10],
  ["techcorner", "kitchen", "kitchen-chef-knife", "Chef Knife 20 cm", "Stainless steel chef knife", 4500, 3],
  ["homegoods", "kitchen", "kitchen-french-press", "French Press", "Glass coffee press, 1 l", 2700, 13],
  ["homegoods", "kitchen", "kitchen-cutting-board", "Bamboo Cutting Board", "Large bamboo board", 1900, 24],
  ["techcorner", "kitchen", "kitchen-scale", "Kitchen Scale", "Digital scale, 1 g precision", 1500, 17],
  ["homegoods", "kitchen", "kitchen-mixing-bowls", "Mixing Bowls", "Set of three steel bowls", 2300, 12],
];

// Listing dates are spaced one hour apart in seed order, for the "earliest listed" tie-break.
const LISTED_FROM = Date.parse("2026-09-01T08:00:00Z");

/** Inserts merchants, categories and products; existing rows are left untouched. */
export async function seedCatalog(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const insert = (entity: object, values: object[]) =>
      manager.createQueryBuilder().insert().into(entity as never).values(values).orIgnore().execute();

    await insert(
      MerchantEntity,
      MERCHANTS.map((m) => ({ id: idFor("merchant", m.slug), ...m })),
    );
    await insert(
      CategoryEntity,
      CATEGORIES.map((c) => ({ id: idFor("category", c.slug), ...c })),
    );
    await insert(
      ProductEntity,
      PRODUCTS.map(([merchant, category, itemRef, name, description, priceMinor, stock], index) => ({
        id: idFor("product", `${merchant}:${itemRef}`),
        merchantId: idFor("merchant", merchant),
        categoryId: idFor("category", category),
        itemRef,
        name,
        description,
        priceMinor,
        currency: "EUR",
        stock,
        listedAt: new Date(LISTED_FROM + index * 3_600_000),
      })),
    );
  });
}
