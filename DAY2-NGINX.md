# Day 2 - Nginx load balancer with 3 backend copies

Start (your data is kept):
    docker compose down
    docker compose up -d --build
    docker compose ps            (you should see 3 backend containers + nginx)

The app still opens at http://localhost:3000. The API is now reached through Nginx on port 5000.

See the load balancing (PowerShell - use curl.exe, not curl):
    1..9 | ForEach-Object { curl.exe -s http://localhost:5000/whoami }
The "instance" value cycles through 3 different container ids.

Also visible in the browser: DevTools > Network > any /api request > Response Headers > X-Served-By.

Watch Nginx route requests live:
    docker compose logs -f nginx          (each line ends with served_by=<replica address>)

Failure test (fault tolerance):
    docker ps                             (copy one backend container name)
    docker stop <that-container-name>
    1..6 | ForEach-Object { curl.exe -s http://localhost:5000/whoami }     -> still answers from the other two
    docker start <that-container-name>

Scale up/down (elasticity):
    docker compose up -d --scale backend=5
    docker compose up -d --scale backend=2
After scaling, restart Nginx so it picks up the new addresses:  docker compose restart nginx
