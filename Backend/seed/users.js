// Seed users — NR-11
// Passwords are hashed by the User model's pre('save') hook.
export default [
  {
    name: "Nriju Super Admin",
    email: "just.stevemarcel@gmail.com",
    password: "",
    avatar:
      "https://res.cloudinary.com/dphlb0nsu/image/upload/c_fill,f_webp,h_200,q_auto,w_200/nriju/avatars/user-superadmin.webp",
    avatarPublicId: "nriju/avatars/nriju-super-admin",
    role: "superAdmin",
    isVerified: true,
    phone: "+2348012345678",
  },
  {
    name: "Store Manager",
    email: "npmruntesting@gmail.com",
    password: "",
    avatar:
      "https://res.cloudinary.com/dphlb0nsu/image/upload/c_fill,f_webp,h_200,q_auto,w_200/nriju/avatars/user-storemanager.webp",
    avatarPublicId: "nriju/avatars/store-manager",
    role: "admin",
    isVerified: true,
    phone: "+2348023456789",
  },
  {
    name: "New Horizon",
    email: "graphicsnewhorizon@gmail.com",
    password: "",
    avatar:
      "https://res.cloudinary.com/dphlb0nsu/image/upload/c_fill,f_webp,h_200,q_auto,w_200/nriju/avatars/user-newhorizon.webp",
    avatarPublicId: "nriju/avatars/new-horizon",
    role: "customer",
    isVerified: true,
    phone: "+2348034567890",
  },
  {
    name: "Steve Svile",
    email: "stevesvile@gmail.com",
    password: "",
    avatar:
      "https://res.cloudinary.com/dphlb0nsu/image/upload/c_fill,f_webp,h_200,q_auto,w_200/nriju/avatars/user-stevesvile.webp",
    avatarPublicId: "nriju/avatars/steve-svile",
    role: "customer",
    isVerified: true,
    phone: "+2348045678901",
  },
  {
    name: "Shark Colours",
    email: "just.shark.24.7@gmail.com",
    password: "",
    avatar:
      "https://res.cloudinary.com/dphlb0nsu/image/upload/c_fill,f_webp,h_200,q_auto,w_200/nriju/avatars/user-sharkcolours.webp",
    avatarPublicId: "nriju/avatars/shark-colours",
    role: "customer",
    isVerified: true,
    phone: "+2348056789012",
  },
];
