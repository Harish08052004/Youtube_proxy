const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const fs = require("fs");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const { getDB } = require("./db");

// Middleware to ensure the user is authenticated
const ensureAuthenticated = async (req, res, next) => {
  // Extract the token from cookies
  const token = req.cookies.token;

  // If no token is found, redirect to login
  if (!token) {
    return res.redirect(`${process.env.FRONTEND_URL}/login`);
  }

  try {
    // Access the database
    const mdb = getDB();

    // Verify the token and decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email } = decoded;

    // Query the database for user details using the decoded email
    const getUserDetailsQuery = `SELECT * FROM users WHERE email = ?;`;
    const userDetailsObj = await mdb.get(getUserDetailsQuery, [email]);

    // If user details are not found, redirect to login
    if (!userDetailsObj) {
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    // Attach user details to the request object
    req.user = userDetailsObj;

    // Proceed to the next middleware or route handler
    next();
  } catch (err) {
    // If token verification fails or other errors occur, redirect to login
    res.redirect(`${process.env.FRONTEND_URL}/login`);
  }
};

// Function to get a new access token using a refresh token
const getNewAccessToken = async (refreshToken) => {
  const url = "https://oauth2.googleapis.com/token";

  // Prepare the request parameters
  const params = new URLSearchParams({
    client_id: process.env.clientID,
    client_secret: process.env.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  try {
    // Make a POST request to get a new access token
    const response = await fetch(url, {
      method: "POST",
      body: params,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // Check if the response is OK
    if (!response.ok) {
      return null;
    }

    // Parse and return the new access token
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    return null;
  }
};

// Function to download a file from a URL
const downloadFromUrl = async (fileUrl, videoId, fileType) => {
  try {
    // Create a unique filename for the downloaded file
    const uniqueFilename = `${videoId}_${uuidv4()}.${fileType}`;
    const filePath = `./videos/${uniqueFilename}`;

    // Ensure the videos directory exists
    if (!fs.existsSync("./videos")) {
      fs.mkdirSync("./videos");
    }

    // Create a writable stream for the file
    const file = fs.createWriteStream(filePath);

    // Download and save the file
    await new Promise((resolve, reject) => {
      http
        .get(fileUrl, (response) => {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve(filePath);
          });
        })
        .on("error", (err) => {
          fs.unlink(filePath, () => reject(err));
        });
    });

    return uniqueFilename;
  } catch (error) {
    res.status(500).json({ message: "Failed to download the file" });
  }
};

module.exports = {
  ensureAuthenticated,
  getNewAccessToken,
  downloadFromUrl,
};
