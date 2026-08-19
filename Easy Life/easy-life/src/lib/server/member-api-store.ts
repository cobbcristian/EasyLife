import { communityIsResidentialHoa } from "@/lib/community-features";
import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { ensureHuntersRidgeDemoSeeded } from "@/lib/server/hunters-ridge-seed";
import { ensureBonitaBayDemoSeeded } from "@/lib/server/bonita-bay-seed";
import { ensureShadowWoodDemoSeeded } from "@/lib/server/shadow-wood-seed";
import { ensureHeronCreekDemoSeeded } from "@/lib/server/heron-creek-seed";
import { ensureDebaryDemoSeeded } from "@/lib/server/debary-seed";
import { ensureJacarandaDemoSeeded } from "@/lib/server/jacaranda-seed";
import { ensureTheDunesDemoSeeded } from "@/lib/server/the-dunes-seed";
import { ensureTheNestDemoSeeded } from "@/lib/server/the-nest-seed";
import { ensureMartinDownsDemoSeeded } from "@/lib/server/martin-downs-seed";
import { ensureSeagateDemoSeeded } from "@/lib/server/seagate-seed";
import { ensureCopperleafDemoSeeded } from "@/lib/server/copperleaf-seed";
import { ensureClubRenaissanceDemoSeeded } from "@/lib/server/club-renaissance-seed";
import { ensureFallsClubDemoSeeded } from "@/lib/server/falls-club-seed";
import { ensureEsteroDemoSeeded } from "@/lib/server/estero-seed";
import { ensureWildcatRunDemoSeeded } from "@/lib/server/wildcat-run-seed";
import { ensureHighlandWoodsDemoSeeded } from "@/lib/server/highland-woods-seed";
import { ensureBonitaNationalDemoSeeded } from "@/lib/server/bonita-national-seed";
import { ensureCarrollwoodDemoSeeded } from "@/lib/server/carrollwood-seed";
import { ensureWindsorDemoSeeded } from "@/lib/server/windsor-seed";
import { ensureWorthingtonDemoSeeded } from "@/lib/server/worthington-seed";
import { ensureHeritageBayDemoSeeded } from "@/lib/server/heritage-bay-seed";
import { ensureIronLakeDemoSeeded } from "@/lib/server/iron-lake-seed";
import { ensureSpanishWellsDemoSeeded } from "@/lib/server/spanish-wells-seed";
import { ensureHarborPointeDemoSeeded } from "@/lib/server/harbor-pointe-seed";
import { ensureWillowCreekDemoSeeded } from "@/lib/server/willow-creek-seed";
import { ensureAlliantDemoSeeded } from "@/lib/server/alliant-seed";

export interface ProfileOverrides {
  name?: string;
  email?: string;
  phone?: string;
  unit?: string;
  joined?: string;
  directoryVisible?: boolean;
  community?: string;
  commsEmail?: boolean;
  commsSms?: boolean;
  commsPush?: boolean;
  householdRole?: string;
  residencyStatus?: string;
  paysHoa?: boolean;
  membershipTier?: string;
}

const DEFAULTS = {
  phone: "",
  unit: "",
  joined: "",
  community: "Your Club",
};

export async function getMemberProfile(email: string) {
  await ensureRecordsSeeded();
  const key = email.toLowerCase();
  const [ext, user] = await Promise.all([
    prisma.memberProfileExt.findUnique({ where: { userEmail: key } }),
    prisma.user.findUnique({ where: { email: key } }),
  ]);
  const community = user?.communityId
    ? await prisma.community.findUnique({
        where: { id: user.communityId },
        select: { name: true, appDisplayName: true },
      })
    : null;
  const communityId = user?.communityId ?? null;
  const residentialHoa = communityIsResidentialHoa(communityId);
  const residencyStatus = residentialHoa
    ? "resident"
    : ext?.residencyStatus === "resident"
      ? "resident"
      : "non_resident";
  const paysHoa = residentialHoa
    ? true
    : residencyStatus === "non_resident"
      ? false
      : ext?.paysHoa !== false;
  const communityName =
    community?.name ??
    community?.appDisplayName ??
    DEFAULTS.community;
  const displayName =
    user?.name?.trim() ||
    email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const joined =
    (ext?.joined?.trim() || null) ??
    (user?.createdAt ? user.createdAt.toISOString().slice(0, 10) : "") ??
    DEFAULTS.joined;
  return {
    name: displayName,
    email,
    phone: ext?.phone ?? DEFAULTS.phone,
    unit: ext?.unit ?? DEFAULTS.unit,
    joined,
    directoryVisible: ext?.directoryVisible ?? true,
    community: communityName,
    communityId,
    commsEmail: ext?.commsEmail ?? true,
    commsSms: ext?.commsSms ?? true,
    commsPush: ext?.commsPush ?? false,
    householdRole: ext?.householdRole ?? "owner",
    membershipTier: residentialHoa ? "hoa" : (ext?.membershipTier ?? "social"),
    residencyStatus,
    paysHoa,
  };
}

export async function updateMemberProfile(email: string, patch: ProfileOverrides) {
  await ensureRecordsSeeded();
  const key = email.toLowerCase();
  await prisma.memberProfileExt.upsert({
    where: { userEmail: key },
    create: {
      userEmail: key,
      phone: patch.phone,
      unit: patch.unit,
      joined: patch.joined,
      directoryVisible: patch.directoryVisible ?? true,
      commsEmail: patch.commsEmail ?? true,
      commsSms: patch.commsSms ?? true,
      commsPush: patch.commsPush ?? false,
      householdRole: patch.householdRole ?? "owner",
    },
    update: {
      phone: patch.phone,
      unit: patch.unit,
      joined: patch.joined,
      directoryVisible: patch.directoryVisible,
      commsEmail: patch.commsEmail,
      commsSms: patch.commsSms,
      commsPush: patch.commsPush,
      householdRole: patch.householdRole,
    },
  });
  return getMemberProfile(email);
}

export async function listNewsletters(communityId?: string | null) {
  await ensureRecordsSeeded();
  return prisma.newsletter.findMany({
    where: communityId ? { communityId } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function listRealEstate(communityId?: string | null) {
  await ensureRecordsSeeded();
  return prisma.realEstateListing.findMany({
    where: communityId ? { communityId } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function addRealEstateListing(input: {
  communityId?: string | null;
  memberEmail?: string;
  title: string;
  description?: string;
  type: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  unit: string;
  color?: string;
  images?: string[];
}) {
  return prisma.realEstateListing.create({
    data: {
      communityId: input.communityId?.trim() || "__missing_community__",
      memberEmail: input.memberEmail,
      title: input.title,
      description: input.description ?? "",
      type: input.type,
      price: input.price,
      beds: input.beds,
      baths: input.baths,
      sqft: input.sqft,
      unit: input.unit,
      color: input.color ?? "from-brand-400 to-brand-600",
      imagesJson: JSON.stringify(input.images ?? []),
    },
  });
}

export async function listProperties(email: string) {
  await ensureRecordsSeeded();
  return prisma.memberProperty.findMany({
    where: { userEmail: email.toLowerCase() },
    orderBy: { address: "asc" },
  });
}

export async function addProperty(
  email: string,
  input: { address: string; type: string; owner?: boolean },
) {
  return prisma.memberProperty.create({
    data: {
      userEmail: email.toLowerCase(),
      address: input.address,
      type: input.type,
      owner: input.owner ?? true,
    },
  });
}

export async function listFavorites(email: string) {
  await ensureRecordsSeeded();
  const key = email.toLowerCase();
  let favorites = await prisma.memberFavorite.findMany({
    where: { userEmail: key },
    orderBy: { label: "asc" },
  });
  if (favorites.length === 0) {
    try {
      if (key.endsWith("@huntersridge-ca.com") || key.endsWith("@huntersridge.net")) {
        await ensureHuntersRidgeDemoSeeded();
      } else if (key.endsWith("@bonitabayclub.net")) {
        await ensureBonitaBayDemoSeeded();
      } else if (key.endsWith("@shadowwoodcc.com")) {
        await ensureShadowWoodDemoSeeded();
      } else if (key.endsWith("@heroncreekgcc.com")) {
        await ensureHeronCreekDemoSeeded();
      } else if (key.endsWith("@debarycc.com")) {
        await ensureDebaryDemoSeeded();
      } else if (key.endsWith("@jacarandagolfclub.com")) {
        await ensureJacarandaDemoSeeded();
      } else if (key.endsWith("@sanibeldunesresort.com")) {
        await ensureTheDunesDemoSeeded();
      } else if (key.endsWith("@nestgolf.com")) {
        await ensureTheNestDemoSeeded();
      } else if (key.endsWith("@martindownsgolfclub.com")) {
        await ensureMartinDownsDemoSeeded();
      } else if (key.endsWith("@seagatedelray.com")) {
        await ensureSeagateDemoSeeded();
      } else if (key.endsWith("@copperleafgolf.com")) {
        await ensureCopperleafDemoSeeded();
      } else if (key.endsWith("@clubrenaissance.com")) {
        await ensureClubRenaissanceDemoSeeded();
      } else if (key.endsWith("@thefallsclub.com")) {
        await ensureFallsClubDemoSeeded();
      } else if (key.endsWith("@esterocc.com")) {
        await ensureEsteroDemoSeeded();
      } else if (key.endsWith("@wildcatruncc.com")) {
        await ensureWildcatRunDemoSeeded();
      } else if (key.endsWith("@hwgcc.com")) {
        await ensureHighlandWoodsDemoSeeded();
      } else if (key.endsWith("@worthingtoncc.com")) {
        await ensureWorthingtonDemoSeeded();
      } else if (key.endsWith("@golfheritagebay.com")) {
        await ensureHeritageBayDemoSeeded();
      } else if (
        key.endsWith("@theclubatironlake.com") ||
        key.endsWith("@ironcrest.com")
      ) {
        await ensureIronLakeDemoSeeded();
      } else if (key.endsWith("@spanishwellscountryclub.com")) {
        await ensureSpanishWellsDemoSeeded();
      } else if (key.endsWith("@harborpointehoa.com")) {
        await ensureHarborPointeDemoSeeded();
      } else if (key.endsWith("@willowcreekhoa.com")) {
        await ensureWillowCreekDemoSeeded();
      } else if (key.endsWith("@alliantproperty.com")) {
        await ensureAlliantDemoSeeded();
      }
    } catch (err) {
      console.error("[listFavorites] demo favorites seed failed", err);
    }
    favorites = await prisma.memberFavorite.findMany({
      where: { userEmail: key },
      orderBy: { label: "asc" },
    });
  }
  return favorites;
}

export async function addFavorite(email: string, input: { label: string; href: string }) {
  return prisma.memberFavorite.create({
    data: { userEmail: email.toLowerCase(), ...input },
  });
}

export async function removeFavorite(email: string, id: string) {
  const row = await prisma.memberFavorite.findFirst({
    where: { id, userEmail: email.toLowerCase() },
  });
  if (!row) return false;
  await prisma.memberFavorite.delete({ where: { id } });
  return true;
}

export async function listGroupsForMember(email: string, communityId?: string | null) {
  await ensureRecordsSeeded();
  const cid = communityId?.trim() || "__missing_community__";
  let groups = await prisma.communityGroup.findMany({ where: { communityId: cid } });
  if (groups.length === 0) {
    try {
      if (cid === "hunters-ridge") {
        await ensureHuntersRidgeDemoSeeded();
      } else if (cid === "bonita-bay") {
        await ensureBonitaBayDemoSeeded();
      } else if (cid === "shadow-wood") {
        await ensureShadowWoodDemoSeeded();
      } else if (cid === "heron-creek") {
        await ensureHeronCreekDemoSeeded();
      } else if (cid === "debary") {
        await ensureDebaryDemoSeeded();
      } else if (cid === "jacaranda") {
        await ensureJacarandaDemoSeeded();
      } else if (cid === "the-dunes") {
        await ensureTheDunesDemoSeeded();
      } else if (cid === "the-nest") {
        await ensureTheNestDemoSeeded();
      } else if (cid === "martin-downs") {
        await ensureMartinDownsDemoSeeded();
      } else if (cid === "seagate") {
        await ensureSeagateDemoSeeded();
      } else if (cid === "copperleaf") {
        await ensureCopperleafDemoSeeded();
      } else if (cid === "club-renaissance") {
        await ensureClubRenaissanceDemoSeeded();
      } else if (cid === "falls-club") {
        await ensureFallsClubDemoSeeded();
      } else if (cid === "estero") {
        await ensureEsteroDemoSeeded();
      } else if (cid === "wildcat-run") {
        await ensureWildcatRunDemoSeeded();
      } else if (cid === "highland-woods") {
        await ensureHighlandWoodsDemoSeeded();
      } else if (cid === "bonita-national") {
        await ensureBonitaNationalDemoSeeded();
      } else if (cid === "carrollwood") {
        await ensureCarrollwoodDemoSeeded();
      } else if (cid === "windsor") {
        await ensureWindsorDemoSeeded();
      } else if (cid === "worthington") {
        await ensureWorthingtonDemoSeeded();
      } else if (cid === "heritage-bay") {
        await ensureHeritageBayDemoSeeded();
      } else if (cid === "iron-lake") {
        await ensureIronLakeDemoSeeded();
      } else if (cid === "spanish-wells") {
        await ensureSpanishWellsDemoSeeded();
      } else if (cid === "harbor-pointe") {
        await ensureHarborPointeDemoSeeded();
      } else if (cid === "willow-creek") {
        await ensureWillowCreekDemoSeeded();
      } else if (cid === "alliant") {
        await ensureAlliantDemoSeeded();
      }
    } catch (err) {
      console.error("[listGroupsForMember] demo groups seed failed", err);
    }
    groups = await prisma.communityGroup.findMany({ where: { communityId: cid } });
  }
  const memberships = await prisma.groupMembership.findMany({
    where: { userEmail: email.toLowerCase() },
  });
  const joinedIds = new Set(memberships.map((m) => m.groupId));
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    members: g.members,
    color: g.color,
    joined: joinedIds.has(g.id),
  }));
}

export async function toggleGroupMembership(
  email: string,
  groupId: string,
  communityId?: string | null,
) {
  const key = email.toLowerCase();
  const group = await prisma.communityGroup.findUnique({ where: { id: groupId } });
  if (!group) return null;
  if (communityId && group.communityId !== communityId.trim()) {
    return null;
  }
  const existing = await prisma.groupMembership.findFirst({
    where: { groupId, userEmail: key },
  });
  if (existing) {
    await prisma.groupMembership.delete({ where: { id: existing.id } });
    await prisma.communityGroup.update({
      where: { id: groupId },
      data: { members: Math.max(0, group.members - 1) },
    });
  } else {
    await prisma.groupMembership.create({ data: { groupId, userEmail: key } });
    await prisma.communityGroup.update({
      where: { id: groupId },
      data: { members: group.members + 1 },
    });
  }
  const refreshed = await prisma.communityGroup.findUnique({ where: { id: groupId } });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    members: refreshed?.members ?? group.members,
    color: group.color,
    joined: !existing,
  };
}

export async function createCommunityGroup(input: {
  communityId?: string | null;
  name: string;
  description?: string;
  ownerEmail: string;
}) {
  const group = await prisma.communityGroup.create({
    data: {
      communityId: input.communityId?.trim() || "__missing_community__",
      name: input.name,
      description: input.description ?? "",
      members: 1,
    },
  });
  await prisma.groupMembership.create({
    data: { groupId: group.id, userEmail: input.ownerEmail.toLowerCase() },
  });
  return group;
}

export async function inviteToGroup(groupId: string, inviteEmail: string) {
  await prisma.groupMembership.upsert({
    where: { groupId_userEmail: { groupId, userEmail: inviteEmail.toLowerCase() } },
    create: { groupId, userEmail: inviteEmail.toLowerCase() },
    update: {},
  });
  return { ok: true };
}

export async function listBlogComments(blogId: string) {
  return prisma.blogComment.findMany({
    where: { postId: blogId },
    orderBy: { createdAt: "asc" },
  });
}

export async function addBlogComment(input: { blogId: string; author: string; body: string }) {
  return prisma.blogComment.create({
    data: { postId: input.blogId, author: input.author, body: input.body },
  });
}
