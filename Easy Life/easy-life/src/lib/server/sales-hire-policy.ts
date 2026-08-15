/**
 * Hire/create must never flip an existing member/admin/provider account to
 * `sales` — that demotes club staff and ignores the supplied password.
 */
export function existingAccountBlocksSalesHire(opts: {
  userExists: boolean;
  alreadySalesperson: boolean;
}): string | null {
  if (!opts.userExists) return null;
  if (opts.alreadySalesperson) return "This user is already a salesperson";
  return "An account with this email already exists";
}
