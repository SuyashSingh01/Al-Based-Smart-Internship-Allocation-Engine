# PM Internship Matching System - Setup Guide

## Prerequisites

### Required Software:
- **Node.js**: v20.x or higher
- **Python**: 3.11 or higher
- **Docker**: Latest version
- **Docker Compose**: v2.x or higher
- **Git**: Latest version

### Optional:
- **PostgreSQL**: 15+ (if running without Docker)
- **Redis**: 7+ (if running without Docker)

## Quick Start (Docker - Recommended)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd nestproj
```

### 2. Environment Configuration
```bash
# Copy environment files
cp .env.example .env
cp ml-service/.env.example ml-service/.env

# Edit .env files with your configuration
# Update ML_SERVICE_API_KEY, JWT_SECRET, etc.
```

### 3. Start All Services
```bash
docker-compose up -d
```

### 4. Verify Services
```bash
# Check all containers are running
docker-compose ps

# ML Service health
curl http://localhost:8000/api/v1/health

# Backend health
curl http://localhost:3000/health

# Frontend
open http://localhost:4200
```

## Manual Setup (Development)

### Backend (NestJS)

#### 1. Install Dependencies
```bash
npm install
# or
yarn install
```

#### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pm_internship
REDIS_HOST=localhost
REDIS_PORT=6379
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_API_KEY=your-secret-api-key-here
JWT_SECRET=your-jwt-secret-here
PORT=3000
```

#### 3. Start Database
```bash
# Using Docker
docker run -d \
  --name pm-internship-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pm_internship \
  -p 5432:5432 \
  postgres:15-alpine

# Start Redis
docker run -d \
  --name pm-internship-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### 4. Run Migrations (if applicable)
```bash
npm run typeorm migration:run
```

#### 5. Start Backend
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### ML Service (Python/FastAPI)

#### 1. Create Virtual Environment
```bash
cd ml-service
python -m venv venv

# Activate
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

#### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
ML_SERVICE_HOST=0.0.0.0
ML_SERVICE_PORT=8000
REDIS_HOST=localhost
REDIS_PORT=6379
API_KEY=your-secret-api-key-here
MODEL_PATH=./models
LOG_LEVEL=INFO
```

#### 4. Start ML Service
```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend (Next.js)

#### 1. Install Dependencies
```bash
cd frontend
npm install
```

#### 2. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/graphql
```

#### 3. Start Frontend
```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

## Database Setup

### PostgreSQL Schema

The database schema will be automatically created by TypeORM migrations. If you need to manually create:

```sql
CREATE DATABASE pm_internship;

-- Tables will be created by migrations
```

### Sample Data (Optional)

```bash
# Run seed script (if available)
npm run seed
```

## Testing the System

### 1. Access Services

- **Frontend**: http://localhost:4200
- **Backend GraphQL**: http://localhost:3000/graphql
- **ML Service Docs**: http://localhost:8000/docs

### 2. Test ML Service

```bash
curl -X POST http://localhost:8000/api/v1/matching/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here" \
  -d '{
    "students": [{
      "student_id": "S001",
      "name": "Test Student",
      "skills": ["Python", "Machine Learning"],
      "qualification": "UNDERGRADUATE",
      "field_of_study": "Computer Science",
      "cgpa": 8.5,
      "location_preference": ["Delhi"],
      "sector_interests": ["Technology"],
      "social_category": "GENERAL",
      "district_type": "URBAN",
      "past_internships": 0
    }],
    "internships": [{
      "internship_id": "I001",
      "company_name": "Tech Corp",
      "title": "ML Intern",
      "description": "ML internship",
      "required_skills": ["Python", "Machine Learning"],
      "preferred_qualification": "UNDERGRADUATE",
      "sector": "Technology",
      "location": "Delhi",
      "duration_months": 6,
      "capacity": 5,
      "filled_positions": 0,
      "min_cgpa": 7.0
    }],
    "diversity_boost": true,
    "max_matches_per_student": 10,
    "min_score_threshold": 0.5
  }'
```

### 3. Test GraphQL API

Visit http://localhost:3000/graphql and run:

```graphql
query {
  checkMLServiceHealth
}
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
# Windows
netstat -ano | findstr :3000
# Linux/Mac
lsof -i :3000

# Kill process
# Windows
taskkill /PID <PID> /F
# Linux/Mac
kill -9 <PID>
```

#### 2. Docker Issues
```bash
# Reset Docker
docker-compose down -v
docker-compose up --build

# View logs
docker-compose logs -f ml-service
docker-compose logs -f backend
```

#### 3. ML Model Download Issues
```bash
# Manually download model
cd ml-service
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

#### 4. Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d pm_internship
```

#### 5. Missing Dependencies
```bash
# Backend
rm -rf node_modules package-lock.json
npm install

# ML Service
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

## Production Deployment

### 1. Build Images
```bash
docker-compose -f docker-compose.prod.yml build
```

### 2. Configure Production Environment
```bash
# Update production .env with secure values
# - Strong JWT_SECRET
# - Secure database passwords
# - Production API keys
```

### 3. Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Setup SSL/TLS
```bash
# Use nginx reverse proxy with Let's Encrypt
# Configure in docker/nginx/nginx.conf
```

### 5. Monitoring
```bash
# View logs
docker-compose logs -f

# Monitor resources
docker stats
```

## Development Workflow

### 1. Code Changes
```bash
# Backend changes auto-reload in dev mode
# ML service auto-reloads with --reload flag
# Frontend auto-reloads with npm run dev
```

### 2. Running Tests
```bash
# Backend
npm run test
npm run test:e2e

# ML Service
cd ml-service
pytest tests/
```

### 3. Linting
```bash
# Backend
npm run lint

# Frontend
cd frontend
npm run lint
```

## Next Steps

1. **Add Sample Data**: Create students and internships
2. **Run Matching**: Test the AI matching engine
3. **View Analytics**: Check the analytics dashboard
4. **Customize**: Adjust weights and thresholds in ML service config
5. **Scale**: Add more ML service instances for higher load

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review documentation: `ARCHITECTURE.md`
- Check API docs: http://localhost:8000/docs

## Security Checklist

- [ ] Changed default API keys
- [ ] Updated JWT secret
- [ ] Configured CORS properly
- [ ] Enabled HTTPS in production
- [ ] Set up database backups
- [ ] Configured firewall rules
- [ ] Enabled rate limiting
- [ ] Set up monitoring/alerting
