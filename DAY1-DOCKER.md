# Day 1 - Run KEYbooks with Docker

1. Open Docker Desktop and wait for "Engine running".
2. In the project root (the folder with docker-compose.yml):
       docker compose up --build
   First run takes a few minutes (downloads Node and Postgres images).
3. Open http://localhost:3000  (API health check: http://localhost:5000/health)
4. Stop: Ctrl+C. Stop and keep data: docker compose down. Wipe the database too: docker compose down -v

Useful commands
  docker compose ps                  what is running
  docker compose logs -f backend     live backend logs
  docker compose up --build backend  rebuild after a code change

Optional: copy .env.docker.example to .env to set your own DB password / JWT secret.
