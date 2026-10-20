# Bozza Avviso Migrazione Utenti Android v1.2.1 Preview (Feature Flag: OFF)

> **Stato Feature Flag**: `SHOW_MIGRATION_NOTICE = false` (Disattivato).  
> **Destinazione**: Bozza interna per eventuale banner o modale web/app se autorizzato dall'operatore.

---

## Contesto Tecnico
Le versioni preview distribuite in precedenza su canale Android non ufficiale erano compilate con `Android Debug Keystore` (`CN=Android Debug, O=Android, C=US`).  
I rilasci ufficiali di produzione (flavor `direct`) sono firmati con la chiave crittografica privata di release (`zeroday-direct`).  
A causa del vincolo di sicurezza del sistema operativo Android (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`), l'aggiornamento automatico in-place fallirà. È necessaria una reinstallazione pulita.

---

## Audit Dati Locali (Impatto Disinstallazione)

### ⚠️ Dati che andranno PERSI con la disinstallazione dell'applicazione:
1. **Modalità Ospite (Guest Mode)**:  
   Tutti i progressi degli utenti che hanno giocato senza effettuare l'accesso (`zeroday_guest_state_v1`: XP, livelli, moduli risolti, daily bounties, inventario locale) risiedono **esclusivamente in `localStorage`**. Vengono cancellati irrecuperabilmente con la disinstallazione.
2. **Sessioni Offline non sincronizzate**:  
   Eventuali match o progressi accumulati offline e rimasti memorizzati nel buffer (`zeroday_profile_cache_v2`) senza essere stati inviati al database remoto.
3. **Preferenze e Impostazioni Locali**:
   - Preferenze audio (`0xday_sound_muted`)
   - Tema visivo selezionato (`0x_arsenal_theme`)
   - Titolo operatore selezionato (`0x_arsenal_title`)
   - Lingua interfaccia (`0xday_language`)
   - Consenso cookie e telemetria locale (`0xday_cookie_consent_v1`)
4. **Sessione Attiva**:  
   Il token di sessione locale (`zeroday_database_session_v1`) viene cancellato. L'utente dovrà reinserire email e password o riautenticarsi via OAuth.

### ✅ Dati CONSERVATI (Solo per Account Registrati e Sincronizzati su Supabase):
- Punteggio ELO e statistiche PvP Arena
- Livello, XP complessivi e moduli completati sincronizzati
- Stato Licenza PRO (`is_pro`, chiave di riscatto)
- Inventario cosmetico registrato nel profilo remoto

---

## Testo Bozza (Senza date e con avvisi precisi)

```html
<div class="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-xl my-4 text-zinc-200">
  <div class="flex items-center gap-2 font-mono font-bold text-amber-400 text-sm mb-1">
    <span>⚠️ AGGIORNAMENTO ANDROID — REINSTALLAZIONE NECESSARIA</span>
  </div>
  <p class="text-xs text-zinc-300 leading-relaxed font-sans">
    È disponibile la nuova versione ufficiale di ZeroDay firmata con il canale di produzione.  
    A causa del cambio della chiave di firma crittografica, i dispositivi con versioni preview precedenti devono essere aggiornati manualmente:
  </p>
  <ul class="list-disc list-inside text-xs text-zinc-300 mt-2 space-y-1 font-mono">
    <li><strong>Importante:</strong> Se hai giocato come ospite, effettua l'accesso o registra un account prima di disinstallare, altrimenti i progressi locali andranno persi.</li>
    <li><strong>Disinstalla</strong> la versione precedente di ZeroDay dal tuo dispositivo.</li>
    <li><strong>Scarica e installa</strong> il nuovo pacchetto ufficiale dal portale.</li>
    <li><strong>Accedi</strong> con le tue credenziali: i dati sincronizzati nel cloud (ELO, PRO, progressi) verranno ripristinati.</li>
  </ul>
</div>
```
