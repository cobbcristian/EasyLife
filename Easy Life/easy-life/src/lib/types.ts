export type UserRole =
  | "member"
  | "board_member"
  | "property_manager"
  | "admin";

export type DirectoryVisibility = "public" | "members_only" | "private";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  role: UserRole;
  dateJoined: string;
  avatarUrl?: string;
  directoryVisible: boolean;
  vehicles: Vehicle[];
  pets: Pet[];
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  color: string;
  plate: string;
}

export interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: "community" | "board" | "social" | "maintenance";
  postedBy: string;
}

export interface Amenity {
  id: string;
  name: string;
  description: string;
  fee: number;
  schedule: string;
  imageUrl?: string;
}

export interface Booking {
  id: string;
  amenityId: string;
  amenityName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending" | "cancelled";
  memberName: string;
}

export interface Document {
  id: string;
  title: string;
  category: "legal" | "board" | "financial" | "policy" | "minutes";
  uploadedAt: string;
  uploadedBy: string;
  fileSize: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  uploadedAt: string;
}

export interface ServiceRequest {
  id: string;
  title: string;
  category: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  submittedAt: string;
  unit: string;
}

export interface PaymentRecord {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: "paid" | "due" | "overdue";
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: UserRole[];
}

export interface CommunityMember {
  id: string;
  name: string;
  role: string;
  isManagement: boolean;
  avatarUrl?: string;
}

export interface Provider {
  id: string;
  name: string;
  category: string;
  type: "service" | "activity";
  imageUrl?: string;
  rating?: number;
  status?: "active" | "frozen";
}

export interface Community {
  id: string;
  name: string;
  location: string;
  residentCount: number;
  serviceCount: number;
  activityCount: number;
  coverColor: string;
  inviteCode?: string;
  logoUrl?: string;
  primaryColor?: string;
  appDisplayName?: string;
  customDomain?: string;
  stagingMode?: boolean;
  management: CommunityMember[];
  residents: CommunityMember[];
  providers: Provider[];
}

export interface AnalyticsPoint {
  label: string;
  value: number;
}

/** Provider list uses pending/accepted; upcoming kept for older seeds. */
export type ServiceBookingStatus =
  | "pending"
  | "accepted"
  | "upcoming"
  | "completed"
  | "cancelled";

export interface ServiceBooking {
  id: string;
  resident: string;
  provider: string;
  service: string;
  date: string;
  /** Start time label, e.g. "10:00 AM". */
  time: string;
  /** Optional end time label for duration (e.g. "12:00 PM"). */
  endTime?: string;
  status: ServiceBookingStatus;
  amount: number;
  /** Party size for activity/court rows (host + accepted guests). */
  goingCount?: number;
}

export function isActiveServiceBooking(status: ServiceBookingStatus): boolean {
  return status === "pending" || status === "accepted" || status === "upcoming";
}

export type AuthRole = "admin" | "provider" | "member" | "board" | "pm";

export interface AuthUser {
  id: string;
  email: string;
  password: string;
  role: AuthRole;
  name: string;
  communityId?: string | null;
  status?: "active" | "frozen";
}

export interface SessionPayload {
  sub: string;
  email: string;
  role: AuthRole;
  name: string;
  communityId?: string | null;
}
