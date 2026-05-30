# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment
Kodikos - Real-Time Collaborative Code Editor

Kodikos is a real-time collaborative code editor that allows multiple users to write and edit code simultaneously in the same room. Built using modern web technologies, it provides a smooth and interactive coding experience with live updates, authentication, and secure communication.

✨ Features

✅ Real-Time Collaboration using Socket.IO (one server per room, instant code sync)

✅ Multi-language Code Editor (HTML, CSS, JS using CodeMirror)

✅ User Authentication (JWT-based secure login/signup)

✅ Room-Based Sessions (unique room IDs for collaborative editing)

✅ Responsive UI built with React

✅ REST API Integration for user management and session handling

✅ Database Support (MongoDB for users & room data)

✅ Scalable Architecture with Express backend & WebSocket integration

🛠 Tech Stack

Frontend: React, CodeMirror, Socket.IO Client

Backend: Node.js, Express.js, Socket.IO

Database: MongoDB (Mongoose for ORM)

Authentication: JWT (JSON Web Token)

Styling: CSS / TailwindCSS (if used)

Others: REST API, bcrypt for password hashing

📂 Project Structure
kodikos/
├── client/               # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── index.js
├── server/               # Node.js backend
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   └── Actions.js
├── .env                  # Environment variables
├── package.json
└── README.md

⚙️ Installation & Setup
1. Clone the repository
git clone https://github.com/your-username/kodikos.git
cd kodikos

2. Setup Environment Variables

Create a `.env` file with the following variables:

PORT=5000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_jwt_secret
SMTP_USER=your_gmail_address
SMTP_PASS=your_gmail_app_password
SENDER_EMAIL=rushitgoyal@gmail.com

The verification email sender is read from `SENDER_EMAIL`.

3. Install dependencies
Backend
cd server
npm install

Frontend
cd ../client
npm install

4. Run the application
Backend
cd server
npm start

Frontend
cd client
npm start

▶️ How It Works

User Authentication

Sign up or log in (credentials stored in MongoDB with hashed passwords using bcrypt).

JWT tokens generated for secure sessions.

Create/Join Room

Each room has a unique Room ID.

Users can share the Room ID with others to join the same coding session.

Real-Time Collaboration

Code changes in one user’s editor instantly reflect in all connected users' editors using Socket.IO.

One server per room ensures isolated sessions.

Security

JWT for authentication.

Room-based socket namespaces to prevent unauthorized access.

🖼️ Screenshots

(Add images later if available)

🚀 Deployment

Frontend: Vercel / Netlify

Backend: Render / Railway / AWS / DigitalOcean

Database: MongoDB Atlas

📜 License

This project is licensed under the MIT License.

✅ Do you want me to include detailed commands for running in development mode vs production, API endpoints documentation, and socket event documentation inside this README? Or keep it simple and clean like above?

Also, should I add a section for future enhancements (like Monaco editor, theme support, file system integration)?

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
