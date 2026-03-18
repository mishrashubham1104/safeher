# 🛡️ SafeHer — Women Safety & Emergency Assistance Platform

A full-stack MERN application providing real-time safety features for women, including SOS alerts, live location sharing, incident reporting, and a community safety map.

---

## 🚀 Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React.js, React Router v6, CSS Modules  |
| Backend    | Node.js, Express.js                     |
| Database   | MongoDB Atlas                           |
| Real-time  | Socket.io (WebSockets)                  |
| Map        | Mapbox GL JS / react-map-gl             |
| Auth       | JWT (JSON Web Tokens) + bcryptjs        |
| SMS Alerts | Twilio                                  |
| Email      | Nodemailer (Gmail SMTP)                 |
| Images     | Cloudinary                              |

---

## 📁 Project Structure

```
safeher/
├── backend/
│   ├── config/         # DB config
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Auth middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # Express routes
│   ├── socket/         # Socket.io handlers
│   └── server.js       # Entry point
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/ # Reusable components
│       ├── context/    # React Context (Auth, Socket)
│       ├── hooks/      # Custom hooks (useGeolocation)
│       ├── pages/      # Page components
│       └── utils/      # API utility (axios)
├── .env.example        # Environment variable template
├── package.json        # Root package.json (concurrently)
└── README.md
```

---

## ⚙️ Setup Instructions

### Step 1 — Clone & Install

```bash
# Install all dependencies (root + frontend)
npm run install-all
```

### Step 2 — Configure Environment Variables

**Backend `.env`** — Create `/safeher/.env` (copy from `.env.example`):

```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas — Get from https://cloud.mongodb.com
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/safeher?retryWrites=true&w=majority

# JWT Secret — Any long random string
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Client URL
CLIENT_URL=http://localhost:3000

# Mapbox — Get from https://account.mapbox.com
MAPBOX_TOKEN=pk.eyJ1IjoiWU9VUl9VU0VSTkFNRSIsImEi...

# Cloudinary — Get from https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Twilio SMS — Get from https://console.twilio.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Gmail SMTP — Use App Password (not your real password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_FROM=SafeHer <noreply@safeher.app>
```

**Frontend `.env`** — Create `/safeher/frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_MAPBOX_TOKEN=pk.eyJ1IjoiWU9VUl9VU0VSTkFNRSIsImEi...
```

### Step 3 — Run the App

```bash
# Run both backend + frontend together
npm run dev

# Or separately:
npm run server   # Backend on port 5000
npm run client   # Frontend on port 3000
```

Open: **http://localhost:3000**

---

## 🔑 How to Get API Keys

### MongoDB Atlas (Free)
1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster (M0)
3. Create a database user
4. Whitelist IP `0.0.0.0/0`
5. Click **Connect → Drivers** and copy the connection string

### Mapbox (Free tier — 50,000 loads/month)
1. Go to [https://account.mapbox.com](https://account.mapbox.com)
2. Sign up → go to **Tokens**
3. Copy the **Default public token** (starts with `pk.`)

### Twilio SMS (Trial — Free credits)
1. Go to [https://console.twilio.com](https://console.twilio.com)
2. Get **Account SID** and **Auth Token** from the dashboard
3. Get a free trial phone number

### Cloudinary (Free — 25 GB)
1. Go to [https://cloudinary.com/console](https://cloudinary.com/console)
2. Copy **Cloud Name**, **API Key**, **API Secret**

### Gmail App Password
1. Enable 2FA on your Google account
2. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an App Password for "Mail"

---

## 👤 Default Admin Account

After starting the app, register with any email.  
To make a user admin, update MongoDB directly:

```javascript
// In MongoDB Atlas Data Explorer or Compass:
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

---

## 🌟 Features

- **🚨 SOS Emergency Alert** — One-tap SOS with SMS + email to emergency contacts
- **📍 Live Location Sharing** — Real-time GPS tracking via Socket.io
- **🗺️ Safety Map** — Mapbox-powered incident map with severity markers
- **📝 Incident Reporting** — Report with type, severity, location, photos, anonymous option
- **👥 Emergency Contacts** — Up to 5 contacts, notified instantly on SOS
- **💬 Community Chat** — Real-time safety chat with anonymous mode
- **⚙️ Admin Dashboard** — Moderate reports, manage users, view SOS alerts
- **🔒 JWT Auth** — Secure registration and login
- **📱 Mobile-first** — Designed for mobile (max-width 430px)

---

## 📞 Emergency Helplines (India)

| Service              | Number |
|----------------------|--------|
| Police Emergency     | 100    |
| Women Helpline       | 181    |
| Ambulance            | 108    |
| Domestic Violence    | 1091   |
| Child Helpline       | 1098   |
| Cyber Crime          | 1930   |

---

## 🛡️ Security Notes

- Never commit `.env` to git
- Change `JWT_SECRET` to a long random string in production
- Use HTTPS in production
- Rate limiting is enabled (100 req/15 min per IP)
- Passwords are hashed with bcryptjs (12 rounds)

---

## 📄 License

MIT — Free to use, modify and distribute.

**Made with ❤️ for women's safety**
