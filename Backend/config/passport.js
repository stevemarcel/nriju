import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import {
  downloadBufferFromUrl,
  uploadAvatarToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUtils.js";

// Google users authenticate via OAuth, not a password. A random value keeps
// the required password field satisfied without exposing a usable credential;
// anyone trying email/password login on a Google account gets a normal
// "Invalid email or password" rather than a model validation error.
const randomPassword = () => crypto.randomBytes(32).toString("hex");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.CLIENT_URL?.replace(/\/$/, "")}/api/v1/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Case 1: user already linked to this Google account
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        }

        // Case 2: user registered via email/password — link their Google account
        user = await User.findOne({ email });
        if (user && !user.googleId) {
          user.googleId = profile.id;
          // Migrate any Google-sourced avatar into Cloudinary so cropping works.
          if (profile.photos[0]?.value) {
            let prevPublicId = user.avatarPublicId;
            try {
              const { buffer } = await downloadBufferFromUrl(profile.photos[0].value);
              const uploaded = await uploadAvatarToCloudinary(buffer);
              user.avatar = uploaded.url;
              user.avatarPublicId = uploaded.publicId;
              // Clean up any pre-existing Cloudinary asset.
              if (prevPublicId) await deleteFromCloudinary(prevPublicId);
            } catch (uploadError) {
              console.warn("Could not migrate Google avatar to Cloudinary:", uploadError.message);
            }
          }
          await user.save();
          return done(null, user);
        }

        // Case 3: brand-new Google signup
        // Download and upload the Google photo server-side so it lands in
        // Cloudinary with a proper publicId — required for the crop editor.
        let avatarPublicId = "";
        let avatarUrl = "";
        if (profile.photos[0]?.value) {
          try {
            const { buffer } = await downloadBufferFromUrl(profile.photos[0].value);
            const uploaded = await uploadAvatarToCloudinary(buffer);
            avatarUrl = uploaded.url;
            avatarPublicId = uploaded.publicId;
          } catch (uploadError) {
            console.warn(
              "Could not upload Google avatar to Cloudinary, falling back to Google URL:",
              uploadError.message,
            );
            avatarUrl = profile.photos[0].value;
          }
        }

        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email,
          avatar: avatarUrl,
          avatarPublicId,
          isVerified: true,
          password: randomPassword(),
        });

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-password");
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
