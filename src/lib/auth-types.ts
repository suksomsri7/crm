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
  | "customers:read"
  | "customers:write"
  | "customers:delete"
  | "leads:read"
  | "leads:write"
  | "leads:delete"
  | "deals:read"
  | "deals:write"
  | "deals:delete"
  | "campaigns:read"
  | "campaigns:write"
  | "campaigns:delete"
  | "tickets:read"
  | "tickets:write"
  | "tickets:delete"
  | "reports:read"
  | "reports:export"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "brands:read"
  | "brands:write"
  | "brands:delete"
  | "settings:read"
  | "settings:write";

export const ALL_PERMISSIONS: ResourceAction[] = [
  "customers:read", "customers:write", "customers:delete",
  "leads:read", "leads:write", "leads:delete",
  "deals:read", "deals:write", "deals:delete",
  "campaigns:read", "campaigns:write", "campaigns:delete",
  "tickets:read", "tickets:write", "tickets:delete",
  "reports:read", "reports:export",
  "users:read", "users:write", "users:delete",
  "brands:read", "brands:write", "brands:delete",
  "settings:read", "settings:write",
];

export const PERMISSION_GROUPS: Record<string, { label: string; permissions: ResourceAction[] }> = {
  customers: {
    label: "Customers",
    permissions: ["customers:read", "customers:write", "customers:delete"],
  },
  leads: {
    label: "Leads",
    permissions: ["leads:read", "leads:write", "leads:delete"],
  },
  deals: {
    label: "Deals",
    permissions: ["deals:read", "deals:write", "deals:delete"],
  },
  campaigns: {
    label: "Campaigns",
    permissions: ["campaigns:read", "campaigns:write", "campaigns:delete"],
  },
  tickets: {
    label: "Tickets",
    permissions: ["tickets:read", "tickets:write", "tickets:delete"],
  },
  reports: {
    label: "Reports",
    permissions: ["reports:read", "reports:export"],
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
