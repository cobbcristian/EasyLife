import { MemberMvpProfile } from "@/components/member/member-mvp-profile";
import { getSession } from "@/lib/server/auth";
import { listPets, listVehicles } from "@/lib/server/records";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage() {
  const session = await getSession();
  const vehicles = session ? await listVehicles(session.sub) : [];
  const pets = session ? await listPets(session.sub) : [];
  return (
    <MemberMvpProfile
      vehicles={vehicles.map((v) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        color: v.color,
        plate: v.plate,
        year: v.year,
        ownerName: v.ownerName,
        registrationUrl: v.registrationUrl,
        insuranceUrl: v.insuranceUrl,
        govIdUrl: v.govIdUrl,
        verificationStatus: v.verificationStatus,
        verificationJson: v.verificationJson,
        verifiedAt: v.verifiedAt?.toISOString() ?? null,
      }))}
      pets={pets.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        breed: p.breed,
      }))}
    />
  );
}
