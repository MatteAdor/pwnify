# Configurazione Origini CORS del Server PeerJS (Duelli PvP)

Questo documento descrive la configurazione e la procedura per autorizzare le origini del client (Web, Vercel e Android WebView nativo) sul daemon di segnalazione WebRTC PeerServer ospitato su VPS.

---

## 1. Valore da impostare per `PEER_ALLOW_ORIGIN`

Nel file `.env` del deployment su VPS (tipicamente in `/opt/zeroday-peer/deploy/.env` o `$APP_DIR/deploy/.env`):

```bash
PEER_ALLOW_ORIGIN=https://localhost,https://pwnify.xyz,https://www.pwnify.xyz,https://zeroday-app.vercel.app,https://zeroday.gg
```

### Dettaglio origini autorizzate:
- `https://localhost`: WebView nativa Android compilata con Capacitor (`server.androidScheme = 'https'`). Senza questa origine, i duelli PvP nell'APK falliscono.
- `https://pwnify.xyz`: Dominio primario di produzione dell'applicazione.
- `https://www.pwnify.xyz`: Host di reindirizzamento/alias.
- `https://zeroday-app.vercel.app`: URL di deployment live Vercel.
- `https://zeroday.gg`: Dominio legacy / backup.

---

## 2. Procedura di applicazione e riavvio su VPS

1. **Accesso SSH al server:**
   ```bash
   ssh root@<IP_VPS>
   ```

2. **Aggiornamento del file di configurazione ambiente:**
   ```bash
   cd /opt/zeroday-peer/deploy
   # Modificare o inserire la variabile nel file .env
   sed -i 's|^PEER_ALLOW_ORIGIN=.*|PEER_ALLOW_ORIGIN=https://localhost,https://pwnify.xyz,https://www.pwnify.xyz,https://zeroday-app.vercel.app,https://zeroday.gg|' .env
   ```

3. **Riavvio dello stack Docker con Caddy:**
   ```bash
   docker compose down
   docker compose up -d --build
   # Oppure se gestito via systemd:
   # systemctl restart zeroday-peerserver
   ```

4. **Verifica dello stato e dei log del daemon:**
   ```bash
   docker logs zeroday-peerserver --tail 50
   ```
   L'output di avvio deve confermare:
   ```
   [ZeroDay PeerServer] Daemon listening on port 9000
   [ZeroDay PeerServer] Signaling Path: /peerjs | Key: zeroday-pvp
   [ZeroDay PeerServer] Allowed Origin: https://localhost,https://pwnify.xyz,https://www.pwnify.xyz,https://zeroday-app.vercel.app,https://zeroday.gg
   ```

---

## 3. Verifica delle intestazioni CORS

### Da Terminale (curl)

1. **Test origine autorizzata (`pwnify.xyz`):**
   ```bash
   curl -I -X OPTIONS "https://peer.zeroday.gg/peerjs/id" \
     -H "Origin: https://pwnify.xyz" \
     -H "Access-Control-Request-Method: GET"
   ```
   *Risultato atteso:* intestazione `access-control-allow-origin: https://pwnify.xyz`.

2. **Test origine WebView Android (`https://localhost`):**
   ```bash
   curl -I -X OPTIONS "https://peer.zeroday.gg/peerjs/id" \
     -H "Origin: https://localhost" \
     -H "Access-Control-Request-Method: GET"
   ```
   *Risultato atteso:* intestazione `access-control-allow-origin: https://localhost`.

3. **Test origine non autorizzata (`https://evil.example`):**
   ```bash
   curl -I -X OPTIONS "https://peer.zeroday.gg/peerjs/id" \
     -H "Origin: https://evil.example" \
     -H "Access-Control-Request-Method: GET"
   ```
   *Risultato atteso:* l'intestazione `access-control-allow-origin` è assente o rifiutata con stato 403.

### Dalla Console / DevTools del Browser
1. Aprire l'app da `https://pwnify.xyz` o dall'emulatore Android.
2. Aprire gli strumenti di sviluppo (tasto `F12`) $\to$ pannello **Network**.
3. Filtrare per `peerjs`.
4. Cliccare sulla chiamata HTTP `/peerjs/id` o sull'handshake WebSocket `wss://peer.zeroday.gg/peerjs?key=zeroday-pvp...`.
5. Nella scheda **Response Headers**, verificare la presenza di:
   `access-control-allow-origin: https://pwnify.xyz` (o `https://localhost` per Android).

---

## 4. Host dei Duelli utilizzato dal Client (Codice Sorgente)

Il client risolve l'host del server PeerJS runtime nei seguenti punti del codice:

- **`src/utils/multiplayerEngine.ts`** (righe 78–82):
  ```typescript
  const host = env.VITE_PEER_HOST || undefined;
  const port = env.VITE_PEER_PORT ? Number(env.VITE_PEER_PORT) : undefined;
  const path = env.VITE_PEER_PATH || (host ? '/peerjs' : undefined);
  const key = env.VITE_PEER_KEY || (host ? 'zeroday-pvp' : 'peerjs');
  const secure = env.VITE_PEER_SECURE === 'true' || (typeof window !== 'undefined' && window.location.protocol === 'https:');
  ```
- **`src/utils/rankedController.ts`** (righe 94–98):
  Configurazione speculare per i match classificati 1v1 Ranked (ELO).

Se `VITE_PEER_HOST` non è specificato nel file `.env`, il client ripiega sul cloud pubblico di PeerJS (`0.peerjs.com`). Nel file `.env.example` (riga 20) il valore di default per l'infrastruttura proprietaria è impostato a:
```
VITE_PEER_HOST=peer.zeroday.gg
```
