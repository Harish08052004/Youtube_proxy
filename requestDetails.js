const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { ensureAuthenticated, getNewAccessToken } = require("../middleware");

// Route to get requests based on role and status
router.get("/requests", ensureAuthenticated, async (request, response) => {
  try {
    const mdb = getDB();
    const userName = request.user.username;

    const { role, req_status } = request.query;
    let requestType;

    // Determine the request type based on the user's role
    if (role === "creator") {
      requestType = "to_user";
    } else if (role === "editor") {
      requestType = "from_user";
    } else {
      return response.status(400).send("Invalid role parameter");
    }

    // Base query to select requests
    let getRequestsQuery = `SELECT * FROM VIDEOS WHERE ${requestType} = ?`;

    // Add a status filter if req_status is provided in the query
    if (req_status) {
      getRequestsQuery += ` AND request_status = ?`;
    }

    // Add order by clause to sort the requests by requested_date_time in descending order
    getRequestsQuery += ` ORDER BY requested_date_time DESC`;

    // Execute the query and retrieve the requests
    const requestsResponse = req_status
      ? await mdb.all(getRequestsQuery, [userName, req_status])
      : await mdb.all(getRequestsQuery, [userName]);

    // Check and update response_date_time if video is not uploaded and request is approved
    for (let eachItem of requestsResponse) {
      if (
        eachItem.video_upload_status === "not uploaded" &&
        eachItem.request_status === "approved"
      ) {
        const newAccessToken = await getNewAccessToken(
          eachItem.video_refresh_token
        );
        if (!newAccessToken) {
          const updateResponseDateTimeQuery = `
                  UPDATE videos SET response_date_time=NULL WHERE id=?
                `;
          await mdb.run(updateResponseDateTimeQuery, [eachItem.id]);
          eachItem.response_date_time = null;
        }
      }
    }

    // Return the requests in the response
    response.status(200).json(requestsResponse);
  } catch (error) {
    // Handle any errors that occur during the process
    response.status(500).send("Error retrieving requests");
  }
});

// Route to get video details by videoId
router.get(
  "/requests/:videoId",
  ensureAuthenticated,
  async (request, response) => {
    try {
      const mdb = getDB();
      const { videoId } = request.params;

      // Query to get the video details from the database
      const getRequestDetailsQuery = `SELECT * FROM VIDEOS WHERE id = ?;`;
      const dbResponse = await mdb.get(getRequestDetailsQuery, [videoId]);

      // If no details are found, return a 404 error
      if (dbResponse === undefined) {
        return response.status(404).send({ message: "details not found" });
      }

      // Return the video details in the response
      return response.status(200).json(dbResponse);
    } catch (error) {
      // Handle any errors that occur during the process
      return response.status(500).send("Error retrieving video details");
    }
  }
);

// Route to resend request for approval due to expired refresh token
router.get(
  "/resend/:videoId",
  ensureAuthenticated,
  async (request, response) => {
    const { videoId } = request.params;

    try {
      const mdb = getDB();

      // Update the request status to 'pending' for the specified videoId
      const updateResponseStatusQuery = `
            UPDATE videos
            SET request_status = 'pending'
            WHERE id = ?;
          `;

      const dbResponse = await mdb.run(updateResponseStatusQuery, [videoId]);

      // If the update is successful, return a success response
      if (dbResponse.changes > 0) {
        response.status(200).json({
          status: "success",
          message: "Request status updated successfully",
        });
      } else {
        // If the update fails, return a failure response
        response.status(400).json({
          status: "failure",
          message: "Failed to update request status",
        });
      }
    } catch (error) {
      // Handle any errors that occur during the process
      response
        .status(500)
        .json({ status: "error", message: "Internal Server Error" });
    }
  }
);

module.exports = router;
