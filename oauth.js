const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const passport = require("../oauth/passportConfig");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Load environment variables from .env file

// Route to check the authentication status of the user
router.get("/oauth/status", async (req, res) => {
  const token = req.cookies.token; // Retrieve the JWT token from the cookies

  if (!token) {
    return res.status(200).json({ authenticated: false }); // If no token is present, respond with not authenticated
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email } = decoded; // Extract the email from the decoded token
    const mdb = getDB(); // Access the database instance
    const getUserDetailsQuery = `SELECT * FROM users WHERE email = ?;`;
    const userDetailsObj = await mdb.get(getUserDetailsQuery, [email]); // Query the database for user details

    if (!userDetailsObj) {
      return res.status(200).json({ authenticated: false }); // If user details are not found, respond with not authenticated
    }

    res.status(200).json({ authenticated: true }); // If user details are found, respond with authenticated
  } catch (err) {
    res.status(200).json({ authenticated: false }); // If there is an error in verifying the token, respond with not authenticated
  }
});

// Route to handle redirection after successful Google OAuth authentication
router.get(
  "/oauth/redirect",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    if (!req.user || !req.user.token) {
      return res.redirect(`${process.env.FRONTEND_URL}/login`); // If user or token is not present, redirect to the login page
    }

    const token = req.user.token; // Retrieve the token from the user object

    res.cookie("token", token, {
      //configure according to how you deploy the application.
      maxAge: 30 * 24 * 60 * 60 * 1000, // Set the cookie to expire in 30 days
    });

    res.redirect(`${process.env.FRONTEND_URL}`); // Redirect to the frontend URL after setting the cookie
  }
);

// Route to initiate Google OAuth authentication process
router.get(
  "/oauth/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/youtube.upload",
    ],
    accessType: "offline", // Request offline access to get a refresh token
    prompt: "consent select_account", // Prompt the user to select an account and give consent
  })
);

// Route to handle user logout
router.get("/logout", (req, res) => {
  try {
    const token = req.cookies.token; // Retrieve the token from the cookies

    // Set the token cookie to expire immediately, effectively logging the user out
    res.cookie("token", token, {
      secure: true,
      sameSite: "None",
      maxAge: -1,
      httpOnly: true,
      expires: new Date(0),
    });

    return res.status(200).json({ message: "Successfully logged out" }); // Respond with a success message
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An unexpected error occurred during logout" }); // Handle any errors during the logout process
  }
});

module.exports = router;
