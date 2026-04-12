# Schafkopf Online

Dockerfähige Webanwendung für Schafkopf mit Lobby, Browser-Frontend, WebSocket-Echtzeitspiel und zuschaltbaren Bots.

## Lokal starten

```bash
docker compose up --build
```

Frontend: `http://localhost:3000`  
Server: `http://localhost:3001`

## Produktion auf Ubuntu

Dieses Projekt ist jetzt für Traefik auf `https://schafkopf.argumentit.de` vorbereitet.

Voraussetzungen:
- Docker und Docker Compose auf dem Server
- laufender Traefik im externen Docker-Netz `traefik`
- DNS-Eintrag `schafkopf.argumentit.de` zeigt auf den Server

Manueller Server-Deploy:

```bash
rsync -az --delete --exclude '.git' --exclude 'node_modules' --exclude 'dist' \
  --exclude 'apps/*/dist' --exclude 'packages/*/dist' --exclude '*.tsbuildinfo' \
  ./ root@SERVER:/opt/schafkopf/

ssh root@SERVER 'cd /opt/schafkopf && docker compose -f docker-compose.prod.yml up -d --build'
```

Bequemer lokaler Deploy:

```bash
chmod +x deploy/deploy-prod.sh
SSHPASS='DEIN_PASSWORT' ./deploy/deploy-prod.sh
```

Konfigurierbare Variablen für das Skript:

```bash
DEPLOY_HOST=87.106.230.244
DEPLOY_USER=root
DEPLOY_PATH=/opt/schafkopf
COMPOSE_FILE=docker-compose.prod.yml
```

Wichtige Produktionsdateien:
- `docker-compose.prod.yml`
- `deploy/deploy-prod.sh`
- `deploy/traefik/docker-compose.yml`

Nach dem Deploy prüfen:

```bash
curl -I https://schafkopf.argumentit.de
curl https://schafkopf.argumentit.de/health
```
