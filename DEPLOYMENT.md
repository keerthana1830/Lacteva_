# LACTEVA Dashboard Deployment Guide

This guide covers deploying the LACTEVA Milk Quality Intelligence Dashboard to production.

## Architecture Overview

- **Frontend**: Next.js 14 dashboard deployed on Vercel
- **Backend**: Next.js API routes (serverless functions)
- **ML Service**: FastAPI service deployed on Render
- **Database**: MongoDB Atlas (cloud)
- **File Storage**: Vercel blob storage (optional)

## Prerequisites

1. **Accounts Required**:
   - Vercel account (for frontend deployment)
   - Render account (for ML service)
   - MongoDB Atlas account (for database)
   - GitHub account (for code repository)

2. **Local Development Tools**:
   - Node.js 18+
   - Python 3.11+
   - Git
   - Docker (optional)

## Database Setup (MongoDB Atlas)

### 1. Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new project: "LACTEVA"
3. Create a new cluster (M0 free tier is sufficient for testing)
4. Configure network access (allow your IP or 0.0.0.0/0 for development)
5. Create database user with read/write permissions

### 2. Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with "lacteva"

Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lacteva?retryWrites=true&w=majority`

## ML Service Deployment (Render)

### 1. Prepare ML Service

```bash
cd ml-service
pip install -r requirements.txt
python -c "from main import create_fallback_models; create_fallback_models()"
```

### 2. Deploy to Render

1. Push code to GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure service:
   - **Name**: lacteva-ml-service
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Starter ($7/month)

6. Add environment variables:
   - `PYTHON_VERSION`: 3.11.0
   - `PORT`: 8000

7. Deploy and note the service URL (e.g., `https://lacteva-ml-service.onrender.com`)

## Frontend Deployment (Vercel)

### 1. Prepare Environment Variables

Create these environment variables in Vercel:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lacteva
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ML_SERVICE_URL=https://lacteva-ml-service.onrender.com
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

#### Option B: GitHub Integration

1. Push code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

6. Add environment variables in Vercel dashboard
7. Deploy

## Local Development Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd lacteva-dashboard
```

### 2. Install Dependencies

```bash
# Frontend dependencies
npm install

# ML service dependencies
cd ml-service
pip install -r requirements.txt
cd ..
```

### 3. Environment Configuration

Create `.env.local`:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lacteva
JWT_SECRET=your-local-jwt-secret-min-32-chars
ML_SERVICE_URL=http://localhost:8000
NEXTAUTH_SECRET=your-local-nextauth-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start Services

#### Terminal 1: ML Service
```bash
cd ml-service
python main.py
```

#### Terminal 2: Frontend
```bash
npm run dev
```

### 5. Initialize Database

Run the training script to create initial ML models:

```bash
cd notebooks
python milk_quality_ml_training.py
```

Generate sample data:

```bash
cd sample-data
python generate_sample_data.py
```

## Docker Deployment (Alternative)

### 1. Using Docker Compose

```bash
cd deployment
docker-compose up -d
```

This starts:
- MongoDB (localhost:27017)
- ML Service (localhost:8000)
- Dashboard (localhost:3000)
- Redis cache (localhost:6379)

### 2. Production Docker Setup

```bash
# Build production images
docker build -t lacteva-dashboard .
docker build -t lacteva-ml-service ./ml-service

# Run with production settings
docker run -d -p 3000:3000 --env-file .env.production lacteva-dashboard
docker run -d -p 8000:8000 lacteva-ml-service
```

## Testing the Deployment

### 1. Health Checks

```bash
# Test ML service
curl https://your-ml-service.onrender.com/health

# Test dashboard API
curl https://your-app.vercel.app/api/health
```

### 2. Upload Sample Data

```bash
# Use the sample data generator
cd sample-data
python generate_sample_data.py

# Upload via API
curl -X POST https://your-app.vercel.app/api/readings \
  -H "Content-Type: application/json" \
  -d @sample_reading.json
```

### 3. Test Mobile API

```bash
# Authenticate
curl -X POST https://your-app.vercel.app/api/mobile/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"tech@lacteva.com","deviceId":"LACTEVA_001"}'

# Submit sample (use token from auth response)
curl -X POST https://your-app.vercel.app/api/mobile/sample \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"LACTEVA_001","reading":{...}}'
```

## Monitoring and Maintenance

### 1. Application Monitoring

- **Vercel**: Built-in analytics and error tracking
- **Render**: Service logs and metrics
- **MongoDB Atlas**: Database monitoring

### 2. ML Model Updates

To update ML models:

```bash
# Retrain models locally
cd notebooks
python milk_quality_ml_training.py

# Upload new models to ML service
curl -X POST https://your-ml-service.onrender.com/train \
  -H "Content-Type: application/json" \
  -d @training_data.json
```

### 3. Database Backups

MongoDB Atlas provides automatic backups. For manual backups:

```bash
mongodump --uri="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lacteva"
```

## Security Considerations

### 1. Environment Variables

- Use strong, unique secrets for JWT_SECRET and NEXTAUTH_SECRET
- Rotate secrets regularly
- Never commit secrets to version control

### 2. Database Security

- Use MongoDB Atlas IP whitelist
- Enable database authentication
- Use connection string with SSL

### 3. API Security

- Implement rate limiting
- Validate all inputs
- Use HTTPS only
- Implement proper CORS policies

## Scaling Considerations

### 1. Database Scaling

- MongoDB Atlas auto-scaling
- Consider read replicas for high read loads
- Implement database indexing optimization

### 2. ML Service Scaling

- Render auto-scaling based on CPU/memory
- Consider caching predictions for identical inputs
- Implement model versioning

### 3. Frontend Scaling

- Vercel Edge Network provides global CDN
- Implement client-side caching
- Use Next.js ISR for static content

## Troubleshooting

### Common Issues

1. **ML Service Connection Errors**
   - Check ML_SERVICE_URL environment variable
   - Verify Render service is running
   - Check network connectivity

2. **Database Connection Issues**
   - Verify MongoDB Atlas connection string
   - Check IP whitelist settings
   - Confirm database user permissions

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs for specific errors

### Debug Commands

```bash
# Check service health
curl -f https://your-ml-service.onrender.com/health
curl -f https://your-app.vercel.app/api/health

# View logs
vercel logs
# or check Render dashboard for ML service logs

# Test database connection
mongosh "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lacteva"
```

## Support

For deployment issues:

1. Check the GitHub repository issues
2. Review Vercel and Render documentation
3. Contact the development team

## Next Steps

After successful deployment:

1. Set up monitoring and alerting
2. Configure automated backups
3. Implement CI/CD pipeline
4. Set up staging environment
5. Plan for mobile app integration