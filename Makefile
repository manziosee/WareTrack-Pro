# WareTrack-Pro Docker Management

.PHONY: help dev prod build clean logs test

help: ## Show this help message
	@echo "WareTrack-Pro Docker Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	docker-compose up -d
	@echo "Development environment started at:"
	@echo "Frontend: http://localhost:3001"
	@echo "Backend: http://localhost:5000"
	@echo "API Docs: http://localhost:5000/api-docs"

prod: ## Start production environment
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production environment started at:"
	@echo "Application: http://localhost"

build: ## Build all images
	docker-compose build --no-cache

build-prod: ## Build production images
	docker-compose -f docker-compose.prod.yml build --no-cache

stop: ## Stop all services
	docker-compose down
	docker-compose -f docker-compose.prod.yml down

clean: ## Clean up containers, images, and volumes
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.prod.yml down -v --remove-orphans
	docker system prune -f

logs: ## Show logs for all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

test: ## Run tests
	docker-compose exec backend npm test
	docker-compose exec frontend npm test

migrate: ## Run database migrations
	docker-compose exec backend npx prisma migrate deploy

seed: ## Seed database with sample data
	docker-compose exec backend npx prisma db seed

reset-db: ## Reset database (WARNING: destroys all data)
	docker-compose exec backend npx prisma migrate reset --force

health: ## Check service health
	@echo "Checking service health..."
	@curl -f http://localhost:5000/health || echo "Backend unhealthy"
	@curl -f http://localhost:3001 || echo "Frontend unhealthy"