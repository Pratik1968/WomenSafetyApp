# WomenSafty

A women safety application, organized as a monorepo.

## Structure

```
README.md
docs/                       # design docs, specs, diagrams
frontend/                   # Expo (SDK 57) + TypeScript mobile app
backend/                    # microservices
  authentication-service/
  user-service/
  emergency-service/
  gps-service/
  notification-service/
  ai-service/
database/                   # schema, migrations, seeds
deployment/
  docker/                   # Dockerfiles, docker-compose
  kubernetes/               # k8s manifests
.github/                    # CI workflows
tests/                      # cross-service / integration tests
```

## Frontend

```bash
cd frontend
npm install
npm start        # expo start
npm test         # jest
```

See `frontend/AGENTS.md` for Expo version notes.
