# Deployment

Production setup:

- Database: MongoDB Atlas
- Backend API: Render
- Frontend: Vercel

## 1. MongoDB Atlas

Create a free MongoDB Atlas cluster and copy the connection string:

```text
mongodb+srv://<user>:<password>@<cluster-host>/pdf-book-store?retryWrites=true&w=majority
```

Use this as `MONGO_URI` in Render.

## 2. Backend on Render

Create a new Render Blueprint from this repository, or create a Web Service manually:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Required environment variables:

```text
NODE_ENV=production
CLIENT_URL=https://your-vercel-app.vercel.app
MONGO_URI=<mongodb-atlas-uri>
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
ADMIN_NOTIFY_EMAIL=<admin-email>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail-address>
SMTP_PASS=<gmail-app-password>
SMTP_FROM="Mahesh Bharti E-book Store <gmail-address>"
RAZORPAY_KEY_ID=<optional>
RAZORPAY_KEY_SECRET=<optional>
RAZORPAY_WEBHOOK_SECRET=<optional>
RAZORPAY_CURRENCY=INR
UPI_ID=<upi-id>
UPI_PAYEE_NAME=<payee-name>
UPLOAD_DIR=uploads
```

## 3. Frontend on Vercel

Import the same repository in Vercel:

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`

Set this environment variable:

```text
VITE_API_URL=https://your-render-api.onrender.com/api
```

## 4. Razorpay Webhook

If Razorpay is enabled, add this webhook URL in Razorpay dashboard:

```text
https://your-render-api.onrender.com/api/payments/webhook
```

Use the generated webhook secret as `RAZORPAY_WEBHOOK_SECRET`.
