/**
 * Member self-service profile fields. Unit / residency / paysHoa / tier are
 * billing identity and must only change via staff seed/import — never here.
 * Accepting client `unit` let HOA residents underbill by switching to a cheaper
 * unit before checkout (resolveHoaPaymentForMember rewrites open charges).
 */
export type MemberSelfServiceProfileInput = {
  phone?: string;
  unit?: string;
  joined?: string;
  directoryVisible?: boolean;
  commsEmail?: boolean;
  commsSms?: boolean;
  commsPush?: boolean;
  householdRole?: string;
  residencyStatus?: string;
  paysHoa?: boolean;
  membershipTier?: string;
  name?: string;
  email?: string;
  community?: string;
};

export function memberSelfServiceProfilePatch(patch: MemberSelfServiceProfileInput): {
  phone?: string;
  joined?: string;
  directoryVisible?: boolean;
  commsEmail?: boolean;
  commsSms?: boolean;
  commsPush?: boolean;
} {
  return {
    phone: patch.phone,
    joined: patch.joined,
    directoryVisible: patch.directoryVisible,
    commsEmail: patch.commsEmail,
    commsSms: patch.commsSms,
    commsPush: patch.commsPush,
  };
}
