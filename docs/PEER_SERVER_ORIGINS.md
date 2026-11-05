# [OBSOLETO] Configurazione Origini CORS del Server PeerJS (Duelli PvP)

> [!WARNING]
> **STATO: OBSOLETO / NON IN USO**
> Nessun server PeerJS proprietario o VPS è attivo in produzione. Il bundle client di produzione si connette direttamente al cloud pubblico PeerJS (`0.peerjs.com`) con relay STUN/TURN standard (`eu-0.turn.peerjs.com`, `us-0.turn.peerjs.com`).
> I file di configurazione presenti nella cartella `deploy/` (`Caddyfile`, `docker-compose.yml`, `Dockerfile.peerserver`, `nginx-peerjs.conf`, `provision_vps.sh`, `provision_vps.sh.sha256`) sono inutilizzati e conservati esclusivamente a titolo di documentazione storica / archivio.

---

## 1. Valore da impostare per `PEER_ALLOW_ORIGIN` (Inutilizzato)

Nel file `.env` del deployment su VPS (tipicamente in `/opt/zeroday-peer/deploy/.env` o `$APP_DIR/deploy/.env`):

```bash
PEER_ALLOW_ORIGIN=https://localhost,https://pwnify.xyz,https://www.pwnify.xyz,https://zeroday-app.vercel.app
```

### Dettaglio origini autorizzate:
- `https://localhost`: WebView nativa Android compilata con Capacitor (`server.androidScheme = 'https'`).
- `https://pwnify.xyz`: Dominio primario di produzione dell'applicazione.
- `https://www.pwnify.xyz`: Host di reindirizzamento/alias.
- `https://zeroday-app.vercel.app`: URL di deployment live Vercel.

---

## 2. Procedura di applicazione e riavvio su VPS (Archivio)

1. **Accesso SSH al server:**
   ```bash
   ssh root@<IP_VPS>
   ```

2. **Aggiornamento del file di configurazione ambiente:**
   ```bash
   cd /opt/zeroday-peer/deploy
   sed -i 's|^PEER_ALLOW_ORIGIN=.*|PEER_ALLOW_ORIGIN=https://localhost,https://pwnify.xyz,https://www.pwnify.xyz,https://zeroday-app.vercel.app|' .env
   ```

3. **Riavvio dello stack Docker con Caddy:**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

4. **Verifica dello stato e dei log del daemon:**
   ```bash
   docker logs zeroday-peerserver --tail 50
   ```

5. **Test delle chiamate preflight CORS:**
   ```bash
   curl -I -X OPTIONS "https://peer.zeroday.gg/peerjs/id" \
     -H "Origin: https://localhost" \
     -H "Access-Control-Request-Method: GET"
   ```
