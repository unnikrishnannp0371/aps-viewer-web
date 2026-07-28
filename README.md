# APS Viewer Web

Angular frontend for the APS Viewer application. Allows ACC (Autodesk Construction Cloud) users to browse their hubs, projects, folders and files, generate shareable links for 3D models, and let clients view those models without an Autodesk account.

## Related Repositories

| Repository | Description |
|---|---|
| [aps-viewer-api](https://github.com/unnikrishnannp0371/aps-viewer-api) | Ruby on Rails API backend |
| [aps-viewer-web](https://github.com/unnikrishnannp0371/aps-viewer-web) | This repo — Angular frontend |
| [aps-viewer-deploy](https://github.com/unnikrishnannp0371/aps-viewer-deploy) | Docker & deployment config |

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 21 | Frontend framework |
| TypeScript | latest | Language |
| Node.js | 22 | Runtime |
| Nginx | 1.27 | Static file server (production) |
| Docker | latest | Containerization |

---

## Prerequisites

### With Docker (recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Clone all three repos and follow setup in [aps-viewer-deploy](https://github.com/unnikrishnannp0371/aps-viewer-deploy)

### Without Docker
- Node.js 22+
- npm

---

## Running with Docker (Recommended)

Docker setup is managed from the deploy repository. Follow the setup guide there:

```bash
# Clone all three repos side by side
mkdir aps-viewer && cd aps-viewer
git clone https://github.com/unnikrishnannp0371/aps-viewer-api.git
git clone https://github.com/unnikrishnannp0371/aps-viewer-web.git
git clone https://github.com/unnikrishnannp0371/aps-viewer-deploy.git

# Follow setup instructions in deploy repo
cd aps-viewer-deploy
```

See [aps-viewer-deploy](https://github.com/unnikrishnannp0371/aps-viewer-deploy) for full Docker setup instructions.

---

## Running without Docker

**1. Clone the repo**
```bash
git clone https://github.com/unnikrishnannp0371/aps-viewer-web.git
cd aps-viewer-web
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure environment**

For local development, the app connects to the Rails API at `http://localhost:3000`.

Make sure the Rails API is running before starting the frontend.

**4. Start the development server**
```bash
ng serve
```

App runs on `http://localhost:4200`.

---

## Available Scripts

```bash
# Start development server
npm start
# or
ng serve

# Build for production
ng build --configuration production

# Run tests
ng test

# Run tests headless (CI)
ng test --watch=false --browsers=ChromeHeadless

# Lint
ng lint
```

---

## Project Structure

```
aps-viewer-web/
├── src/
│   ├── app/
│   │   ├── components/          ← Reusable UI components
│   │   ├── pages/               ← Route-level page components
│   │   │   ├── login/           ← Login page
│   │   │   ├── dashboard/       ← Main dashboard
│   │   │   └── viewer/          ← Public 3D model viewer
│   │   ├── services/            ← API communication services
│   │   ├── guards/              ← Route guards (auth)
│   │   └── app.routes.ts        ← Application routing
│   ├── environments/
│   │   ├── environment.ts       ← Development config
│   │   └── environment.prod.ts  ← Production config
│   └── index.html
├── Dockerfile                   ← Production Docker image (Nginx)
├── Dockerfile.dev               ← Development Docker image (ng serve)
└── nginx.conf                   ← Nginx config inside production container
```

---

## Key Features

- **Hub Browser** — Browse all ACC hubs the user has access to
- **Project Browser** — Navigate projects, folders and files
- **Share Link Generator** — Create shareable links for 3D models with expiry
- **Public Viewer** — View 3D models via share link without Autodesk account
- **Autodesk OAuth** — Secure 3-legged OAuth login flow

---

## Application Routes

| Route | Description | Auth Required |
|---|---|---|
| `/login` | Login page with Autodesk OAuth button | No |
| `/dashboard` | Main hub and project browser | Yes |
| `/viewer/:token` | Public 3D model viewer via share link | No |

---

## Docker Files

| File | Purpose |
|---|---|
| `Dockerfile` | Production image — builds Angular, serves via Nginx |
| `Dockerfile.dev` | Development image — runs `ng serve` with live reload |
| `nginx.conf` | Nginx config inside production container — handles SPA routing |

### How Production Build Works

```
Dockerfile (production)
    │
    ├── Stage 1 (builder)
    │   └── Node.js image
    │       └── npm ci
    │       └── ng build --configuration production
    │           └── outputs to dist/aps-viewer-web/browser/
    │
    └── Stage 2 (production)
        └── Nginx alpine image
            └── copies dist/ files
            └── serves on port 80
```

The production build:
- Compiles TypeScript to JavaScript
- Enables AOT (Ahead of Time) compilation
- Tree-shakes unused code
- Minifies and compresses output
- Outputs hashed filenames for cache busting

---

## Running Tests

```bash
# Without Docker
ng test

# Headless (for CI)
ng test --watch=false --browsers=ChromeHeadless

# With Docker
docker compose exec web npx ng test --watch=false --browsers=ChromeHeadless
```