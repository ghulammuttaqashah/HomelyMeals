# HomelyMeals Deployment Guide

Complete step-by-step guide to deploy HomelyMeals on Render (Backend) and Vercel (Frontends).

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ GitHub account
- ✅ Render account (https://render.com)
- ✅ Vercel account (https://vercel.com)
- ✅ MongoDB Atlas account (for production database)
- ✅ All API keys ready (Stripe, Cloudinary, Email, etc.)

---

## 🚀 Part 1: Deploy Backend to Render

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

### Step 2: Create Render Web Service

1. Go to https://render.com and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the **HomelyMeals** repository

### Step 3: Configure Render Service

Fill in the following settings:

**Basic Settings:**
- **Name**: `homelymeals-backend` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Select **Free** (for testing) or **Starter** (for production)

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add ALL of these:

```env
# MongoDB Connection (IMPORTANT: Use your production MongoDB Atlas URL)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/homelymeals?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_secure_random_jwt_secret_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000

# Email Configuration (Gmail App Password)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_DEFAULT_COUNTRY=PK

# Email Verification API
EMAIL_VERIFICATION_API=https://emailreputation.abstractapi.com/v1/
EMAIL_VERIFICATION_KEY=your_abstractapi_key

# OpenRouteService API
OPENROUTE_API_KEY=your_openroute_api_key

# Groq AI API
GROQ_API_KEY=your_groq_api_key

# Cloudinary Configuration
CLOUDINARY_PAYMENT_FOLDER=payment-proofs
CLOUDINARY_DISPUTE_FOLDER=dispute-evidence

# Frontend URLs (UPDATE THESE AFTER DEPLOYING FRONTENDS)
CUSTOMER_APP_URL=https://homelymeals-customer.vercel.app
COOK_APP_URL=https://homelymeals-cook.vercel.app
ADMIN_APP_URL=https://homelymeals-admin.vercel.app
```

**⚠️ IMPORTANT NOTES:**
- Replace ALL placeholder values with your actual credentials
- For `MONGO_URI`: Use MongoDB Atlas production cluster (not localhost)
- For `JWT_SECRET`: Generate a secure random string (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- For Gmail `EMAIL_PASS`: Use App Password (not your regular password)
  - Go to Google Account → Security → 2-Step Verification → App Passwords
- Frontend URLs will be updated after deploying to Vercel (Step 2)

### Step 5: Deploy Backend

1. Click **"Create Web Service"**
2. Wait for deployment to complete (5-10 minutes)
3. Once deployed, you'll get a URL like: `https://homelymeals-backend.onrender.com`
4. **Save this URL** - you'll need it for frontend deployment

### Step 6: Test Backend

Visit: `https://your-backend-url.onrender.com`

You should see: **"Homely Meals API is working!"**

---

## 🎨 Part 2: Deploy Frontends to Vercel

You'll deploy 3 separate apps: Customer, Cook, and Admin.

### A. Deploy Customer Frontend

#### Step 1: Prepare Customer App

1. Navigate to customer folder:
   ```bash
   cd customer
   ```

2. Create production `.env.production` file:
   ```bash
   # Create .env.production
   VITE_API_BASE_URL=https://your-backend-url.onrender.com
   VITE_COOK_URL=https://homelymeals-cook.vercel.app
   VITE_OPENROUTE_API_KEY=your_openroute_api_key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   ```

#### Step 2: Deploy to Vercel

**Option 1: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Option 2: Using Vercel Dashboard**
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select **customer** folder as root directory
4. Framework Preset: **Vite**
5. Add environment variables (same as .env.production above)
6. Click **Deploy**

#### Step 3: Configure Custom Domain (Optional)
- Go to Project Settings → Domains
- Add your custom domain (e.g., `customer.homelymeals.com`)

---

### B. Deploy Cook Frontend

#### Step 1: Prepare Cook App

1. Navigate to cook folder:
   ```bash
   cd cook
   ```

2. Create production `.env.production` file:
   ```bash
   VITE_API_BASE_URL=https://your-backend-url.onrender.com
   VITE_CUSTOMER_URL=https://homelymeals-customer.vercel.app
   VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   VITE_CLOUD_NAME=your_cloudinary_cloud_name
   VITE_UPLOAD_PRESET=your_upload_preset
   GROQ_API_KEY=your_groq_api_key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   ```

#### Step 2: Deploy to Vercel

```bash
# From cook folder
vercel --prod
```

Or use Vercel Dashboard (same process as customer app)

---

### C. Deploy Admin Frontend

#### Step 1: Prepare Admin App

1. Navigate to admin-ui folder:
   ```bash
   cd admin-ui
   ```

2. Create production `.env.production` file:
   ```bash
   VITE_API_BASE_URL=https://your-backend-url.onrender.com
   ```

#### Step 2: Deploy to Vercel

```bash
# From admin-ui folder
vercel --prod
```

Or use Vercel Dashboard

---

## 🔄 Part 3: Update Backend with Frontend URLs

After all frontends are deployed:

1. Go to Render Dashboard → Your Backend Service
2. Go to **Environment** tab
3. Update these variables with your actual Vercel URLs:
   ```env
   CUSTOMER_APP_URL=https://your-customer-app.vercel.app
   COOK_APP_URL=https://your-cook-app.vercel.app
   ADMIN_APP_URL=https://your-admin-app.vercel.app
   ```
4. Click **Save Changes**
5. Render will automatically redeploy with new URLs

---

## 🔐 Part 4: Configure Stripe Webhooks

### Step 1: Create Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-backend-url.onrender.com/api/webhooks/stripe`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `checkout.session.completed`
5. Click **"Add endpoint"**

### Step 2: Get Webhook Secret

1. Click on your newly created webhook
2. Copy the **Signing secret** (starts with `whsec_`)
3. Update `STRIPE_WEBHOOK_SECRET` in Render environment variables

---

## ✅ Part 5: Final Testing

### Test Each Application:

1. **Customer App**: 
   - Visit your customer Vercel URL
   - Test signup/login
   - Test placing an order
   - Test real-time notifications

2. **Cook App**:
   - Visit your cook Vercel URL
   - Test signup/login
   - Test receiving orders
   - Test Stripe Connect onboarding

3. **Admin App**:
   - Visit your admin Vercel URL
   - Test login
   - Test managing users
   - Test viewing orders

### Test Cross-App Features:
- ✅ Real-time order updates (Socket.io)
- ✅ Payment processing (Stripe)
- ✅ Email notifications
- ✅ File uploads (Cloudinary)
- ✅ Chat functionality

---

## 🐛 Troubleshooting

### Common Issues:

**1. CORS Errors**
- Ensure frontend URLs are correctly set in backend environment variables
- Check that URLs don't have trailing slashes

**2. Socket.io Connection Failed**
- Verify `VITE_API_BASE_URL` in frontend .env
- Check browser console for connection errors
- Ensure backend is using `https://` (not `http://`)

**3. Database Connection Failed**
- Verify MongoDB Atlas connection string
- Check IP whitelist in MongoDB Atlas (allow all: `0.0.0.0/0`)
- Ensure database user has correct permissions

**4. Stripe Webhooks Not Working**
- Verify webhook URL is correct
- Check webhook secret matches in environment variables
- Test webhook using Stripe CLI: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`

**5. Email Not Sending**
- Verify Gmail App Password (not regular password)
- Check "Less secure app access" is enabled
- Verify EMAIL_USER and EMAIL_PASS are correct

**6. Build Failures on Vercel**
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

---

## 📊 Monitoring & Maintenance

### Render (Backend):
- Monitor logs: Dashboard → Logs
- Check metrics: Dashboard → Metrics
- Set up alerts for downtime

### Vercel (Frontends):
- Monitor deployments: Dashboard → Deployments
- Check analytics: Dashboard → Analytics
- Review function logs for errors

### MongoDB Atlas:
- Monitor database performance
- Set up backup schedules
- Review connection metrics

---

## 🔄 Updating Your Deployment

### Backend Updates:
```bash
git add .
git commit -m "Update backend"
git push origin main
```
Render will automatically redeploy.

### Frontend Updates:
```bash
# From frontend folder
git add .
git commit -m "Update frontend"
git push origin main
```
Vercel will automatically redeploy.

Or manually trigger:
```bash
vercel --prod
```

---

## 📝 Environment Variables Checklist

### Backend (Render):
- [ ] MONGO_URI
- [ ] JWT_SECRET
- [ ] EMAIL_USER
- [ ] EMAIL_PASS
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] GROQ_API_KEY
- [ ] OPENROUTE_API_KEY
- [ ] CUSTOMER_APP_URL
- [ ] COOK_APP_URL
- [ ] ADMIN_APP_URL

### Customer Frontend (Vercel):
- [ ] VITE_API_BASE_URL
- [ ] VITE_COOK_URL
- [ ] VITE_OPENROUTE_API_KEY
- [ ] VITE_STRIPE_PUBLISHABLE_KEY

### Cook Frontend (Vercel):
- [ ] VITE_API_BASE_URL
- [ ] VITE_CUSTOMER_URL
- [ ] VITE_CLOUDINARY_CLOUD_NAME
- [ ] VITE_CLOUDINARY_UPLOAD_PRESET
- [ ] GROQ_API_KEY
- [ ] VITE_STRIPE_PUBLISHABLE_KEY

### Admin Frontend (Vercel):
- [ ] VITE_API_BASE_URL

---

## 🎉 Deployment Complete!

Your HomelyMeals platform is now live! 

**Your URLs:**
- Customer: `https://your-customer-app.vercel.app`
- Cook: `https://your-cook-app.vercel.app`
- Admin: `https://your-admin-app.vercel.app`
- Backend API: `https://your-backend.onrender.com`

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review deployment logs on Render/Vercel
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

**Last Updated**: January 2025
**Version**: 1.0.0
