# Cube Clash - Render Deployment Guide

To deploy this application to Render:

1. **Create a New Web Service** on Render.
2. **Connect your GitHub/GitLab repository**.
3. **Configure the Service**:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `3000` (optional, Render provides this automatically)
   - `GEMINI_API_KEY`: (Add your key if AI features are implemented)

## Local Development
- Run `npm run dev` to start the Express + Vite dev server.
- The app will be available on `http://localhost:3000`.
