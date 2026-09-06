
import bcrypt from "bcrypt";
import prisma from "../shared/prisma";
import { env } from "../config/env.config";



export const initiateSuperAdmin = async () => {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (existingAdmin) {
    console.log("Admin already exists, skipping...");
    return;
  }

  const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL,
      role: "ADMIN",
    },
  });

  await prisma.userAuth.create({
    data: {
      userId: user.id,
      password: hashedPassword,
    },
  });

  console.log("Admin seeded successfully");
};