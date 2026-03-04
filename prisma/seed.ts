import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const PERMISSIONS = [
  { resource: "customers", action: "read" },
  { resource: "customers", action: "write" },
  { resource: "customers", action: "delete" },
  { resource: "leads", action: "read" },
  { resource: "leads", action: "write" },
  { resource: "leads", action: "delete" },
  { resource: "deals", action: "read" },
  { resource: "deals", action: "write" },
  { resource: "deals", action: "delete" },
  { resource: "campaigns", action: "read" },
  { resource: "campaigns", action: "write" },
  { resource: "campaigns", action: "delete" },
  { resource: "tickets", action: "read" },
  { resource: "tickets", action: "write" },
  { resource: "tickets", action: "delete" },
  { resource: "reports", action: "read" },
  { resource: "reports", action: "export" },
  { resource: "users", action: "read" },
  { resource: "users", action: "write" },
  { resource: "users", action: "delete" },
  { resource: "brands", action: "read" },
  { resource: "brands", action: "write" },
  { resource: "brands", action: "delete" },
  { resource: "settings", action: "read" },
  { resource: "settings", action: "write" },
];

async function main() {
  console.log("Seeding permissions...");
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm,
    });
  }
  console.log(`Created ${PERMISSIONS.length} permissions`);

  console.log("Creating Super Admin user...");
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@crm.com" },
    update: {},
    create: {
      email: "admin@crm.com",
      password: hashedPassword,
      fullName: "Super Admin",
      isSuperAdmin: true,
    },
  });
  console.log(`Super Admin created: ${admin.email} (password: admin123)`);

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
