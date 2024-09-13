# YouTube Proxy

YouTube Proxy is a web application that facilitates seamless collaboration between YouTube creators and editors. The application allows editors to upload videos to YouTube on behalf of creators after the creators explicitly approve the request. The platform ensures secure and efficient management of video uploads, even when the creator cannot upload videos directly due to network issues or other constraints.

## Features

- **Google OAuth 2.0 Authentication**: Secure login for both creators and editors using Google accounts.
- **Request Management**: Editors can request to upload videos, and creators can accept or reject these requests.
- **Secure Token Handling**: Access and refresh tokens are securely stored and managed.
- **Controlled Video Uploads**: Only approved editors can upload videos on behalf of creators.
- **User-Friendly Interface**: Simple and intuitive interface for managing video uploads.

## Scopes Used

- **.../auth/userinfo.email**: See the user's primary Google Account email address.
- **.../auth/userinfo.profile**: See the user's personal info, including any personal info made publicly available.
- **.../auth/youtube.upload**: Manage the user's YouTube videos.

## Prerequisites

- **Node.js** (v14.x or higher)
- **npm** (v6.x or higher)
- **Google Cloud Project** with OAuth 2.0 client set up

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/youtube-proxy1.git
   cd youtube-proxy1
   ```

2. **Install Dependencies**

   Navigate to the backend and frontend directories to install the necessary dependencies.

   ```bash
   cd backend
   npm install
   cd frontend
   npm install
   ```

3. **Environment Variables**

   Replace the name `.env.example` with `.env` and fill in your actual credentials and configuration values.

4. **Start the Application**

   Start both the frontend and backend servers.

   ```bash
   cd backend
   npm start
   cd frontend
   npm start
   ```

5. **Access the Application**

   Open your browser and navigate to `http://localhost:3000` to start using the YouTube Proxy application.

## Usage

1. **Creator Registration and Login**

   - Creators log in using their Google accounts.
   - Once logged in, creators can view and manage video upload requests.

2. **Editor Registration and Login**

   - Editors log in using their Google accounts.
   - Editors can request video uploads on behalf of creators by providing details such as the video file, thumbnail, title, description, category, and privacy status.

3. **Approving or Rejecting Requests**
   - Creators can view pending requests and either approve or reject them.
   - Approved requests allow editors to upload the video directly to the creator’s YouTube channel.

## Deployment

To deploy your application, you can use a service like Render, AWS, or Heroku. Ensure that both frontend and backend servers are properly configured for production, and update the OAuth credentials with your live domain.

### Example Deployment

- **Frontend**: Deployed on Render (https://your-frontend-domain.com)
- **Backend**: Deployed on Render (https://your-backend-domain.com)

## Security Considerations

- **Token Storage**: Access and refresh tokens are securely stored in the database.
- **Authentication**: All API requests are authenticated using JWT tokens and verified against stored tokens.
- **Authorization**: Only authorized users can access specific routes and perform actions like uploading videos.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

```

You can modify or adjust specific sections if needed.
```
