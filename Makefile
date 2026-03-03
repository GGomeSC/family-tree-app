.PHONY: up down logs ps test smoke

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

test:
	docker compose exec backend python -m pytest -q

smoke:
	curl -s http://localhost:8000/health
