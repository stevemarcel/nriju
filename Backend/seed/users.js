// Seed users — NR-11
// Passwords are hashed by the User model's pre('save') hook.
export default [
  {
    name: "Nriju Super Admin",
    email: "just.stevemarcel@gmail.com",
    password: "", // Leave password empty for security reasons; set it manually in production.
    role: "superAdmin",
    isVerified: true,
    phone: "+2348012345678",
  },
  {
    name: "Store Manager",
    email: "npmruntesting@gmail.com",
    password: "", // Leave password empty for security reasons; set it manually in production.
    role: "admin",
    isVerified: true,
    phone: "+2348023456789",
  },
  {
    name: "New Horizon",
    email: "graphicsnewhorizon@gmail.com",
    password: "", // Leave password empty for security reasons; set it manually in production.
    role: "customer",
    isVerified: true,
    phone: "+2348034567890",
  },
  {
    name: "Steve Svile",
    email: "stevesvile@gmail.com",
    password: "", // Leave password empty for security reasons; set it manually in production.
    role: "customer",
    isVerified: true,
    phone: "+2348045678901",
  },
  {
    name: "Shark Colours",
    email: "just.shark.24.7@gmail.com",
    password: "", // Leave password empty for security reasons; set it manually in production.
    role: "customer",
    isVerified: true,
    phone: "+2348056789012",
  },
];
