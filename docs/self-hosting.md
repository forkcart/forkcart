# Self-Hosting Guide

Run ForkCart on your own server. Full control, no monthly fees, no vendor lock-in.

## Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| **Node.js** | 22+ | 22 LTS |
| **PostgreSQL** | 16 | 16+ |
| **pnpm** | 9+ | Latest |
| **RAM** | 1 GB | 2+ GB |
| **Disk** | 5 GB | 20+ GB (for media) |
| **OS** | Any Linux | Ubuntu 22.04 / Debian 12 |

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/forkcart/forkcart.git
cd forkcart

# 2. Install dependencies
npm install -g pnpm
pnpm install

# 3. Create and configure .env
cp .env.example .env
nano .env

# 4. Set up the database
sudo -u postgres createdb forkcart
sudo -u postgres psql -c "CREATE USER forkcart WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE forkcart TO forkcart;"

# 5. Run migrations
pnpm db:migrate

# 6. (Optional) Seed demo data
pnpm db:seed

# 7. Build for production
pnpm build
```

## Environment Variables

All configuration lives in `.env` at the project root.

### Database

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://forkcart:password@localhost:5432/forkcart` |

### API Server

| Variable | Description | Default |
|---|---|---|
| `API_PORT` | Port for the Hono API | `4000` |
| `API_HOST` | Bind address | `0.0.0.0` |
| `API_CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:3000,http://localhost:3001` |
| `SESSION_SECRET` | Secret for signing sessions/tokens (min 32 chars) | — |

### Frontend

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API URL for the admin panel | `https://api.yourstore.com` |
| `NEXT_PUBLIC_STOREFRONT_API_URL` | API URL for the storefront | `https://api.yourstore.com` |

### AI Providers (optional)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `ANTHROPIC_API_KEY` | Anthropic API key (alternative) |
| `OLLAMA_BASE_URL` | Ollama server URL for local AI (default: `http://localhost:11434`) |

### Stripe (optional)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_...`) |

### Media Storage

| Variable | Description | Default |
|---|---|---|
| `MEDIA_STORAGE_PATH` | Local directory for uploads | `./uploads` |
| `MEDIA_BASE_URL` | Public URL for media files | `http://localhost:4000/uploads` |

### Logging

| Variable | Description | Default |
|---|---|---|
| `LOG_LEVEL` | Log verbosity (`debug`, `info`, `warn`, `error`) | `info` |

## Production Build

```bash
# Build all packages
pnpm build

# Test that everything starts
node packages/api/dist/index.js &
cd packages/admin && npx next start --port 3001 &
cd packages/storefront && npx next start --port 3000 &
```

## Systemd Services

Create service files so ForkCart survives reboots and crashes.

### API Service

```ini
# /etc/systemd/system/forkcart-api.service
[Unit]
Description=ForkCart API
After=network.target postgresql.service

[Service]
Type=simple
User=forkcart
WorkingDirectory=/opt/forkcart
ExecStart=/usr/bin/node packages/api/dist/index.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/forkcart/.env

[Install]
WantedBy=multi-user.target
```

### Admin Panel Service

```ini
# /etc/systemd/system/forkcart-admin.service
[Unit]
Description=ForkCart Admin Panel
After=network.target forkcart-api.service

[Service]
Type=simple
User=forkcart
WorkingDirectory=/opt/forkcart/packages/admin
ExecStart=/usr/bin/npx next start --port 3001
Restart=always
RestartSec=5
EnvironmentFile=/opt/forkcart/.env

[Install]
WantedBy=multi-user.target
```

### Storefront Service

```ini
# /etc/systemd/system/forkcart-storefront.service
[Unit]
Description=ForkCart Storefront
After=network.target forkcart-api.service

[Service]
Type=simple
User=forkcart
WorkingDirectory=/opt/forkcart/packages/storefront
ExecStart=/usr/bin/npx next start --port 3000
Restart=always
RestartSec=5
EnvironmentFile=/opt/forkcart/.env

[Install]
WantedBy=multi-user.target
```

### Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable forkcart-api forkcart-admin forkcart-storefront
sudo systemctl start forkcart-api forkcart-admin forkcart-storefront

# Check status
sudo systemctl status forkcart-api
```

## Reverse Proxy

### Caddy (recommended)

Caddy handles SSL automatically via Let's Encrypt.

```caddyfile
# /etc/caddy/Caddyfile

yourstore.com {
    reverse_proxy localhost:3000
}

admin.yourstore.com {
    reverse_proxy localhost:3001
}

api.yourstore.com {
    reverse_proxy localhost:4000
}
```

```bash
sudo systemctl restart caddy
```

### Nginx

```nginx
# /etc/nginx/sites-available/forkcart

# Storefront
server {
    listen 80;
    server_name yourstore.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin
server {
    listen 80;
    server_name admin.yourstore.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# API
server {
    listen 80;
    server_name api.yourstore.com;

    client_max_body_size 50M;  # For file uploads

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/forkcart /etc/nginx/sites-enabled/
sudo certbot --nginx -d yourstore.com -d admin.yourstore.com -d api.yourstore.com
sudo systemctl restart nginx
```

## Backups

### Database

```bash
# Daily backup via cron
pg_dump -U forkcart forkcart | gzip > /backups/forkcart-$(date +%Y%m%d).sql.gz

# Restore
gunzip -c /backups/forkcart-20260312.sql.gz | psql -U forkcart forkcart
```

### Media Files

```bash
# Sync uploads to backup location
rsync -av /opt/forkcart/uploads/ /backups/forkcart-uploads/
```

### Crontab Example

```cron
# Daily DB backup at 3 AM
0 3 * * * pg_dump -U forkcart forkcart | gzip > /backups/forkcart-$(date +\%Y\%m\%d).sql.gz

# Weekly media backup on Sunday
0 4 * * 0 rsync -av /opt/forkcart/uploads/ /backups/forkcart-uploads/

# Keep only last 30 daily backups
0 5 * * * find /backups/ -name "forkcart-*.sql.gz" -mtime +30 -delete
```

## Updates

```bash
cd /opt/forkcart

# Pull latest
git pull origin master

# Install any new dependencies
pnpm install

# Run new migrations
pnpm db:migrate

# Rebuild
pnpm build

# Restart services
sudo systemctl restart forkcart-api forkcart-admin forkcart-storefront
```

**Tip:** Always check the [changelog](https://github.com/forkcart/forkcart/releases) before updating. Breaking changes will be clearly marked.

---

Need help? Open an issue or join our [Discord](https://discord.gg/forkcart). 🚀
