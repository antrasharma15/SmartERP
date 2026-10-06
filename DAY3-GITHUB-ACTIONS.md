# Day 3 - CI/CD with GitHub Actions + GitHub Container Registry

1. Put the new files in your project (keep the folder structure), then push everything:
       git add .
       git commit -m "Add Docker, Nginx load balancer and CI/CD pipeline"
       git push
   (Your .env is git-ignored, so your secrets are not uploaded. Check with: git status)

2. Open your repo on GitHub > Actions tab > "CI/CD". You will see two jobs:
   Test (about 1-2 min), then "Build and push images" for backend and frontend.

3. When it is green, your images are at: github.com/<your-username> > Packages
   (keybooks-backend and keybooks-frontend). They are private by default, which is fine.

4. Demo it: change any text in the app, commit and push, and watch a new pipeline run.

Pull and run a published image on any machine:
   echo <github-token-with-read:packages> | docker login ghcr.io -u <your-username> --password-stdin
   docker pull ghcr.io/<your-username>/keybooks-backend:latest

If a job fails: click it, open the red step and read the last lines.
