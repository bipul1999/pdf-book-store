# PDF Book Store

A full-stack PDF book selling website with React, Tailwind CSS, Node.js, Express, MongoDB, JWT auth, OTP email, Razorpay payment verification, admin management, and protected PDF downloads.

## Structure

- `client` - React + Vite + Tailwind frontend
- `server` - Express API, MongoDB models, authentication, uploads, payment and admin routes

## Setup

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Copy environment files:
   ```bash
   copy server\.env.example server\.env
   copy client\.env.example client\.env
   ```

3. Update `server/.env` with `MONGO_URI`, `JWT_SECRET`, SMTP credentials, Razorpay keys, and admin credentials.

4. Run development servers:
   ```bash
   npm run dev
   ```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000/api`

## Demo Books

After setting `server/.env` and starting MongoDB, seed demo categories, covers, and PDFs:

```bash
npm run seed:demo --prefix server
```

The homepage will show featured demo book cards with `Buy PDF` buttons. Admin can replace these with real cover images, descriptions, prices, and PDF files from `/admin`.

## Admin

Hidden route: `/admin/login`

Recommended setup: create the first admin from the website:

1. Start MongoDB, backend, and frontend.
2. Open `/admin/signup`.
3. Use a Gmail address.
4. Enter the OTP sent to that Gmail inbox.
5. Login from `/admin/login`.

Only one verified admin profile is allowed. After the first admin is verified, admin signup is blocked.

If you made a failed test admin and want to start admin setup again:

```bash
npm run reset:admin --prefix server
```

Optional development seed: if `SEED_ADMIN_FROM_ENV=true`, server startup creates an admin from:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

You can also create or update an admin manually:

```bash
npm run create:admin --prefix server -- --email admin@example.com --password Admin@12345 --phone 9999999999
```

## Secure PDF Flow

PDFs are uploaded to `server/uploads/pdfs` and are not public static files. Users can download through:

`GET /api/books/:id/download`

The backend checks JWT authentication and confirms the book exists in the user's `purchasedBooks` list. Admin users may download any book.

## Payment Flow

If Razorpay keys exist, checkout creates a Razorpay order and verifies the payment signature on the backend before unlocking books. If keys are missing, the API creates a pending manual UPI order so the admin can mark it `success` after payment confirmation.

For manual UPI, each checkout order generates a QR code with that exact order amount and note. Add your `UPI_ID` and `UPI_PAYEE_NAME` in `server/.env`, or update them from the admin payment settings page. The user pays with any UPI app, uploads proof, and admin verifies the order before PDFs unlock.

Set `ADMIN_NOTIFY_EMAIL` to receive an email when a user uploads UPI payment proof for verification.

## Deployment Notes

Same-domain deployment (recommended):

- Build the React app with `npm run build --prefix client`.
- Serve the generated `client/dist` folder from the server.
- Use `VITE_API_URL=/api` for production so the frontend calls the backend on the same origin.
- Deploy the server and the built client together on one host.

Backend on Render:

- Root directory: `server`
- Build command: `npm install && npm install --prefix ../client && npm run build --prefix ../client`
- Start command: `npm start`
- Add environment variables from `server/.env.example`
- Persist uploads with a disk or replace local upload storage with Cloudinary/Firebase.

Frontend on Netlify/Vercel:

- Root directory: `client`
- Build command: `npm run build`
- Publish directory: `dist`
- Set `VITE_API_URL` to your deployed backend API URL.
