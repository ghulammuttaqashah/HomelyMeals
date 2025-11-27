# Cook Module Implementation

## Overview
Cook authentication and document upload flow built with React + Vite + Tailwind, following admin-ui patterns exactly.

## Flow
1. **Signup** → OTP verification → Auto-login → Upload Documents
2. **Login** → Check `verificationStatus`:
   - If `not_started` → Redirect to Upload Documents
   - Otherwise → Dashboard (coming soon)
3. **Upload Documents** → Submit required docs → Redirect to Login

## Backend Integration
- **Signup**: `POST /api/cook/signup/request` → `POST /api/cook/signup/verify`
- **Login**: `POST /api/cook/signin` (returns cook with `verificationStatus`)
- **Upload**: `POST /api/cook/documents/submit` (multipart/form-data)

## Required Documents
- CNIC Front (single image) *
- CNIC Back (single image) *
- Kitchen Photos (multiple images, min 1) *
- Optional Doc 1 (optional)
- Optional Doc 2 (optional)

## Features
- OTP-based signup with email verification
- Auto-login after OTP verification
- File upload with preview and remove functionality
- Submit button disabled until all required files present
- Sign Out button on upload page
- Cookie-based authentication (HTTP-only)
