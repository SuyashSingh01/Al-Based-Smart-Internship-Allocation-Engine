# PM Internship Matching System - Architecture Documentation

## System Overview

The PM Internship Matching System is a production-grade, AI/ML-powered platform designed to intelligently match students with internship opportunities while ensuring affirmative action compliance and optimal allocation.

## Architecture Components

### 1. **ML Service (Python/FastAPI)**
- **Technology**: Python 3.11, FastAPI, Sentence Transformers
- **Port**: 8000
- **Purpose**: Core AI/ML matching engine

#### Key Features:
- **Semantic Skill Matching**: Uses `all-MiniLM-L6-v2` transformer model for deep skill similarity
- **Multi-Factor Scoring Algorithm**:
  - Skills (35%): Semantic + direct overlap
  - Qualification (25%): Education level + CGPA
  - Location (15%): Preference matching
  - Sector (15%): Interest alignment
  - Diversity (10%): Affirmative action boost

#### Endpoints:
- `POST /api/v1/matching/batch`: Batch student-internship matching
- `POST /api/v1/matching/single`: Single student matching
- `POST /api/v1/matching/optimize`: Optimal allocation algorithm
- `POST /api/v1/analytics/generate`: Analytics generation
- `GET /api/v1/health`: Health check

### 2. **Backend Service (NestJS/GraphQL)**
- **Technology**: NestJS, GraphQL, TypeScript
- **Port**: 3000
- **Purpose**: API gateway, business logic, database operations

#### Modules:
- **Auth Module**: JWT-based authentication
- **Students Module**: Student profile management
- **Internships Module**: Internship opportunity management
- **Applications Module**: Application tracking
- **Matching Module**: Integration with ML service
- **Notifications Module**: Email/notification system

### 3. **Frontend (Next.js/React)**
- **Technology**: Next.js 14, React 18, TailwindCSS
- **Port**: 4200
- **Purpose**: User interface

#### Features:
- **AI Matching Dashboard**: Real-time matching visualization
- **Student Management**: Add/edit student profiles
- **Internship Management**: Create/manage opportunities
- **Analytics Dashboard**: Visual insights with charts
- **Responsive Design**: Mobile-first approach

### 4. **Infrastructure**
- **PostgreSQL**: Primary database
- **Redis**: Caching and session management
- **Docker**: Containerization
- **Docker Compose**: Orchestration

## Data Flow

```
User Request → Frontend (Next.js)
    ↓
GraphQL API (NestJS Backend)
    ↓
Matching Service (NestJS)
    ↓
ML Service (FastAPI) → AI/ML Processing
    ↓
Response with Match Scores
    ↓
Frontend Visualization
```

## Matching Algorithm

### Input:
- Student profiles with skills, qualifications, preferences
- Internship opportunities with requirements
- Configuration (diversity boost, thresholds)

### Process:
1. **Skill Encoding**: Convert skills to 384-dim embeddings
2. **Similarity Calculation**: Cosine similarity + overlap ratio
3. **Multi-Factor Scoring**: Weighted combination of all factors
4. **Diversity Boost**: Additional scoring for underrepresented groups
5. **Ranking**: Sort by overall score
6. **Filtering**: Apply minimum threshold

### Output:
- Ranked list of matches per student
- Detailed score breakdown
- Explanations for each factor

## Affirmative Action Implementation

### Diversity Factors:
1. **Social Category**: SC/ST/OBC boost (+0.2)
2. **District Type**: Rural/Aspirational boost (+0.2)
3. **First-Time Applicant**: No prior internships (+0.1)

### Configurable Weights:
All weights are configurable via environment variables for policy adjustments.

## Scalability Considerations

### Current Capacity:
- ~1000 matches/second
- Batch processing support
- Async operations

### Scaling Strategy:
1. **Horizontal Scaling**: Multiple ML service instances
2. **Caching**: Redis for frequent queries
3. **Database Optimization**: Indexing, connection pooling
4. **Load Balancing**: Nginx reverse proxy

## Security

### Authentication:
- JWT tokens for API access
- API key for ML service
- Role-based access control (RBAC)

### Data Protection:
- Environment variable secrets
- HTTPS/TLS encryption
- Input validation
- SQL injection prevention

## Deployment

### Development:
```bash
docker-compose up
```

### Production:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables:
- `DATABASE_URL`: PostgreSQL connection
- `ML_SERVICE_URL`: ML service endpoint
- `ML_SERVICE_API_KEY`: API authentication
- `JWT_SECRET`: Token signing key
- `REDIS_HOST`: Cache server

## Monitoring & Observability

### Metrics:
- Request latency
- Match success rate
- Model performance
- Error rates

### Logging:
- Structured logging (JSON)
- Log levels: DEBUG, INFO, WARN, ERROR
- Centralized log aggregation ready

## Future Enhancements

1. **Advanced ML Models**: 
   - Fine-tuned models for domain-specific matching
   - Collaborative filtering
   - Learning from historical placements

2. **Real-time Features**:
   - WebSocket notifications
   - Live dashboard updates

3. **Analytics**:
   - Predictive analytics
   - Success rate tracking
   - Diversity metrics reporting

4. **Integration**:
   - External job boards
   - University systems
   - Government databases

## Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| ML Service | Python/FastAPI | 3.11/0.109 |
| Backend | NestJS | 11.0 |
| Frontend | Next.js | 14.1 |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7 |
| ML Model | Sentence Transformers | 2.3.1 |
| Container | Docker | Latest |

## API Documentation

- **GraphQL Playground**: http://localhost:3000/graphql
- **ML Service Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:4200

## Support & Maintenance

### Health Checks:
- ML Service: `GET /api/v1/health`
- Backend: `GET /health`
- Database: Connection pool monitoring

### Backup Strategy:
- Daily PostgreSQL backups
- Model versioning
- Configuration snapshots
