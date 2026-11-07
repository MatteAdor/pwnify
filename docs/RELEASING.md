# Pwnify Android & Production Release Guide

## 1. Release Build Configuration & R8 Policy

In `android/app/build.gradle`:
```groovy
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        shrinkResources false
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### R8 Policy Notice
> **IMPORTANTE**: `minifyEnabled` e `shrinkResources` sono stati impostati su `false` per la prima release di prova.
> 
> **Regola tassativa**: Riattivare R8 (`minifyEnabled true`, `shrinkResources true`) **esclusivamente DOPO** aver completato il collaudo su dispositivo fisico Android (`phone_test.md`) e verificato tramite `adb logcat -s Capacitor com.pwnify.app` l'assenza totale di:
> - `ClassNotFoundException` sui plugin registrati (`DirectUpdatePlugin`, `@capacitor/app`, `@capacitor/browser`, `@capacitor-community/app-update`).
> - `NoSuchMethodError` sui metodi decorati con `@PluginMethod`.
> - Problemi di deserializzazione reflection per sessioni o modelli RASP.
> 
> Le regole keep sono già predisposte e collaudate in `android/app/proguard-rules.pro`.

---

## 2. On-Device Verification Checklist

Prima di abilitare l'ottimizzazione R8 e procedere alla distribuzione massiva su Google Play Store o canali direct APK:
1. **Installazione**: `adb install -r android/app/build/outputs/apk/release/app-release.apk`
2. **Avvio & Splash**: Verifica caricamento WebView e splashscreen nativo.
3. **Autenticazione**: Login OAuth con Google e GitHub (`com.pwnify.app://auth/callback`).
4. **Capacitor Bridges**: Verifica funzionalità in-app update (`DirectUpdatePlugin`) e browser esterno.
5. **P2P Duel**: Connessione WebRTC e scambio ICE server.
