const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
require("dotenv").config(); // Load environment variables from .env file

let mdb = null;

// Function to initialize the SQLite database
const initializeDB = async () => {
  try {
    // Use path.resolve to ensure the correct path to the database file
    mdb = await open({
      filename: path.resolve(__dirname, "../youtubetimer.db"),
      driver: sqlite3.Database,
    });
  } catch (error) {
    process.exit(1); // Exit the process if the database connection fails
  }
};

initializeDB(); // Call the function to initialize the database

// Configure Passport to use the Google OAuth 2.0 strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.clientID, // Google client ID from environment variables
      clientSecret: process.env.clientSecret, // Google client secret from environment variables
      callbackURL: process.env.callbackURL, // Google OAuth callback URL from environment variables
      scope: [
        "profile", // Request access to the user's profile information
        "email", // Request access to the user's email address
        "https://www.googleapis.com/auth/youtube.upload", // Request access to upload YouTube videos
      ],
      accessType: "offline", // Request offline access to get a refresh token
      prompt: "consent select_account", // Prompt user to select an account and give consent
    },
    // Callback function to handle the OAuth response
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const email = profile.emails[0].value; // Extract the user's email from the profile
        const userImage = profile.photos[0].value; // Extract the user's profile image URL
        const userDisplayName = profile.displayName; // Extract the user's display name

        const userCheckQuery = `SELECT * FROM users WHERE email=?;`;
        const userResponse = await mdb.get(userCheckQuery, email); // Check if the user already exists in the database

        if (!userResponse) {
          // If the user does not exist, create a new user
          const maxIdQuery = `SELECT max(id) as maximum_id FROM users;`;
          const maxIdResponse = await mdb.get(maxIdQuery); // Get the maximum user ID to create a unique username
          const userName = `${profile.name.givenName}${
            (maxIdResponse.maximum_id || 0) + 1
          }`;
          const userInvitationCode = userName; // Use the username as the invitation code

          const addUserQuery = `INSERT INTO users (username, email, invitation_code, refresh_token, user_image, user_display_name) VALUES (?, ?, ?, ?, ?, ?)`;
          await mdb.run(addUserQuery, [
            userName,
            email,
            userInvitationCode,
            refreshToken,
            userImage,
            userDisplayName,
          ]); // Insert the new user into the database
        } else {
          // If the user exists, update their refresh token
          const updateRefreshTokenQuery = `UPDATE users SET refresh_token = ? WHERE email = ?`;
          await mdb.run(updateRefreshTokenQuery, [refreshToken, email]);
        }

        const user = { email }; // Create a user object containing the user's email
        const token = jwt.sign(user, process.env.JWT_SECRET, {
          expiresIn: "30d", // Generate a JWT token with a 30-day expiration
        });
        return cb(null, { token }); // Return the JWT token to be used by the client
      } catch (err) {
        cb(err, null); // Handle any errors that occur during the process
      }
    }
  )
);

module.exports = passport; // Export the configured Passport instance
