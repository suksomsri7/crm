export interface BrandAccess {
  id: string;
  name: string;
  logoUrl: string | null;
  roleId: string;
  roleName: string;
  permissions: string[];
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  isSuperAdmin: boolean;
  brands: BrandAccess[];
  activeBrandId?: string;
}

export type ResourceAction =
  | "dashboard:read"
  | "customers:read"
  | "customers:write"
  | "customers:delete"
  | "customers:import"
  | "customers:export"
  | "leads:read"
  | "leads:write"
  | "leads:delete"
  | "leads:import"
  | "leads:export"
  | "deals:read"
  | "deals:write"
  | "deals:delete"
  | "campaigns:read"
  | "campaigns:write"
  | "campaigns:delete"
  | "campaigns:import"
  | "tickets:read"
  | "tickets:write"
  | "tickets:delete"
  | "reports:read"
  | "reports:export"
  | "sources:read"
  | "sources:write"
  | "sources:delete"
  | "roles:read"
  | "roles:write"
  | "roles:delete"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "brands:read"
  | "brands:write"
  | "brands:delete"
  | "settings:read"
  | "settings:write";

export const ALL_PERMISSIONS: ResourceAction[] = [
  "dashboard:read",
  "customers:read", "customers:write", "customers:delete", "customers:import", "customers:export",
  "leads:read", "leads:write", "leads:delete", "leads:import", "leads:export",
  "deals:read", "deals:write", "deals:delete",
  "campaigns:read", "campaigns:write", "campaigns:delete", "campaigns:import",
  "tickets:read", "tickets:write", "tickets:delete",
  "reports:read", "reports:export",
  "sources:read", "sources:write", "sources:delete",
  "roles:read", "roles:write", "roles:delete",
  "users:read", "users:write", "users:delete",
  "brands:read", "brands:write", "brands:delete",
  "settings:read", "settings:write",
];

export const PERMISSION_GROUPS: Record<string, { label: string; permissions: ResourceAction[] }> = {
  dashboard: {
    label: "Dashboard",
    permissions: ["dashboard:read"],
  },
  leads: {
    label: "Leads",
    permissions: ["leads:read", "leads:write", "leads:delete", "leads:import", "leads:export"],
  },
  customers: {
    label: "Customers",
    permissions: ["customers:read", "customers:write", "customers:delete", "customers:import", "customers:export"],
  },
  deals: {
    label: "Deals",
    permissions: ["deals:read", "deals:write", "deals:delete"],
  },
  campaigns: {
    label: "Campaigns",
    permissions: ["campaigns:read", "campaigns:write", "campaigns:delete", "campaigns:import"],
  },
  vouchers: {
    label: "Vouchers",
    permissions: ["tickets:read", "tickets:write", "tickets:delete"],
  },
  reports: {
    label: "Reports",
    permissions: ["reports:read", "reports:export"],
  },
  sources: {
    label: "Sources",
    permissions: ["sources:read", "sources:write", "sources:delete"],
  },
  roles: {
    label: "Roles",
    permissions: ["roles:read", "roles:write", "roles:delete"],
  },
  users: {
    label: "Users",
    permissions: ["users:read", "users:write", "users:delete"],
  },
  brands: {
    label: "Brands",
    permissions: ["brands:read", "brands:write", "brands:delete"],
  },
  settings: {
    label: "Settings",
    permissions: ["settings:read", "settings:write"],
  },
};
