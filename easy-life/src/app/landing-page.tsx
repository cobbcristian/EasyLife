"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    icon: "🏠",
    title: "Amenity Booking",
    description: "Courts, pools, clubhouse — residents book in seconds. No phone tag with the front desk.",
  },
  {
    icon: "📢",
    title: "Announcements",
    description: "Push updates to every resident instantly. No more paper notices or lost emails.",
  },
  {
    icon: "💬",
    title: "Resident Messaging",
    description: "Direct messages to staff and neighbors. GroupMe-style threads for committees.",
  },
  {
    icon: "💳",
    title: "HOA Payments",
    description: "Online dues, special assessments, and charges. Stripe-powered, instant receipts.",
  },
  {
    icon: "📦",
    title: "Package Tracking",
    description: "Front desk logs arrivals. Residents get notified. No more lost packages.",
  },
  {
    icon: "🚐",
    title: "Tram Requests",
    description: "Golf cart pickup requests from the app. Drivers get dispatched via SMS.",
  },
];

const SCREENSHOTS = [
  { src: "/sell/tour/01-member-home.png", alt: "Member home dashboard" },
  { src: "/sell/tour/02-amenities.png", alt: "Amenity booking" },
  { src: "/sell/tour/03-calendar.png", alt: "Community calendar" },
  { src: "/sell/tour/08-pm-home.png", alt: "Property manager dashboard" },
];

export function LandingPage() {
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    community: "",
    units: "",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("sending");
    try {
      const res = await fetch("/api/landing/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormState("sent");
        setFormData({ name: "", email: "", community: "", units: "", message: "" });
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/logo-icon.png" alt="Easy Life" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-semibold text-gray-900">Easy Life</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="#features" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:block">
              Features
            </Link>
            <Link href="#contact" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:block">
              Contact
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[var(--mvp-blue)] px-4 py-2 text-sm font-medium text-white hover:brightness-95"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--mvp-blue)]">
                For HOAs & Condos
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                The resident app your community deserves
              </h1>
              <p className="mt-6 text-lg text-gray-600 sm:text-xl">
                Amenity booking, announcements, payments, and messaging — all in one branded app for your HOA or condo association.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#contact"
                  className="inline-flex items-center rounded-full bg-[var(--mvp-blue)] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-95"
                >
                  Get Started Free
                </a>
                <Link
                  href="/sell"
                  className="inline-flex items-center rounded-full border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  See Demo
                </Link>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                Free for small communities. No credit card required.
              </p>
            </div>
            <div className="relative">
              <div className="relative mx-auto w-[280px] sm:w-[320px]">
                <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-2xl" />
                <div className="relative overflow-hidden rounded-[2rem] border-8 border-gray-900 bg-gray-900 shadow-2xl">
                  <Image
                    src="/sell/tour/01-member-home.png"
                    alt="Easy Life member dashboard"
                    width={304}
                    height={608}
                    className="w-full"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-gray-100 bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-medium text-gray-500">TRUSTED BY COMMUNITIES LIKE</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale">
            <span className="text-xl font-semibold text-gray-700">The Plaza at Oceanside</span>
            <span className="text-gray-300">|</span>
            <span className="text-lg text-gray-600">Coming: Golden Ocala</span>
            <span className="text-gray-300">|</span>
            <span className="text-lg text-gray-600">Your Community?</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--mvp-blue)]">Features</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything your residents need
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Replace paper notices, email threads, and phone tag with one modern app.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="bg-gray-900 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">See It In Action</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Built for residents, board, and staff
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Different dashboards for different roles — everyone gets exactly what they need.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SCREENSHOTS.map((shot) => (
              <div key={shot.src} className="group relative overflow-hidden rounded-2xl bg-gray-800">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={300}
                  height={600}
                  className="w-full transition group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-sm font-medium text-white">{shot.alt}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/sell/tour"
              className="inline-flex items-center text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              View full screenshot tour →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--mvp-blue)]">How It Works</p>
          <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            Live in weeks, not months
          </h2>
          <div className="mt-16 grid gap-8 text-left sm:grid-cols-3">
            {[
              { step: "01", title: "We Set You Up", desc: "We configure your community, branding, and amenities. Import your resident list." },
              { step: "02", title: "Invite Residents", desc: "Send invites by email or post a QR code. Self-enrollment with unit verification." },
              { step: "03", title: "Go Live", desc: "Residents book amenities, get announcements, and message staff — day one." },
            ].map((item) => (
              <div key={item.step}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mvp-blue)] text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="bg-gradient-to-b from-blue-50 to-white px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--mvp-blue)]">Get Started</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
              Free for small communities
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Tell us about your community and we'll get you set up — no commitment required.
            </p>
          </div>

          {formState === "sent" ? (
            <div className="mt-12 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                ✓
              </div>
              <h3 className="mt-4 text-lg font-semibold text-green-900">Thanks! We'll be in touch.</h3>
              <p className="mt-2 text-green-700">
                We'll email you within 24 hours to schedule a quick call.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-12 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-[var(--mvp-blue)] focus:ring-[var(--mvp-blue)]"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-[var(--mvp-blue)] focus:ring-[var(--mvp-blue)]"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="community" className="block text-sm font-medium text-gray-700">
                    Community Name
                  </label>
                  <input
                    type="text"
                    id="community"
                    required
                    value={formData.community}
                    onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-[var(--mvp-blue)] focus:ring-[var(--mvp-blue)]"
                    placeholder="Sunrise Condos"
                  />
                </div>
                <div>
                  <label htmlFor="units" className="block text-sm font-medium text-gray-700">
                    Number of Units
                  </label>
                  <input
                    type="text"
                    id="units"
                    value={formData.units}
                    onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-[var(--mvp-blue)] focus:ring-[var(--mvp-blue)]"
                    placeholder="150"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Anything else? (optional)
                </label>
                <textarea
                  id="message"
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-[var(--mvp-blue)] focus:ring-[var(--mvp-blue)]"
                  placeholder="We're looking for a way to replace our paper sign-up sheets..."
                />
              </div>
              {formState === "error" && (
                <p className="text-sm text-red-600">Something went wrong. Please try again or email us directly.</p>
              )}
              <button
                type="submit"
                disabled={formState === "sending"}
                className="w-full rounded-lg bg-[var(--mvp-blue)] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-95 disabled:opacity-50"
              >
                {formState === "sending" ? "Sending..." : "Get Started Free"}
              </button>
              <p className="text-center text-sm text-gray-500">
                We'll respond within 24 hours. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/brand/logo-icon.png" alt="Easy Life" width={24} height={24} className="rounded-md" />
              <span className="text-sm font-semibold text-gray-900">Easy Life</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-900">Terms</Link>
              <Link href="/support" className="hover:text-gray-900">Support</Link>
            </div>
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Easy Life</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
