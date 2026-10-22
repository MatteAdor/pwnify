---
name: android-anticrack
description: >-
  Strict anti-cracking, anti-reverse-engineering, anti-hooking (Frida/LSPosed/Xposed),
  and anti-tampering hardening rules for Android applications. Covers aggressive R8
  obfuscation, RASP runtime protection (freeRASP/Talsec), zero-trust client audit,
  and hardcoded secret removal.
---

# Android Anti-Crack & Hardening Specification

## Overview

Modern Android reverse engineering tools (JADX-GUI, APKTool, Frida, Lucky Patcher, LSPosed, objection) allow attackers to decompile APKs, flip booleans in Smali bytecode, hook native/Java methods, bypass certificate pinning, and inject dynamic payloads.

This skill mandates defense-in-depth measures against repackaging, cracking, hooking, and secret extraction.

---

## 1. Zero-Trust Client Architecture

### 1.1 Never Trust Local State Unilaterally
- **Rule**: Never rely on unvalidated local flags (`isPro = true`, `isSubscribed`, `creditsCount`, `licenseKey`) stored in plain `SharedPreferences`, `localStorage`, SQLite, Room, or DataStore.
- **Attack Vector**: In Smali decompilation, an attacker alters `const/4 v0, 0x0` to `const/4 v0, 0x1` in `isPro()` or edits XML preferences using Lucky Patcher.
- **Defense**:
  1. Entitlements must be validated against a trusted backend server via authenticated sessions or cryptographically verified tokens (JWT / ECDSA signed license tokens with public key verification).
  2. For offline/hybrid capabilities, employ tamper-evident checksums or signature verification linked to the app's signing certificate and device identifier.
  3. Fail closed: If tampering or invalid state is detected, revoke capabilities immediately.

---

## 2. Zero Hardcoded Secrets & API Keys

### 2.1 No Secrets in Client Binaries
- **Rule**: Never hardcode production API keys, private keys, database passwords, webhook tokens, or payment gateways secrets in `.java`, `.kt`, `.xml`, `.properties`, `.js`, or assets.
- **Attack Vector**: Running `strings app.apk` or decompiling with JADX immediately reveals all plaintext string literals.
- **Defense**:
  1. Move sensitive operations (Stripe checkout initialization, database writes, proprietary algorithms) to backend APIs or Cloud Functions.
  2. Public client identifiers (e.g., Firebase Client ID, Google OAuth Web Client ID) must be restricted in Google Cloud Console / provider dashboards by package name (`com.zeroday.app`) and SHA-1/SHA-256 fingerprint.

---

## 3. Aggressive R8 / ProGuard Obfuscation & Log Stripping

### 3.1 Full-Mode R8
- Enable full R8 mode in `gradle.properties`:
  ```properties
  android.enableR8.fullMode=true
  ```
- Configure `release` build in `build.gradle` / `build.gradle.kts`:
  ```kotlin
  buildTypes {
      release {
          isMinifyEnabled = true
          isShrinkResources = true
          proguardFiles(
              getDefaultProguardFile("proguard-android-optimize.txt"),
              "proguard-rules.pro"
          )
      }
  }
  ```

### 3.2 Aggressive Rules in `proguard-rules.pro`
- **Class Repackaging & Name Obfuscation**:
  ```proguard
  -repackageclasses ''
  -allowaccessmodification
  ```
- **Complete Log Stripping in Release**:
  ```proguard
  -assumenosideeffects class android.util.Log {
      public static boolean isLoggable(java.lang.String, int);
      public static int v(...);
      public static int d(...);
      public static int i(...);
      public static int w(...);
      public static int e(...);
  }
  ```
- **Remove Source Lines & Attributes**:
  ```proguard
  -renamesourcefileattribute SourceFile
  -keepattributes SourceFile,LineNumberTable
  ```

---

## 4. Runtime Application Self-Protection (RASP)

### 4.1 Talsec freeRASP Community Integration
- Add Talsec Maven repository and community dependency:
  ```groovy
  repositories {
      maven { url "https://europe-west3-maven.pkg.dev/talsec-artifact-repository/freerasp" }
  }
  dependencies {
      implementation 'com.aheaditec.talsec.security:TalsecSecurity-Community:7.0.0'
  }
  ```
- Initialize in custom `Application.onCreate()`:
  - Verify app signing certificate SHA-256 fingerprint against expected production keystore.
  - Implement threat listeners for:
    - `onRootDetected`: Device is rooted (Magisk, KernelSU, SuperSU).
    - `onDebuggerDetected`: JDWP or native gdb attached.
    - `onEmulatorDetected`: Running in analysis sandbox/emulator.
    - `onTampered`: Repackaged or resign-injected APK (Lucky Patcher, APKTool).
    - `onHookDetected`: Frida, LSPosed, Substrate, or SandHook active.
    - `onDeviceBindingDetected`: App cloned or cloned runtime environment.
    - `onUntrustedInstallationSource`: Sideloaded outside official distribution.
- **Fail-Secure Reaction**:
  - In `release` builds (`!BuildConfig.DEBUG`), terminate execution immediately (`android.os.Process.killProcess(android.os.Process.myPid())` or exit(1)) or route to a permanent lockout state.

---

## 5. Network & Manifest Hardening

### 5.1 AndroidManifest.xml
- `android:allowBackup="false"` (blocks adb backup data extraction).
- `android:fullBackupContent="false"`
- Explicit `android:exported="false"` on all components without intent-filters.
- No `android:debuggable="true"` in release.

### 5.2 Network Security Config (`res/xml/network_security_config.xml`)
- `cleartextTrafficPermitted="false"` (strictly no HTTP).
- Certificate pinning template for production domains (`<pin digest="SHA-256">...`).
