import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";

export type WebsiteBlock = {
  type: "hero" | "text" | "cta" | "gallery" | "events" | "amenities";
  props: Record<string, string | number | boolean | string[]>;
};

export interface WebsitePageDTO {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  sortOrder: number;
  blocks: WebsiteBlock[];
  updatedAt: string;
}

function parseBlocks(json: string): WebsiteBlock[] {
  try {
    const parsed = JSON.parse(json) as WebsiteBlock[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toDto(row: {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  sortOrder: number;
  blocksJson: string;
  updatedAt: Date;
}): WebsitePageDTO {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    published: row.published,
    sortOrder: row.sortOrder,
    blocks: parseBlocks(row.blocksJson),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const DEFAULT_HOME_BLOCKS: WebsiteBlock[] = [
  {
    type: "hero",
    props: {
      headline: "Welcome to your club",
      subhead: "Tee times, dining, and events — all in one place.",
      ctaLabel: "Member login",
      ctaHref: "/login",
    },
  },
  {
    type: "amenities",
    props: { title: "Amenities", showBook: true },
  },
  {
    type: "events",
    props: { title: "Upcoming events", limit: 6 },
  },
];

export async function ensureDefaultWebsite(communityId: string): Promise<void> {
  await ensureRecordsSeeded();
  const existing = await prisma.clubWebsitePage.findFirst({
    where: { communityId, slug: "home" },
  });
  if (existing) return;

  await prisma.clubWebsitePage.create({
    data: {
      communityId,
      slug: "home",
      title: "Home",
      published: true,
      sortOrder: 0,
      blocksJson: JSON.stringify(DEFAULT_HOME_BLOCKS),
    },
  });
}

export async function listWebsitePages(communityId: string): Promise<WebsitePageDTO[]> {
  await ensureDefaultWebsite(communityId);
  const rows = await prisma.clubWebsitePage.findMany({
    where: { communityId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toDto);
}

export async function getPublishedWebsite(communityId: string) {
  await ensureDefaultWebsite(communityId);
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  const pages = await prisma.clubWebsitePage.findMany({
    where: { communityId, published: true },
    orderBy: { sortOrder: "asc" },
  });
  return {
    community: community
      ? {
          id: community.id,
          name: community.name,
          logoUrl: community.logoUrl,
          primaryColor: community.primaryColor,
        }
      : null,
    published: community?.websitePublished ?? false,
    pages: pages.map(toDto),
  };
}

export async function upsertWebsitePage(input: {
  id?: string;
  communityId: string;
  slug: string;
  title: string;
  published?: boolean;
  sortOrder?: number;
  blocks: WebsiteBlock[];
}): Promise<WebsitePageDTO> {
  const blocksJson = JSON.stringify(input.blocks);
  if (input.id) {
    const row = await prisma.clubWebsitePage.update({
      where: { id: input.id },
      data: {
        slug: input.slug,
        title: input.title,
        published: input.published,
        sortOrder: input.sortOrder,
        blocksJson,
      },
    });
    return toDto(row);
  }

  const row = await prisma.clubWebsitePage.create({
    data: {
      communityId: input.communityId,
      slug: input.slug,
      title: input.title,
      published: input.published ?? false,
      sortOrder: input.sortOrder ?? 0,
      blocksJson,
    },
  });
  return toDto(row);
}

export async function publishClubWebsite(communityId: string, published: boolean) {
  await prisma.community.update({
    where: { id: communityId },
    data: { websitePublished: published },
  });
  return { published };
}
