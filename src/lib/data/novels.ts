import type { Chapter, Novel } from "@/types";

type RawChapter = Pick<Chapter, "number" | "title" | "content" | "publishedAt">;

interface NovelSeed extends Omit<Novel, "chapterCount"> {
  chapters: RawChapter[];
}

const lorem = (paragraphs: string[]) => paragraphs;

const seeds: NovelSeed[] = [
  {
    id: "1",
    slug: "the-lantern-of-quiet-tides",
    title: "The Lantern of Quiet Tides",
    author: "Mira Solenne",
    synopsis:
      "A reclusive lighthouse keeper discovers a lantern that reveals the memories of everyone its light touches. As the tide brings strangers to her shore, she must decide whose past is hers to carry.",
    genres: ["Fantasy", "Drama", "Mystery"],
    status: "ongoing",
    updatedAt: "2026-05-28",
    chapters: [
      {
        number: 1,
        title: "Salt and Lamplight",
        publishedAt: "2026-01-12",
        content: lorem([
          "The lantern had not been lit in seven years, and yet Eune climbed the spiral stair as though the climb itself were a kind of prayer. Each step wore the same groove her grandmother's feet had worn before her, and her mother's before that.",
          "When she reached the lamp room, the sea was the color of old pewter. She struck the match. The flame caught, hesitated, then bloomed into a steady gold that spilled across the glass and out over the water.",
          "What she did not expect was the memory that came with it: a boy she had never met, standing on a dock she had never seen, waving at a ship that would never return.",
        ]),
      },
      {
        number: 2,
        title: "The First Stranger",
        publishedAt: "2026-01-19",
        content: lorem([
          "By morning the storm had left a man on her beach, half-drowned and clutching a wooden box as if it were the last warm thing in the world.",
          "Eune dragged him above the tideline and, against every instinct she had cultivated in her years of solitude, she let the lantern's light fall on his sleeping face.",
          "His memories were not his own. That was the first impossible thing. The second was that some of them were hers.",
        ]),
      },
      {
        number: 3,
        title: "What the Tide Keeps",
        publishedAt: "2026-01-26",
        content: lorem([
          "They spoke little over the days that followed. He did not remember his name, and she did not offer hers freely.",
          "But every evening the lantern asked its silent question, and every evening she answered by climbing the stair.",
        ]),
      },
    ],
  },
  {
    id: "2",
    slug: "ledger-of-falling-stars",
    title: "Ledger of Falling Stars",
    author: "Kestrel Vane",
    synopsis:
      "In a city where debts are paid in years of life, a young accountant uncovers a ledger that should not exist. Balancing it could free thousands, or erase her entirely.",
    genres: ["Sci-Fi", "Mystery", "Adventure"],
    status: "ongoing",
    updatedAt: "2026-05-30",
    chapters: [
      {
        number: 1,
        title: "Compound Interest",
        publishedAt: "2026-02-02",
        content: lorem([
          "The clock above the Exchange did not measure hours. It measured what remained. Sefi watched the numbers tick down over the heads of the crowd and tried not to do the arithmetic on her own dwindling balance.",
          "She was good with numbers. It was the only reason the Ministry had not collected on her yet.",
        ]),
      },
      {
        number: 2,
        title: "The Account That Wasn't",
        publishedAt: "2026-02-09",
        content: lorem([
          "The ledger appeared in her queue at 3:14 in the morning, stamped with an authority code that predated the Ministry itself.",
          "Every entry was a name. Every name owed nothing. And at the very bottom, in handwriting she recognized as her own, was a single line she had no memory of writing.",
        ]),
      },
    ],
  },
  {
    id: "3",
    slug: "tea-house-at-the-edge-of-maps",
    title: "Tea House at the Edge of Maps",
    author: "Olen Marsh",
    synopsis:
      "A traveling tea house appears only to those who are truly lost. Its proprietor brews a cup for every wanderer, and each cup tells the story of the road still ahead.",
    genres: ["Slice of Life", "Fantasy", "Comedy"],
    status: "completed",
    updatedAt: "2026-04-15",
    chapters: [
      {
        number: 1,
        title: "A Door Where No Door Was",
        publishedAt: "2026-03-01",
        content: lorem([
          "The road had forgotten where it was going, and so, apparently, had Wen. He had been walking since the moon rose, and the moon had since given up and gone home.",
          "Then there was a door. It stood in the middle of the meadow without a wall to hold it, and warm light leaked from beneath it like spilled honey.",
        ]),
      },
      {
        number: 2,
        title: "The Proprietor",
        publishedAt: "2026-03-08",
        content: lorem([
          "\"You're early,\" said the woman behind the counter, though Wen was certain he had no appointment.",
          "She set a cup before him. The steam rose in shapes he almost recognized: a mountain, a city, a face he had not yet met.",
        ]),
      },
    ],
  },
  {
    id: "4",
    slug: "the-cartographers-apprentice",
    title: "The Cartographer's Apprentice",
    author: "Inez Halloran",
    synopsis:
      "Maps in the Republic are living things, and they must be tended. When her master vanishes mid-survey, an apprentice inherits an unfinished map that is quietly redrawing the world.",
    genres: ["Adventure", "Fantasy"],
    status: "ongoing",
    updatedAt: "2026-05-22",
    chapters: [
      {
        number: 1,
        title: "Ink That Breathes",
        publishedAt: "2026-04-04",
        content: lorem([
          "A map is a promise, Master Dell liked to say, and a promise must be kept or it festers. Tamsin had not understood him then. She was beginning to now.",
          "The half-finished coastline on the table had shifted overnight. A bay that was not there yesterday curved inward like a held breath.",
        ]),
      },
    ],
  },
  {
    id: "5",
    slug: "songs-for-the-machine-choir",
    title: "Songs for the Machine Choir",
    author: "Davian Roe",
    synopsis:
      "After the last human composer dies, the orchestral machines fall silent, unsure how to grieve. A maintenance technician teaches them, one broken note at a time.",
    genres: ["Sci-Fi", "Drama"],
    status: "hiatus",
    updatedAt: "2026-02-18",
    chapters: [
      {
        number: 1,
        title: "Rest (Silent)",
        publishedAt: "2026-01-30",
        content: lorem([
          "The Choir had not played in forty days. Amaranth dust settled on the brass, and the great hall held its breath the way only empty halls can.",
          "Joss climbed into the rafters with a wrench in her teeth and an apology in her chest, though she could not have said to whom she owed it.",
        ]),
      },
    ],
  },
  {
    id: "6",
    slug: "the-paper-detective",
    title: "The Paper Detective",
    author: "Suri Cope",
    synopsis:
      "Origami that comes alive when folded over a true confession. A small-town detective with a guilty conscience finds her secrets walking out the door on tiny paper legs.",
    genres: ["Mystery", "Comedy", "Slice of Life"],
    status: "ongoing",
    updatedAt: "2026-05-31",
    chapters: [
      {
        number: 1,
        title: "A Crane Named Regret",
        publishedAt: "2026-05-10",
        content: lorem([
          "It started, as most of Detective Park's problems did, with a confession she had not meant to make out loud.",
          "The paper crane on her desk unfolded one wing, considered her with a crease that might have been an eye, and hopped purposefully toward the window.",
        ]),
      },
    ],
  },
];

export const novels: Novel[] = seeds.map(({ chapters, ...rest }) => ({
  ...rest,
  chapterCount: chapters.length,
}));

export const chapters: Chapter[] = seeds.flatMap((seed) =>
  seed.chapters.map((chapter) => ({
    id: `${seed.id}-${chapter.number}`,
    novelSlug: seed.slug,
    number: chapter.number,
    title: chapter.title,
    content: chapter.content,
    publishedAt: chapter.publishedAt,
  })),
);

export const featuredSlugs = [
  "the-lantern-of-quiet-tides",
  "ledger-of-falling-stars",
  "the-paper-detective",
];

export const librarySlugs = [
  "the-lantern-of-quiet-tides",
  "tea-house-at-the-edge-of-maps",
  "the-cartographers-apprentice",
];
