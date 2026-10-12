"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { translateFaqs, translateList, translateNestedOptions, translateRecord } from "@/lib/mock-translate";
import {
  amenities,
  announcements,
  blogPosts,
  directory,
  dues,
  faqs,
  favorites,
  gallery,
  groupMessages,
  groups,
  listings,
  memberBookings,
  memberEvents,
  memberDocuments,
  memberProfile,
  memberRequests,
  menuItems,
  newsletters,
  properties,
  realEstate,
  rentalItems,
  restaurants,
  rewards,
  tournaments,
} from "@/lib/member-data";
import {
  bids,
  boardMessages,
  boardProfile,
  boardSchedule,
  budgetLines,
  invoices,
  surveys,
} from "@/lib/board-data";
import {
  checkins,
  maintenanceTasks,
  pmDocuments,
  pmProfile,
  registrations,
} from "@/lib/pm-data";
import {
  providerBookings,
  providerCalendar,
  providerMessages,
  providerProfile,
  providerPromos,
  providerPayout,
  providerServices,
} from "@/lib/provider-data";
import { adminNotifications } from "@/lib/admin-data";

export function useMemberMock() {
  const { t } = useI18n();
  return useMemo(
    () => ({
      profile: memberProfile,
      amenities: translateList(t, amenities, ["name", "description", "schedule"]),
      bookings: translateList(t, memberBookings, ["amenity"]),
      events: translateList(t, memberEvents, ["title", "description", "location"]),
      documents: translateList(t, memberDocuments, ["title"]),
      dues: translateList(t, dues, ["description"]),
      requests: translateList(t, memberRequests, ["title", "category", "description"]),
      directory: translateList(t, directory, ["role"]),
      gallery: translateList(t, gallery, ["title", "category"]),
      announcements: translateList(t, announcements, ["title", "body", "from"]),
      groups: translateList(t, groups, ["name", "description"]),
      groupMessages: translateList(t, groupMessages, ["body"]),
      listings: translateList(t, listings, ["title", "category"]),
      blogPosts: translateList(t, blogPosts, ["title", "excerpt", "author", "category"]),
      newsletters: translateList(t, newsletters, ["title", "summary"]),
      favorites: translateList(t, favorites, ["label"]),
      properties: translateList(t, properties, ["address", "type"]),
      restaurants: translateList(t, restaurants, ["name", "cuisine", "hours"]),
      menuItems: translateList(t, menuItems, ["name"]),
      tournaments: translateList(t, tournaments, ["title", "sport"]),
      rewards: {
        ...rewards,
        tier: t(rewards.tier),
        nextTier: t(rewards.nextTier),
        history: translateList(t, rewards.history, ["label"]),
        perks: translateList(t, rewards.perks, ["label"]),
      },
      rentalItems: translateList(t, rentalItems, ["name", "category"]),
      realEstate: translateList(t, realEstate, ["title"]),
      faqs: translateFaqs(t, faqs),
      t,
    }),
    [t],
  );
}

export function useBoardMock() {
  const { t } = useI18n();
  return useMemo(
    () => ({
      profile: { ...boardProfile, role: t(boardProfile.role) },
      schedule: translateList(t, boardSchedule, ["title", "location"]),
      surveys: surveys.map((s) => ({
        ...translateRecord(t, s, ["title", "description"]),
        options: translateNestedOptions(t, s.options),
      })),
      bids: translateList(t, bids, ["project", "vendor"]),
      budgetLines: translateList(t, budgetLines, ["category"]),
      invoices: translateList(t, invoices, ["vendor", "description"]),
      messages: translateList(t, boardMessages, ["body"]),
      t,
    }),
    [t],
  );
}

export function usePmMock() {
  const { t } = useI18n();
  return useMemo(
    () => ({
      profile: { ...pmProfile, role: t(pmProfile.role) },
      checkins: translateList(t, checkins, ["name", "host", "unit"]),
      registrations,
      maintenanceTasks: translateList(t, maintenanceTasks, ["title", "area", "assignedTo"]),
      documents: translateList(t, pmDocuments, ["title"]),
      t,
    }),
    [t],
  );
}

export function useProviderMock() {
  const { t } = useI18n();
  return useMemo(
    () => ({
      profile: { ...providerProfile, category: t(providerProfile.category) },
      bookings: translateList(t, providerBookings, ["service", "community"]),
      messages: translateList(t, providerMessages, ["preview", "community"]),
      services: translateList(t, providerServices, ["name"]),
      promos: translateList(t, providerPromos, ["title", "detail"]),
      calendar: translateList(t, providerCalendar, ["title"]),
      payout: {
        ...providerPayout,
        feeSchedule: translateList(t, providerPayout.feeSchedule, ["service"]),
      },
      t,
    }),
    [t],
  );
}

export function useAdminMock() {
  const { t } = useI18n();
  return useMemo(
    () => ({
      notifications: translateList(t, adminNotifications, ["title", "detail"]),
      t,
    }),
    [t],
  );
}
