import { prisma } from "@/lib/server/prisma";
import { ensureGrabGoSeeded } from "@/lib/server/grab-go";
import { isDemoSeedAllowed } from "@/lib/server/demo-mode";

type FourClubId = "spanish-wells" | "harbor-pointe" | "willow-creek" | "alliant";

const DEMO_SEED_REF = "demo_seed";

const CLUB_LEDGER: Record<
  FourClubId,
  { memberEmail: string; memberName: string; restaurant: string }
> = {
  "spanish-wells": {
    memberEmail: "member.demo@spanishwellscountryclub.com",
    memberName: "Jordan Blake",
    restaurant: "Casual Dining",
  },
  "harbor-pointe": {
    memberEmail: "member.demo@harborpointehoa.com",
    memberName: "Jordan Blake",
    restaurant: "Casual Dining",
  },
  "willow-creek": {
    memberEmail: "member.demo@willowcreekhoa.com",
    memberName: "Jordan Blake",
    restaurant: "Casual Dining",
  },
  alliant: {
    memberEmail: "resident.demo@alliantproperty.com",
    memberName: "Jordan Blake",
    restaurant: "Casual Dining",
  },
};

/**
 * Payments / dining orders / Grab & Go visits / rentals for the four /go clubs.
 * Idempotent — safe to call after ensure*DemoSeeded on warm DBs.
 */
export async function ensureFourClubDemoLedger(communityId: FourClubId): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!isDemoSeedAllowed()) return;

  const club = CLUB_LEDGER[communityId];
  const email = club.memberEmail.toLowerCase();
  const dueDate = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const paidDate = new Date(Date.now() - 18 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const isHoa =
    communityId === "harbor-pointe" ||
    communityId === "willow-creek" ||
    communityId === "alliant";
  const duesDescription = isHoa
    ? "Quarterly HOA assessment"
    : "Quarterly membership dues";
  const diningDescription = isHoa
    ? "Clubhouse dining — resident statement"
    : "Club dining — member statement";

  async function ensureCharge(input: {
    key: string;
    category: string;
    description: string;
    amount: number;
    status: "due" | "paid";
    dueDate: string;
  }) {
    const existing = await prisma.memberCharge.findFirst({
      where: {
        communityId,
        referenceType: DEMO_SEED_REF,
        referenceId: input.key,
      },
    });
    if (existing) {
      if (existing.description !== input.description) {
        await prisma.memberCharge.update({
          where: { id: existing.id },
          data: { description: input.description },
        });
      }
      return;
    }
    await prisma.memberCharge.create({
      data: {
        communityId,
        memberEmail: email,
        memberName: club.memberName,
        category: input.category,
        description: input.description,
        amount: input.amount,
        status: input.status,
        dueDate: input.dueDate,
        referenceType: DEMO_SEED_REF,
        referenceId: input.key,
      },
    });
  }

  await ensureCharge({
    key: `${communityId}-dues-current`,
    category: "dues",
    description: duesDescription,
    amount: 875,
    status: "due",
    dueDate,
  });
  await ensureCharge({
    key: `${communityId}-fb-paid`,
    category: "dining",
    description: diningDescription,
    amount: 64.5,
    status: "paid",
    dueDate: paidDate,
  });

  const orderMarker = `[demo:${communityId}-dining-1]`;
  const existingOrder = await prisma.diningOrder.findFirst({
    where: {
      communityId,
      memberEmail: email,
      items: { contains: orderMarker },
    },
  });
  if (!existingOrder) {
    await prisma.diningOrder.create({
      data: {
        communityId,
        memberEmail: email,
        memberName: club.memberName,
        items: JSON.stringify([
          { name: "Club Burger", qty: 1, price: 18 },
          { name: "Iced Tea", qty: 2, price: 4 },
        ]) + ` ${orderMarker}`,
        total: 26,
        fulfillment: "eat_in",
        restaurant: club.restaurant,
        status: "completed",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const existingRental = await prisma.rental.findFirst({
    where: {
      communityId,
      memberEmail: email,
      status: { in: ["reserved", "active", "checked_out"] },
    },
  });
  if (!existingRental) {
    const start = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const isGolfClub = communityId === "spanish-wells";
    await prisma.rental.create({
      data: {
        communityId,
        memberEmail: email,
        memberName: club.memberName,
        item: isGolfClub ? "Electric Golf Cart" : "Pool Cabana",
        itemId: isGolfClub ? "re2" : "re-cabana",
        days: 2,
        startDate: start,
        endDate: end,
        total: isGolfClub ? 80 : 40,
        status: "reserved",
      },
    });
  }

  await ensureGrabGoSeeded(communityId);
  const machine = await prisma.grabGoMachine.findFirst({ where: { communityId } });
  if (
    machine &&
    (await prisma.grabGoSession.count({ where: { memberEmail: email, communityId } })) === 0
  ) {
    const product = await prisma.grabGoProduct.findFirst({
      where: { machineId: machine.id },
    });
    await prisma.grabGoSession.create({
      data: {
        machineId: machine.id,
        communityId,
        memberEmail: email,
        memberName: club.memberName,
        unlockMethod: "app_qr",
        status: "closed",
        total: product?.price ?? 4.5,
        closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        itemsJson: product
          ? JSON.stringify([
              {
                sku: product.sku,
                name: product.name,
                qty: 1,
                price: product.price,
                confidence: 0.98,
              },
            ])
          : "[]",
      },
    });
  }

  if ((await prisma.checkin.count({ where: { communityId } })) === 0) {
    await prisma.checkin.createMany({
      data: [
        {
          communityId,
          name: "Alex Rivera",
          type: "guest",
          host: club.memberName,
          unit: "Host residence",
          status: "expected",
        },
        {
          communityId,
          name: "Pool Service Crew",
          type: "vendor",
          host: "Community Office",
          unit: "Common",
          status: "checked_in",
        },
        {
          communityId,
          name: "FedEx Delivery",
          type: "vendor",
          host: "Front Desk",
          unit: "Lobby",
          status: "expected",
        },
      ],
    });
  }

  // PM Invoices — community-scoped so four /go clubs are never blank after other tenants seed globally.
  if ((await prisma.invoice.count({ where: { communityId } })) === 0) {
    const submittedBy = isHoa ? "Community Office" : "Club Management";
    await prisma.invoice.createMany({
      data: [
        {
          communityId,
          vendor: isHoa ? "Greenscape Lawn Care" : "CourseCare Turf Management",
          description: isHoa
            ? "Monthly common-area landscaping"
            : "Championship Course weekly maintenance",
          amount: isHoa ? 2800 : 4200,
          submittedBy,
          status: "pending",
        },
        {
          communityId,
          vendor: "BlueWave Pool Service",
          description: isHoa
            ? "Association pool chemicals & service"
            : "Club pool chemicals & service",
          amount: 1450,
          submittedBy,
          status: "approved",
        },
      ],
    });
  }

  // PM Registrations checklist — community-scoped (same global-count trap as invoices).
  if ((await prisma.registrationChecklist.count({ where: { communityId } })) === 0) {
    await prisma.registrationChecklist.createMany({
      data: [
        {
          communityId,
          resident: club.memberName,
          unit: isHoa ? "9100" : "Club residence",
          vehicle: true,
          pet: true,
          fingerprint: false,
        },
        {
          communityId,
          resident: "Alex Rivera",
          unit: isHoa ? "9102" : "Guest cottage",
          vehicle: true,
          pet: false,
          fingerprint: true,
        },
        {
          communityId,
          resident: "Sam Patel",
          unit: isHoa ? "9104" : "Member villa",
          vehicle: false,
          pet: true,
          fingerprint: false,
        },
      ],
    });
  }

  // PM Maintenance tasks — community-scoped (global count trap in ensureRecordsSeeded).
  if ((await prisma.maintenanceTask.count({ where: { communityId } })) === 0) {
    const dueSoon = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const dueLater = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const dueDone = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await prisma.maintenanceTask.createMany({
      data: [
        {
          communityId,
          title: isHoa ? "Replace clubhouse lobby lights" : "Replace clubhouse lobby lights",
          area: "Lobby",
          assignedTo: "J. Alvarez",
          status: "in_progress",
          due: dueSoon,
        },
        {
          communityId,
          title: "Pool pump inspection",
          area: "Pool",
          assignedTo: "BlueWave",
          status: "open",
          due: dueLater,
        },
        {
          communityId,
          title: isHoa ? "Gate motor lubrication" : "Pro shop door hardware check",
          area: isHoa ? "Entrance" : "Pro Shop",
          assignedTo: "J. Alvarez",
          status: "done",
          due: dueDone,
        },
        {
          communityId,
          title: isHoa
            ? `Resident request: faucet leak · ${club.memberName}`
            : `Member request: faucet leak · ${club.memberName}`,
          area: isHoa ? "Unit 9100" : "Member residence",
          assignedTo: "Unassigned",
          status: "open",
          due: dueSoon,
        },
      ],
    });
  }

  // PM / Board private message boards — community-scoped (global count trap in ensureRecordsSeeded).
  if ((await prisma.privateMessage.count({ where: { communityId } })) === 0) {
    const office = isHoa ? "Community Office" : "Club Management";
    await prisma.privateMessage.createMany({
      data: [
        {
          communityId,
          channel: "board",
          author: "Board Chair",
          body: isHoa
            ? "Please review the landscaping bid before Friday's meeting."
            : "Please review the course maintenance bid before Friday's meeting.",
        },
        {
          communityId,
          channel: "board",
          author: "Treasurer",
          body: isHoa
            ? "Reserve fund allocation survey closes next week."
            : "Capital reserve survey for clubhouse renovations closes next week.",
        },
        {
          communityId,
          channel: "pm",
          author: office,
          body: isHoa
            ? "Vendor invoices for this month are uploaded for board review."
            : "Vendor invoices for June are uploaded for board review.",
        },
        {
          communityId,
          channel: "pm",
          author: "Board Chair",
          body: "Thanks — we'll review at the next board session.",
        },
      ],
    });
  }
}
