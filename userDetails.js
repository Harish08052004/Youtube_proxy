const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); // Import the function to access the database
const { ensureAuthenticated } = require("../middleware"); // Import middleware to ensure user is authenticated

// Route handler to get user details
router.get("/user/details", ensureAuthenticated, async (req, res) => {
  try {
    // Define the SQL query to fetch user details
    const query = `SELECT email, invitation_code, user_image, user_display_name FROM users WHERE email=?;`;

    // Access the database instance
    const mdb = getDB();

    // Execute the query with the email from the authenticated user
    const dbResponse = await mdb.get(query, req.user.email);

    // Check if the user was found
    if (dbResponse) {
      // Send the user details as JSON response
      res.json({
        invitationCode: dbResponse.invitation_code,
        userEmail: dbResponse.email,
        userImage: dbResponse.user_image,
        displayName: dbResponse.user_display_name,
      });
    } else {
      // If the user was not found, send a 404 status with an error message
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    // Handle any unexpected errors and send a 500 status with an error message
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
