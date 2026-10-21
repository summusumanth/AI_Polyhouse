/*
  Creates (or repairs) a super admin. There is no public sign-up, so this is
  how the first account comes into being.

    npm run bootstrap                     uses BOOTSTRAP_* from .env
    npm run create-super-admin -- --email you@example.com --name "You" --password "secret"

  Idempotent on purpose: running it again on an existing account does NOT
  change that person's password. Pass --reset-password to force one, which is
  the way back in if every super admin is locked out.

  The password is read from the environment or the command line, never
  hard-coded here, and is hashed with bcrypt before it is stored. It is not
  printed back out.
*/

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { connectDatabase } = require("../src/config/db");
const { migrate } = require("../src/config/migrate");
const { bootstrap } = require("../src/config/env");
const User = require("../src/models/User");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const flag = (name) => process.argv.includes(`--${name}`);

async function main() {
  const email = String(arg("email") || bootstrap.email || "").toLowerCase().trim();
  const name = arg("name") || bootstrap.name;
  const password = arg("password") || bootstrap.password;
  const resetPassword = flag("reset-password");

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error(
      'Set BOOTSTRAP_EMAIL in server/.env, or pass --email you@example.com --name "You" --password "secret"'
    );
  }
  if (password !== undefined && String(password).length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  await connectDatabase();
  await migrate();

  const existing = await User.findOne({ email });

  if (existing) {
    const was = existing.role;
    existing.role = "super_admin";
    existing.area = undefined;
    existing.access = [];
    if (resetPassword) {
      if (!password) throw new Error("--reset-password needs a password");
      existing.password = await bcrypt.hash(String(password), 10);
      // A password someone else set is temporary.
      existing.mustChangePassword = true;
    }
    await existing.save();
    console.log(
      `${existing.name} <${email}> is a super admin` +
        (was !== "super_admin" ? ` (was ${was})` : "") +
        (resetPassword ? ", password reset and must be changed at next sign-in" : ", password unchanged")
    );
  } else {
    if (!name || !password) {
      throw new Error("A new account needs a name and a password (--name, --password, or BOOTSTRAP_* in .env)");
    }
    await User.create({
      name,
      email,
      password: await bcrypt.hash(String(password), 10),
      role: "super_admin",
      mustChangePassword: true,
    });
    console.log(`Created super admin ${name} <${email}>.`);
    console.log("Sign in with the bootstrap password; the app will require a new one immediately.");
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
