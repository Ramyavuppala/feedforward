# 🌿 FeedForward — Share Food, Share Hope

A full-stack MERN application for decentralized food sharing. Providers list surplus food, seekers request it, and everything is tracked in real-time via Socket.io.

---

## 🏗 Tech Stack

| Layer      | Technology                              |
|------------|------------------------------------------|
| Frontend   | React 18, Tailwind CSS, React Router v6 |
| State      | Context API                              |
| HTTP       | Axios                                    |
| Real-time  | Socket.io client                         |
| Maps       | React-Leaflet + OpenStreetMap            |
| Charts     | Recharts                                 |
| Backend    | Node.js + Express                        |
| Database   | MongoDB + Mongoose                       |
| Auth       | JWT + bcryptjs                           |
| Real-time  | Socket.io                                |
| Scheduler  | node-cron (auto-expire food)             |

---

## 📁 Project Structure

```
feedforward/
├── backend/
│   ├── server.js               # Express + Socket.io entry point
│   ├── .env.example            # Environment variables template
│   ├── models/
│   │   ├── User.js
│   │   ├── Food.js
│   │   ├── Request.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── food.js
│   │   ├── request.js
│   │   ├── admin.js
│   │   └── notification.js
│   ├── middleware/
│   │   └── auth.js             # JWT protect + role authorize
│   └── jobs/
│       └── expireFood.js       # Cron: auto-expire food
│
└── frontend/
    ├── public/index.html
    ├── tailwind.config.js
    └── src/
        ├── App.js              # Routes + providers
        ├── index.js
        ├── index.css           # Tailwind + custom styles
        ├── context/
        │   ├── AuthContext.js
        │   └── NotificationContext.js
        ├── services/
        │   ├── api.js          # Axios instance
        │   └── socket.js       # Socket singleton
        ├── components/
        │   ├── DashboardLayout.js
        │   ├── NotificationPanel.js
        │   ├── StatusBadge.js
        │   ├── StatCard.js
        │   └── LoadingSpinner.js
        └── pages/
            ├── Login.js
            ├── Register.js
            ├── admin/
            │   ├── AdminDashboard.js   # Analytics + charts
            │   └── AdminUsers.js       # User management
            ├── provider/
            │   ├── ProviderDashboard.js
            │   ├── AddFood.js
            │   ├── ManageFoods.js
            │   └── ProviderRequests.js
            └── seeker/
                ├── SeekerDashboard.js
                ├── AvailableFood.js
                ├── MyRequests.js
                └── FoodMap.js          # React-Leaflet map
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js v16+
- MongoDB (local or MongoDB Atlas)
- npm or yarn

---

### 1. Backend Setup

```bash
cd feedforward/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values:
#   MONGO_URI=mongodb://localhost:27017/feedforward
#   JWT_SECRET=your_secret_key_here
#   CLIENT_URL=http://localhost:3000
#   PORT=5000

# Start development server
npm run dev
```

Backend runs at: `http://localhost:5000`

---

### 2. Frontend Setup

```bash
cd feedforward/frontend

# Install dependencies
npm install

# Start React app
npm start
```

Frontend runs at: `http://localhost:3000`

> **Note:** The React app proxies `/api` requests to `http://localhost:5000` via the `"proxy"` field in `package.json`.

---

## 🔐 API Reference

### Auth
| Method | Endpoint           | Access  | Description      |
|--------|--------------------|---------|------------------|
| POST   | /api/auth/register | Public  | Register user    |
| POST   | /api/auth/login    | Public  | Login + get JWT  |

### Food
| Method | Endpoint              | Access   | Description          |
|--------|-----------------------|----------|----------------------|
| POST   | /api/food/add         | Provider | Add food listing     |
| GET    | /api/food/all         | Auth     | All available food   |
| GET    | /api/food/provider    | Provider | My food listings     |
| PUT    | /api/food/status/:id  | Provider | Update food status   |
| DELETE | /api/food/:id         | Provider | Delete listing       |

### Requests
| Method | Endpoint              | Access   | Description              |
|--------|-----------------------|----------|--------------------------|
| POST   | /api/request          | Seeker   | Create food request      |
| GET    | /api/request/my       | Seeker   | My requests              |
| GET    | /api/request/provider | Provider | Requests for my food     |
| PUT    | /api/request/:id      | Provider | Accept/reject/complete   |

### Admin
| Method | Endpoint            | Access | Description     |
|--------|---------------------|--------|-----------------|
| GET    | /api/admin/stats    | Admin  | Platform stats  |
| GET    | /api/admin/users    | Admin  | All users       |
| DELETE | /api/admin/user/:id | Admin  | Delete user     |

### Notifications
| Method | Endpoint                    | Access | Description       |
|--------|-----------------------------|--------|-------------------|
| GET    | /api/notification           | Auth   | My notifications  |
| PUT    | /api/notification/read/:id  | Auth   | Mark one read     |
| PUT    | /api/notification/read-all  | Auth   | Mark all read     |

---

## 🔌 Socket.io Events

| Event           | Direction       | Payload                   | Description                    |
|-----------------|-----------------|---------------------------|--------------------------------|
| `join`          | Client → Server | `userId`                  | Join personal room             |
| `foodAdded`     | Server → All    | `food`                    | New food listed                |
| `foodUpdated`   | Server → All    | `food`                    | Food status changed            |
| `foodDeleted`   | Server → All    | `{ _id }`                 | Food removed                   |
| `foodRequested` | Server → Room   | `{ request, notification }` | Seeker requested food        |
| `requestUpdated`| Server → Room   | `{ request, notification }` | Provider updated request     |
| `foodExpired`   | Server → Room   | `{ foodId }`              | Cron expired a food item       |

---

## 🎭 User Roles

### 🛡️ Admin
- View platform analytics dashboard (charts via Recharts)
- Manage all users (view, delete)
- See role distribution and monthly trends

### 🍱 Provider
- Add food listings with GPS coordinates
- Manage existing listings (update status, delete)
- View and respond to seeker requests (accept / reject / mark delivered)
- Receive real-time notifications when requests come in

### 🙏 Seeker
- Browse all available food listings
- Send requests with optional message
- Track request status with visual progress tracker
- View food locations on interactive map (React-Leaflet)
- Receive real-time notifications on acceptance/delivery

---

## ⏰ Auto-Expiry Cron Job

A `node-cron` job runs every 10 minutes. It:
1. Finds all food with `expiryTime < now` and status `available` or `requested`
2. Sets their status to `expired`
3. Creates a notification for the provider
4. Emits `foodExpired` via Socket.io to the provider's room

---

## 🎨 Design System

- **Font**: Playfair Display (headings) + DM Sans (body)
- **Primary**: Forest green (`forest-600`: `#16a34a`)
- **Secondary**: Earth tones (`earth-500`: `#db8523`)
- **Background**: Stone (`stone-50`: `#fafaf9`)
- **Components**: Cards, badges, toasts, modals, sidebars — all Tailwind utility classes

---

## 🚀 Production Deployment

### Backend (e.g. Render / Railway)
```bash
# Set env vars in dashboard:
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
CLIENT_URL=https://your-frontend.vercel.app
PORT=5000

npm start
```

### Frontend (e.g. Vercel / Netlify)
```bash
# Set env var:
REACT_APP_SERVER_URL=https://your-backend.render.com

npm run build
# Deploy the /build folder
```

Update the `proxy` in `package.json` to point to your live backend URL for production, or use `REACT_APP_SERVER_URL` in the socket service.

---

## 📦 Dependencies Summary

### Backend
```
express, mongoose, bcryptjs, jsonwebtoken,
cors, dotenv, socket.io, node-cron
```

### Frontend
```
react, react-dom, react-router-dom, axios,
socket.io-client, react-leaflet, leaflet,
recharts, react-hot-toast
```

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — free for personal and commercial use.

---

*Built with 💚 to reduce food waste and fight hunger.*
