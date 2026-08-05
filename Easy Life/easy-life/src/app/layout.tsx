import type { Metadata } from "next";
import { headers } from "next/headers";
import { Poppins, Roboto } from "next/font/google";
import "./globals.css";
import { AccessiBe } from "@/components/accessibility/accessibe";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/lib/i18n";
import { BrandFavicon } from "@/components/brand/brand-favicon";
import {
  resolveDemoTenantFromCookieHeader,
  tenantFaviconSrc,
} from "@/lib/tenant";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const path = (headerStore.get("x-pathname") ?? "").split("?")[0] ?? "";
  // Sales directory lists every club — never inherit a locked /go/[tenant] cookie title.
  if (path === "/go") {
    return {
      title: {
        absolute: "Easy Life | Sales demos",
      },
      description:
        "Easy Life sales directory — open a club demo and copy logins.",
      icons: {
        icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
        apple: [{ url: "/icon-192.png" }],
      },
      manifest: "/manifest.json",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Easy Life",
      },
    };
  }
  const tenant = resolveDemoTenantFromCookieHeader(
    headerStore.get("host"),
    headerStore.get("cookie"),
  );
  if (tenant) {
    const favicon = tenantFaviconSrc(tenant);
    return {
      title: {
        default: `${tenant.productName} | ${tenant.communityName}`,
        template: `%s | ${tenant.productName}`,
      },
      description: `${tenant.productName} — private club membership for ${tenant.communityName}.`,
      icons: {
        icon: [
          {
            url: `${favicon}?v=plaza-tab-3`,
            type: favicon.endsWith(".svg") ? "image/svg+xml" : "image/png",
          },
        ],
        apple: [{ url: `${tenant.logoSrc}?v=plaza-tab-3` }],
        shortcut: `${favicon}?v=plaza-tab-3`,
      },
      manifest: "/manifest.json",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: tenant.productName,
      },
    };
  }
  return {
    title: "Easy Life | Community Management",
    description:
      "Easy Life community management platform — manage communities, residents, services, and activity providers.",
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icon-192.png" }],
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Easy Life",
    },
  };
}

export const dynamic = "force-dynamic";

/** Prefer resizing layout when the soft keyboard opens (mobile WebView signup). */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  interactiveWidget: "resizes-content" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <BrandFavicon />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--mvp-blue)] focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <I18nProvider>
          <ToastProvider>
            <PwaRegister />
            {children}
          </ToastProvider>
        </I18nProvider>
        <AccessiBe />
      </body>
    </html>
  );
}
