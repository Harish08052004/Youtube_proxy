const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

// Define the path to the SQLite database file
const dbPath = path.join(__dirname, "youtubetimer.db");

let mdb = null; // Database instance

// Function to initialize the database connection
const initializeDB = async () => {
  // If the database is already initialized, return the existing instance
  if (mdb) return mdb;

  try {
    // Open a new connection to the SQLite database
    mdb = await open({
      filename: dbPath, // Path to the database file
      driver: sqlite3.Database, // SQLite3 driver
    });

    return mdb; // Return the database instance
  } catch (error) {
    // If there is an error during database connection, exit the process with a failure code
    process.exit(1);
  }
};

// Export the function to initialize the database and a getter for the database instance
module.exports = {
  initializeDB,
  getDB: () => mdb,
};
