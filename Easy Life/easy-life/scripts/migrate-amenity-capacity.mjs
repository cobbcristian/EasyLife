/** One-time migration: court capacity, surfaces, and tournament pool setup. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SURFACE_SPLITS = [
  {
    match: /tennis/i,
    replace: [
      {
        name: "Tennis — Green Clay",
        description: "Green clay courts for league and tournament play.",
        kind: "court",
        unitCount: 12,
        surface: "green_clay",
      },
      {
        name: "Tennis — Hard Court",
        description: "Hard courts — stay open for member bookings during tournaments on other surfaces.",
        kind: "court",
        unitCount: 8,
        surface: "hard_court",
      },
    ],
  },
  {
    match: /pickleball/i,
    patch: { kind: "court", unitCount: 2, surface: null },
  },
  {
    match: /golf/i,
    patch: {
      kind: "golf_course",
      unitCount: 1,
      holes: 18,
      surface: null,
      description: "18-hole par 72 course with practice range.",
    },
  },
];

async function main() {
  const amenities = await prisma.amenity.findMany();
  let updated = 0;
  let created = 0;

  for (const amenity of amenities) {
    const split = SURFACE_SPLITS.find((r) => r.match.test(amenity.name));
    if (!split) continue;

    if ("replace" in split && split.replace) {
      if (amenity.name.includes("—")) continue;
      await prisma.amenity.delete({ where: { id: amenity.id } });
      for (const row of split.replace) {
        await prisma.amenity.create({
          data: {
            communityId: amenity.communityId,
            name: row.name,
            description: row.description,
            fee: amenity.fee,
            schedule: amenity.schedule,
            kind: row.kind,
            unitCount: row.unitCount,
            surface: row.surface,
          },
        });
        created++;
      }
      console.log(`Split ${amenity.name} into ${split.replace.length} surface groups`);
      continue;
    }

    if ("patch" in split && split.patch) {
      await prisma.amenity.update({
        where: { id: amenity.id },
        data: split.patch,
      });
      updated++;
    }
  }

  const bookings = await prisma.booking.findMany({
    where: { OR: [{ amenity: { contains: "Tennis Court" } }, { amenity: "Tennis Courts" }] },
  });
  for (const b of bookings) {
    await prisma.booking.update({
      where: { id: b.id },
      data: { amenity: "Tennis — Green Clay", unitNumber: b.unitNumber ?? 1 },
    });
  }

  console.log(`Done. ${updated} amenities updated, ${created} created, ${bookings.length} bookings relabeled.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
