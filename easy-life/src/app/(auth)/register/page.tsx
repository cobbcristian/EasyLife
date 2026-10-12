import { Suspense } from "react";
import { headers } from "next/headers";
import { OceansideRegisterForm } from "@/components/auth/oceanside-register-form";
import { resolveDemoTenantFromCookieHeader } from "@/lib/tenant";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const headerStore = await headers();
  const tenant = resolveDemoTenantFromCookieHeader(
    headerStore.get("host"),
    headerStore.get("cookie"),
  );

  if (tenant?.communityId === "oceanside-residents") {
    return (
      <OceansideRegisterForm
        branding={{
          productName: tenant.productName,
          communityName: tenant.communityName,
          logoSrc: tenant.logoSrc,
          communityId: tenant.communityId,
        }}
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
