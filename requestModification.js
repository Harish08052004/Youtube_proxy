const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v2 } = require("cloudinary");

const {
  ensureAuthenticated,
  getNewAccessToken,
  downloadFromUrl,
} = require("../middleware");
const FormData = require("form-data");
const fetch = require("node-fetch");

const { getDB } = require("../db");
require("dotenv").config();

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  // Define the destination folder for uploads
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  // Define the filename for uploaded files
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Function to delete resource from Cloudinary
const deleteFromCloudinary = async (
  videoId,
  publicId,
  resourceType = "image"
) => {
  const columnName =
    resourceType === "image" ? "thumbnail_public_id" : "video_public_id";
  const addToPendingDeletesTableQuery = `
        INSERT INTO pending_deletes(${columnName}, video_id)
        VALUES(?, ?);
      `;

  try {
    const mdb = getDB();
    // Starting the transaction
    await mdb.run("BEGIN TRANSACTION;");

    // Adding publicId to pending_deletes table
    await mdb.run(addToPendingDeletesTableQuery, [publicId, videoId]);

    // Deleting resource from Cloudinary
    await v2.uploader.destroy(publicId, { resource_type: resourceType });

    // Removing entry from pending_deletes table
    const removeFromPendingDeletesTableQuery = `
          DELETE FROM pending_deletes WHERE ${columnName} = ? AND video_id = ?;
        `;
    await mdb.run(removeFromPendingDeletesTableQuery, [publicId, videoId]);

    // Committing transaction
    await mdb.run("COMMIT;");
  } catch (error) {
    // Rollback transaction on error
    await mdb.run("ROLLBACK;");
  }
};

// Route to delete a video
router.delete(
  "/delete/:videoId",
  ensureAuthenticated,
  async (request, response) => {
    const { videoId } = request.params;

    // Query to get video details
    const getDetailsQuery = `
        SELECT video_public_id,thumbnail_public_id from videos WHERE id=?
        `;

    // Query to delete the video record
    const deleteRequest = `
            DELETE FROM videos WHERE id=?;
        `;

    try {
      const mdb = getDB();
      const getResponse = await mdb.get(getDetailsQuery, [videoId]);

      // If video not found, return 404 status
      if (!getResponse) {
        return response.status(404).json({ error: "Video not found" });
      }

      // Delete video and thumbnail from Cloudinary
      await deleteFromCloudinary(videoId, getResponse.video_public_id, "video");
      await deleteFromCloudinary(videoId, getResponse.thumbnail_public_id);

      // Delete video record from the database
      const deleteResponse = await mdb.run(deleteRequest, [videoId]);
      response.json({ message: "Video deleted successfully", deleteResponse });
    } catch (error) {
      // Return error response if any issue occurs
      response
        .status(500)
        .json({ error: "Failed to delete video. Please try again." });
    }
  }
);

// Route to check invitation code
router.post(
  "/check_invitation_code",
  ensureAuthenticated,
  async (request, response) => {
    try {
      const mdb = getDB();
      const invitationCode = request.body.invitationCode;
      const { email } = request.user;

      // Retrieve the user's own invitation code
      const getOwnInvitationCodeQuery = `
        SELECT invitation_code FROM users WHERE email = ?
      `;
      const ownInvCodeResponse = await mdb.get(getOwnInvitationCodeQuery, [
        email,
      ]);

      // Retrieve all invitation codes from the database
      const getAllInvitationCodesQuery = `
        SELECT invitation_code FROM users
      `;
      const allInvitationCodes = await mdb.all(getAllInvitationCodesQuery);

      // Check if the invitation code matches the user's own code
      if (invitationCode === ownInvCodeResponse.invitation_code) {
        return response
          .status(400)
          .json({ message: "Please fill other user's valid invitation code" });
      }

      // Check if the invitation code exists in the database
      const isValidCode = allInvitationCodes.some(
        (code) => code.invitation_code === invitationCode
      );

      if (!isValidCode) {
        return response
          .status(400)
          .json({ message: "Please fill a valid invitation code" });
      }

      // If all checks pass, return a success response
      response.status(200).json({ message: "Invitation code is valid" });
    } catch (error) {
      // Return error response if any issue occurs
      response.status(500).json({
        message: "Internal server error, unable to check invitation code",
      });
    }
  }
);

// Route to handle video upload requests
router.post(
  "/upload-request",
  ensureAuthenticated,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (request, response) => {
    try {
      const mdb = getDB();
      const {
        title,
        description,
        privacy_status: privacyStatus,
        creator_invitation_code: creatorInvitationCode,
        audience,
        category_id: categoryId,
      } = request.body;

      // Query to get the creator's username using their invitation code
      const creatorUserNameQuery = `SELECT username from USERS where invitation_code=?;`;
      const creatorUserNameResponse = await mdb.get(creatorUserNameQuery, [
        creatorInvitationCode,
      ]);

      const creatorUserName = creatorUserNameResponse.username;

      // Upload thumbnail to Cloudinary
      const thumbnailPath = request.files["thumbnail"][0].path;
      const thumbnailUploadResponse = await v2.uploader.upload(thumbnailPath, {
        resource_type: "image",
      });
      // Delete the local file after uploading to Cloudinary
      fs.unlinkSync(thumbnailPath);

      // Upload video to Cloudinary
      const videoPath = request.files["video"][0].path;
      const videoUploadResponse = await v2.uploader.upload(videoPath, {
        resource_type: "video",
      });
      // Delete the local file after uploading to Cloudinary
      fs.unlinkSync(videoPath);

      // Insert video details into the database
      const addDetailsQuery = `
          INSERT INTO VIDEOS(video_url, title, description, thumbnail_url, audience, category_id,
                              privacy_status, request_status, from_user, to_user, video_public_id, thumbnail_public_id) 
          VALUES(?, ?, ?, ?, ?, ?, ?,'pending', ?, ?, ?, ?);
        `;
      const addingResponse = await mdb.run(addDetailsQuery, [
        videoUploadResponse.url,
        title,
        description,
        thumbnailUploadResponse.url,
        audience,
        categoryId,
        privacyStatus,
        request.user.username,
        creatorUserName,
        videoUploadResponse.public_id,
        thumbnailUploadResponse.public_id,
      ]);

      return response.status(200).send({ message: "Upload successful" });
    } catch (error) {
      return response.status(500).send({ message: "Upload failed" });
    }
  }
);

// Route to handle the creator's response to an upload request
router.put(
  "/response/:videoId",
  ensureAuthenticated,
  async (request, response) => {
    const { videoId } = request.params;
    const { creatorResponse } = request.body;

    let editorRequestStatus;

    // Set the request status based on the creator's response
    if (creatorResponse) {
      editorRequestStatus = "approved";
    } else {
      editorRequestStatus = "rejected";
    }

    try {
      const mdb = getDB();
      let updateRequestStatusQuery;
      let queryParams;
      const dateTime = new Date().toISOString();

      // Update the request status and potentially store the refresh token if approved
      if (editorRequestStatus === "approved") {
        updateRequestStatusQuery = `
            UPDATE videos 
            SET request_status = ?, response_date_time=?, video_refresh_token = ? 
            WHERE id = ?;
          `;
        queryParams = [
          editorRequestStatus,
          dateTime,
          request.user.refresh_token,
          videoId,
        ];
      } else {
        updateRequestStatusQuery = `
            UPDATE videos 
            SET request_status = ?, response_date_time=? 
            WHERE id = ?;
          `;
        queryParams = [editorRequestStatus, dateTime, videoId];
      }

      const dbResponse = await mdb.run(updateRequestStatusQuery, queryParams);
      response.send(dbResponse);
    } catch (error) {
      response.status(500).send("Error updating request status");
    }
  }
);

// Route to handle video upload to YouTube
router.post("/upload-video", ensureAuthenticated, async (req, res) => {
  const mdb = getDB();
  const { videoId } = req.body;

  let videoFileName;
  let thumbnailFileName;
  let isVideoUploaded = false;

  // Helper function to clean up files after processing
  const cleanupFiles = (videoFileName, thumbnailFileName) => {
    if (videoFileName) {
      fs.unlink(`./videos/${videoFileName}`, (unlinkError) => {
        if (unlinkError) {
          console.error("Error deleting video file:", unlinkError);
        }
      });
    }
    if (thumbnailFileName) {
      fs.unlink(`./videos/${thumbnailFileName}`, (unlinkError) => {
        if (unlinkError) {
          console.error("Error deleting thumbnail file:", unlinkError);
        }
      });
    }
  };

  try {
    // Fetch video details from the database using the video ID
    const getVideoDetails = `SELECT * FROM videos WHERE id=?;`;
    const getVideoDetailsResponse = await mdb.get(getVideoDetails, [videoId]);

    // If video details are not found, return a 404 error
    if (!getVideoDetailsResponse) {
      return res.status(404).json({ message: "Video details not found" });
    }

    // Destructure video details from the response
    const {
      video_url,
      title,
      description,
      thumbnail_url,
      category_id,
      audience,
      privacy_status,
      video_refresh_token,
      video_public_id,
      thumbnail_public_id,
    } = getVideoDetailsResponse;

    // Get a new access token using the refresh token
    const newAccessToken = await getNewAccessToken(video_refresh_token);

    // Download video and thumbnail to local storage
    videoFileName = await downloadFromUrl(video_url, videoId, "mp4");
    thumbnailFileName = await downloadFromUrl(thumbnail_url, videoId, "jpg");

    // Create a FormData instance for the video upload
    const videoForm = new FormData();
    videoForm.append(
      "resource",
      JSON.stringify({
        snippet: {
          title: title,
          description: description,
          categoryId: category_id,
        },
        status: {
          privacyStatus: privacy_status,
          selfDeclaredMadeForKids: audience === "yes",
        },
      }),
      { contentType: "application/json" }
    );
    videoForm.append(
      "media",
      fs.createReadStream(`./videos/${videoFileName}`),
      {
        filename: path.basename(videoFileName),
        contentType: "video/mp4",
      }
    );

    // Make the request to upload the video to YouTube
    const videoResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
        },
        body: videoForm,
      }
    );

    // Handle errors during video upload
    if (!videoResponse.ok) {
      const errorBody = await videoResponse.text();
      const errorObj = JSON.parse(errorBody);

      cleanupFiles(videoFileName, thumbnailFileName);

      if (errorObj.error.code === 403) {
        if (errorObj.error.errors[0].reason === "quotaExceeded") {
          return res.status(403).json({
            reason: "video quotaExceeded",
            message:
              "Apologies! Our application has reached its quota for today. Please consider trying the upload again tomorrow. Thank you for your understanding!",
          });
        }
        return res.status(403).json({
          reason: "video upload forbidden",
          message: "The user does not have permission to upload video",
        });
      }
      return res.status(500).json({ message: "Failed to upload video" });
    }

    // Parse the response to get the YouTube video ID
    const videoResponseBody = await videoResponse.json();
    const youtubeVideoId = videoResponseBody.id;

    // Mark the video as uploaded
    isVideoUploaded = true;
    cleanupFiles(videoFileName, null);

    // Create a FormData instance for the thumbnail upload
    const thumbnailForm = new FormData();
    thumbnailForm.append(
      "media",
      fs.createReadStream(`./videos/${thumbnailFileName}`),
      {
        filename: path.basename(thumbnailFileName),
        contentType: "image/jpeg",
      }
    );

    // Make the request to upload the thumbnail to YouTube
    const thumbnailResponse = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${youtubeVideoId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
        },
        body: thumbnailForm,
      }
    );

    // Handle errors during thumbnail upload
    if (!thumbnailResponse.ok) {
      const errorBody = await thumbnailResponse.text();
      const errorObj = JSON.parse(errorBody);

      cleanupFiles(null, thumbnailFileName);

      if (errorObj.error.code === 403) {
        if (errorObj.error.errors[0].reason === "quotaExceeded") {
          return res.status(403).json({
            reason: "thumbnail quotaExceeded",
            message:
              "Apologies! Our application has reached its quota for today. For that reason, we couldn't upload the thumbnail. Thank you for your understanding!",
          });
        }
        return res.status(403).json({
          reason: "thumbnail upload forbidden",
          message: "The user does not have permission to upload thumbnails.",
        });
      } else {
        return res.status(409).json({
          message:
            "Video uploaded successfully. But, error while uploading thumbnail.",
        });
      }
    }

    const thumbnailResponseBody = await thumbnailResponse.json();

    // Clean up the thumbnail file after upload
    cleanupFiles(null, thumbnailFileName);

    // Delete resources from Cloudinary after successful upload
    await deleteFromCloudinary(videoId, video_public_id, "video");
    await deleteFromCloudinary(videoId, thumbnail_public_id, "image");

    // Update the video and thumbnail URLs in the database
    const updateVideoDetailsQuery = `UPDATE videos SET video_url=?, thumbnail_url=?, video_upload_status='uploaded' WHERE id=?;`;
    await mdb.run(updateVideoDetailsQuery, [
      youtubeVideoId,
      thumbnailResponseBody.items[0].default.url, // Use the correct path to extract the URL
      videoId,
    ]);

    res.json({ message: "Video and thumbnail uploaded successfully." });
  } catch (error) {
    // If the video was uploaded but the thumbnail upload failed
    if (isVideoUploaded) {
      cleanupFiles(null, thumbnailFileName);
      return res
        .status(409)
        .json({ message: "Video uploaded, but thumbnail upload failed." });
    }

    // General error handling for failed video uploads
    cleanupFiles(videoFileName, thumbnailFileName);
    res.status(500).json({ message: "Failed to upload video." });
  }
});

module.exports = router;
