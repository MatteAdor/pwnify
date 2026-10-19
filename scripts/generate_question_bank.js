import fs from 'node:fs';
import path from 'node:path';

const questions = [
  // --- 1. REVERSE ENGINEERING ---
  {
    category: "Reverse Engineering",
    question: "Which register holds the return value of a 64-bit integer function under System V AMD64 ABI?",
    code_snippet: "mov eax, 1\nret",
    options: ["rax", "rcx", "rdi", "rsi"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "Under the Microsoft x64 calling convention, what is the size of the shadow stack space allocated by the caller?",
    code_snippet: "sub rsp, 28h\ncall target",
    options: ["16 bytes", "32 bytes", "40 bytes", "64 bytes"],
    correct_index: 1,
    difficulty: "medium"
  },
  {
    category: "Reverse Engineering",
    question: "What instruction sequence replaces 'leave' in 32-bit x86 function epilogues?",
    code_snippet: "mov esp, ebp\npop ebp",
    options: ["mov esp, ebp; pop ebp", "sub esp, 4; push ebp", "xor esp, ebp; ret", "mov ebp, esp; pop esp"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "Which field in the PE IMAGE_NT_HEADERS points to the Export Address Table (EAT)?",
    code_snippet: "pNtHeaders->OptionalHeader.DataDirectory[?]",
    options: ["DataDirectory[0]", "DataDirectory[1]", "DataDirectory[2]", "DataDirectory[12]"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Reverse Engineering",
    question: "In an ELF binary, which section header contains strings for function and variable symbols?",
    code_snippet: "readelf -S binary | grep str",
    options: [".strtab", ".shstrtab", ".dynstr", ".rodata"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Reverse Engineering",
    question: "What ARM instruction loads the Program Counter (PC) to execute an indirect branch to a subroutine in register r3?",
    code_snippet: "blx r3",
    options: ["blx r3", "ldr pc, [r3]", "mov pc, lr", "svc #0"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Reverse Engineering",
    question: "Which API is commonly hooked in user-mode to detect the presence of a debugger via the PEB BeingDebugged flag?",
    code_snippet: "mov rax, gs:[60h]\nmovzx eax, byte ptr [rax+2]",
    options: ["IsDebuggerPresent", "CheckRemoteDebuggerPresent", "OutputDebugStringA", "NtQueryInformationProcess"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "In IDA Pro / Ghidra, what does the prefix 'loc_' indicate in disassembly?",
    code_snippet: "loc_401020: jmp loc_401050",
    options: ["A jump target within the current function", "A global exported variable", "An external DLL import", "A vtable method pointer"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "What opcode sequence corresponds to the x86 instruction 'NOP'?",
    code_snippet: "90",
    options: ["0x90", "0xCC", "0xC3", "0xFF"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "Which x86 software interrupt instruction is commonly used as a software breakpoint by debuggers?",
    code_snippet: "int 3",
    options: ["0xCC (int 3)", "0xCD 0x80", "0x0F 0x05", "0xCE"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "What Windows structure contains pointers to loaded module lists (InLoadOrderModuleList)?",
    code_snippet: "PEB->Ldr",
    options: ["PEB_LDR_DATA", "TEB", "KPROCESS", "IMAGE_DOS_HEADER"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Reverse Engineering",
    question: "In x86 assembly, which instruction decrements the ECX register and jumps if ECX != 0?",
    code_snippet: "loop label",
    options: ["loop", "jecxz", "rep", "dec"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "In 64-bit Windows, which segment register points to the Thread Environment Block (TEB)?",
    code_snippet: "mov rax, ??:[30h]",
    options: ["GS", "FS", "CS", "DS"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Reverse Engineering",
    question: "In 32-bit Windows, which segment register points to the TEB?",
    code_snippet: "mov eax, fs:[18h]",
    options: ["FS", "GS", "ES", "SS"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "What does the x86 instruction 'cld' accomplish?",
    code_snippet: "cld\nrep movsb",
    options: ["Clears the Direction Flag (DF=0, autoincrement)", "Sets Direction Flag to autodecrement", "Clears Interrupt Flag", "Clears Carry Flag"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "What calling convention passes parameters in ECX and EDX and cleans the stack in the callee?",
    code_snippet: "__fastcall",
    options: ["__fastcall", "__cdecl", "__stdcall", "__pascal"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Reverse Engineering",
    question: "Which tool parses and edits Windows PE headers and resource sections directly on disk?",
    code_snippet: "CFF Explorer / PE-bear",
    options: ["PE-bear", "Wireshark", "Burp Suite", "Aircrack-ng"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "What does the instruction 'test eax, eax' followed by 'jz' evaluate?",
    code_snippet: "test eax, eax\njz loc_exit",
    options: ["Checks if eax is zero and jumps if true", "Checks if eax is negative", "Divides eax by 2", "Multiplies eax by itself"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Reverse Engineering",
    question: "In C++ binary decompilation, what is a 'vptr' (virtual pointer)?",
    code_snippet: "mov rax, [rcx]\ncall qword ptr [rax+10h]",
    options: ["A pointer at offset 0 of an object pointing to its virtual method table", "A pointer to the parent class constructor", "A garbage collection reference", "A pointer to the object destructor only"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Reverse Engineering",
    question: "What characteristic marks a packed executable during initial static triage?",
    code_snippet: "Shannon Entropy > 7.2; few imported functions",
    options: ["High entropy sections and minimal import table entries", "Zero sections and high debug symbols", "Excessive exports and low entropy", "Plaintext ASCII strings in .text section"],
    correct_index: 0,
    difficulty: "easy"
  },

  // --- 2. BINARY EXPLOITATION ---
  {
    category: "Binary Exploitation",
    question: "Which defense mechanism prevents executable code from running directly on stack and heap pages?",
    code_snippet: "PAGE_EXECUTE_READWRITE -> PAGE_READWRITE",
    options: ["DEP / NX", "ASLR", "Stack Canaries", "SafeSEH"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "What value is checked by the compiler-generated stack cookie prologue/epilogue (__security_check_cookie)?",
    code_snippet: "xor ecx, ebp\ncall @__security_check_cookie@4",
    options: ["Canary / Security Cookie placed before saved EBP", "Return address on stack", "ESP alignment bit", "EFLAGS register"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "What is a ROP (Return-Oriented Programming) gadget?",
    code_snippet: "pop rdi; ret",
    options: ["A small instruction sequence ending in a ret instruction", "A complete C function exported by libc", "A kernel hook placed by rootkits", "A compiler optimization flag"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "Under Linux glibc malloc, what heap chunk boundary vulnerability was historically known as 'unlink' exploitation?",
    code_snippet: "FD->bk = BK; BK->fd = FD;",
    options: ["Unsafe unlink macro corrupting arbitrary memory pointers", "Double free on tcache", "Heap spray via mmap", "UAF in fastbin"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Binary Exploitation",
    question: "What glibc 2.26 feature introduced per-thread single-linked singly-fast bins without lock overhead?",
    code_snippet: "tcache_entry *e = tcache->entries[tc_idx];",
    options: ["tcache (Thread Local Cache)", "fastbins", "unsorted bin", "top chunk"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Binary Exploitation",
    question: "In ret2libc attacks on 32-bit x86 Linux, what function address is conventionally jumped to with '/bin/sh' argument?",
    code_snippet: "system('/bin/sh')",
    options: ["system()", "mprotect()", "write()", "exit()"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "What Linux exploit primitive makes the stack executable again during a ROP chain?",
    code_snippet: "mprotect(stack_addr, 0x1000, 7)",
    options: ["mprotect() with PROT_READ|PROT_WRITE|PROT_EXEC", "fork()", "mmap() with MAP_FIXED", "setuid(0)"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Binary Exploitation",
    question: "What does partial RELRO (Relocation Read-Only) leave writable in an ELF executable?",
    code_snippet: "checksec --file=binary",
    options: ["The Global Offset Table (.got.plt)", "The .text segment", "The .rodata segment", "The .init_array section"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Binary Exploitation",
    question: "In format string exploitation, what format specifier writes the number of bytes printed so far to a target memory address?",
    code_snippet: "printf('AAAA%10$n', target_addr)",
    options: ["%n", "%p", "%x", "%s"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "What technique uses repeated allocations of controlled memory to place shellcode or fake objects at predictable addresses?",
    code_snippet: "new Array(10000).fill(payload)",
    options: ["Heap Spraying", "Egg Hunting", "JIT Spraying", "Stack Pivot"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "What is an 'Egg Hunter' in exploit development?",
    code_snippet: "find 4-byte tag '0xDAY0xDAY' in virtual address space",
    options: ["A compact assembly stub searching memory pages for a signature tag preceding stage-2 shellcode", "A fuzzer seeking unhandled crashes", "A scanner locating DLL exports", "A kernel driver checking for patched hooks"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Binary Exploitation",
    question: "What is a 'Stack Pivot'?",
    code_snippet: "xchg esp, eax; ret",
    options: ["An instruction redirecting the stack pointer (ESP/RSP) to controlled memory holding a ROP chain", "A compiler mitigation aligning stack frames", "A technique to zero the frame pointer", "A function allocating dynamic alloca memory"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Binary Exploitation",
    question: "Which mitigation binds indirect function calls and jumps to validated targets via compiler-generated bitmap tables?",
    code_snippet: "Control Flow Guard / CFI",
    options: ["CFG / CFI (Control Flow Integrity)", "ASLR", "DEP", "SMEP"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Binary Exploitation",
    question: "In x86-64 Linux, what register holds the first function argument?",
    code_snippet: "pop rdi; ret",
    options: ["rdi", "rsi", "rdx", "rcx"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "In x86-64 Linux, what register holds the second function argument?",
    code_snippet: "pop rsi; ret",
    options: ["rsi", "rdi", "rdx", "rcx"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "What opcode sequence invokes a 64-bit Linux syscall?",
    code_snippet: "0F 05",
    options: ["syscall (0x0F 0x05)", "int 0x80", "sysenter", "svc #0"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "What register holds the syscall number in 64-bit Linux?",
    code_snippet: "mov rax, 59\nsyscall",
    options: ["rax", "rdi", "rsi", "rdx"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "What is syscall 59 (0x3B) in 64-bit Linux?",
    code_snippet: "mov rax, 59\nmov rdi, bin_sh\nsyscall",
    options: ["execve", "fork", "read", "mmap"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Binary Exploitation",
    question: "What vulnerability occurs when an object is deallocated but pointer references to it remain accessible and later dereferenced?",
    code_snippet: "free(ptr); ptr->method();",
    options: ["Use-After-Free (UAF)", "Double Free", "Integer Overflow", "Off-by-one NULL byte"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Binary Exploitation",
    question: "What CPU security feature prevents supervisor/kernel mode from executing code in user-mode memory pages?",
    code_snippet: "CR4 bit 20",
    options: ["SMEP (Supervisor Mode Execution Prevention)", "SMAP", "KASLR", "NX"],
    correct_index: 0,
    difficulty: "medium"
  },

  // --- 3. WEB APPLICATION SECURITY ---
  {
    category: "Web App Security",
    question: "Which HTTP header instructs browsers to strictly communicate with a server over HTTPS only?",
    code_snippet: "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    options: ["Strict-Transport-Security (HSTS)", "X-Frame-Options", "Content-Security-Policy", "Access-Control-Allow-Origin"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "What vulnerability allows an attacker to induce the server-side application to make requests to an unintended intranet location?",
    code_snippet: "http://169.254.169.254/latest/meta-data/",
    options: ["Server-Side Request Forgery (SSRF)", "Cross-Site Scripting (XSS)", "Cross-Site Request Forgery (CSRF)", "SQL Injection"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "Which flag prevents client-side JavaScript from accessing session cookies via document.cookie?",
    code_snippet: "Set-Cookie: session=xyz; HttpOnly; Secure",
    options: ["HttpOnly", "Secure", "SameSite=Strict", "Domain"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "In JWT (JSON Web Tokens), what algorithmic flaw historically allowed signature bypass by modifying the header?",
    code_snippet: "{\"alg\": \"none\", \"typ\": \"JWT\"}",
    options: ["'none' algorithm attack", "Padding oracle attack", "Timing attack on exp", "Header injection in jku"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "What vulnerability occurs when an attacker modifies Object.prototype via recursive object merges in JavaScript?",
    code_snippet: "payload: {\"__proto__\": {\"admin\": true}}",
    options: ["Prototype Pollution", "DOM Clobbering", "CSTI", "Dangling Markup"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Web App Security",
    question: "Which technique prevents SQL injection in relational database interactions?",
    code_snippet: "cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))",
    options: ["Parameterized Queries / Prepared Statements", "Blacklisting single quotes", "URL encoding inputs", "Double quoting inputs"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "What attack bypasses Same-Origin Policy by reading timing deltas on cross-origin resource requests?",
    code_snippet: "performance.now() measurements",
    options: ["XS-Leaks (Cross-Site Leaks)", "Clickjacking", "HTTP Desync / Smuggling", "CSRF"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Web App Security",
    question: "What HTTP smuggling attack occurs when the front-end proxy prioritizes Content-Length and the backend prioritizes Transfer-Encoding?",
    code_snippet: "CL.TE desync",
    options: ["CL.TE Request Smuggling", "TE.CL Request Smuggling", "H2.TE Smuggling", "Cache Poisoning"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Web App Security",
    question: "Which Content Security Policy directive restricts the execution of inline JavaScript snippets (<script>alert(1)</script>)?",
    code_snippet: "Content-Security-Policy: script-src 'self'",
    options: ["script-src without 'unsafe-inline'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Web App Security",
    question: "What type of XSS occurs when untrusted input is reflected immediately in the server HTTP response without storage?",
    code_snippet: "https://site.com/search?q=<script>alert(1)</script>",
    options: ["Reflected XSS", "Stored XSS", "DOM-based XSS", "Blind XSS"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "What attribute should be placed on <script> tags to ensure external scripts execute only if their cryptographic hash matches?",
    code_snippet: "<script src='https://cdn...' integrity='sha384-...' crossorigin='anonymous'></script>",
    options: ["Subresource Integrity (SRI)", "CORS", "nonce", "strict-origin"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "Which HTTP header defends against Clickjacking attacks by preventing embedding within <iframe> tags?",
    code_snippet: "X-Frame-Options: DENY",
    options: ["X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "X-XSS-Protection"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "What attack targets XML parsers that resolve external entity definitions to read local files (/etc/passwd)?",
    code_snippet: "<!DOCTYPE foo [ <!ENTITY xxe SYSTEM 'file:///etc/passwd'> ]>",
    options: ["XXE (XML External Entity)", "XPath Injection", "Billion Laughs Denial", "SAML Injection"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "What does CORS (Cross-Origin Resource Sharing) use during pre-flight authorization checks?",
    code_snippet: "OPTIONS /api/data HTTP/1.1",
    options: ["HTTP OPTIONS request", "HTTP HEAD request", "HTTP TRACE request", "HTTP CONNECT request"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Web App Security",
    question: "Which SameSite cookie attribute prevents the cookie from being sent on normal top-level cross-site navigations (e.g. following a link)?",
    code_snippet: "Set-Cookie: session=xyz; SameSite=Strict",
    options: ["SameSite=Strict", "SameSite=Lax", "SameSite=None", "SameSite=Secure"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Web App Security",
    question: "What vulnerability occurs when user input is concatenated into an evaluation template engine (e.g. Jinja2, Twig)?",
    code_snippet: "{{ 7 * 7 }} -> 49",
    options: ["SSTI (Server-Side Template Injection)", "XSS", "CSTI", "SQLi"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "What vulnerability allows an authenticated user to access objects of other users simply by changing an ID parameter in the URL?",
    code_snippet: "GET /api/documents/1002 (belonging to victim)",
    options: ["IDOR (Insecure Direct Object Reference)", "SSRF", "CSRF", "Open Redirect"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "What attack leverages HTML/XML element attributes to override global variables in the DOM namespace (e.g. <img id='config'>)?",
    code_snippet: "<a id='debug' href='javascript:alert(1)'>",
    options: ["DOM Clobbering", "CSS Injection", "Mutation XSS", "DOM Purify bypass"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Web App Security",
    question: "What HTTP header prevents browsers from MIME-sniffing a response away from the declared Content-Type?",
    code_snippet: "X-Content-Type-Options: nosniff",
    options: ["X-Content-Type-Options: nosniff", "Content-Security-Policy", "X-Download-Options", "X-Permitted-Cross-Domain-Policies"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Web App Security",
    question: "Which OAuth 2.0 extension prevents authorization code interception attacks on public and mobile clients?",
    code_snippet: "code_challenge and code_verifier",
    options: ["PKCE (Proof Key for Code Exchange)", "Implicit Grant", "Client Credentials", "Device Flow"],
    correct_index: 0,
    difficulty: "medium"
  },

  // --- 4. CRYPTOGRAPHY ---
  {
    category: "Cryptography",
    question: "Which block cipher mode converts a block cipher into a stream cipher by encrypting sequential counter values?",
    code_snippet: "AES-CTR mode",
    options: ["CTR (Counter Mode)", "ECB (Electronic Codebook)", "CBC (Cipher Block Chaining)", "OFB (Output Feedback)"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "Which block cipher mode does NOT randomize identical plaintext blocks, creating visual image patterns (the ECB Penguin)?",
    code_snippet: "Ci = E(Pi, K)",
    options: ["ECB", "CBC", "CFB", "GCM"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "What mathematical problem provides the security basis for classical RSA cryptography?",
    code_snippet: "N = p * q",
    options: ["Integer Factorization of large composite numbers", "Discrete Logarithm on elliptic curves", "Shortest Vector Problem in lattices", "Knapsack problem"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "Which authenticated encryption mode combines CTR mode with Galois field multiplication for authentication tags?",
    code_snippet: "AES-GCM",
    options: ["GCM (Galois/Counter Mode)", "CCM", "CBC-HMAC", "EAX"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Cryptography",
    question: "What padding standard is vulnerable to Bleichenbacher's million-message chosen-ciphertext attack on RSA?",
    code_snippet: "PKCS #1 v1.5 padding",
    options: ["PKCS #1 v1.5", "RSA-OAEP", "PSS", "X.509"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Cryptography",
    question: "What attack exploits differences in server error responses regarding PKCS #7 padding in CBC mode decryption?",
    code_snippet: "Padding Oracle Attack",
    options: ["Padding Oracle Attack", "Meet-in-the-Middle", "Birthday Attack", "Slide Attack"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Cryptography",
    question: "What key size in bits is used by AES-256?",
    code_snippet: "AES-256",
    options: ["256 bits", "128 bits", "192 bits", "512 bits"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "What is the block size of the AES algorithm regardless of whether the key is 128, 192, or 256 bits?",
    code_snippet: "Nb = 4 words",
    options: ["128 bits (16 bytes)", "64 bits (8 bytes)", "256 bits (32 bytes)", "512 bits (64 bytes)"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "What cryptographic primitive produces a pseudo-random tag to verify both data integrity and authenticity using a secret key?",
    code_snippet: "HMAC-SHA256(key, message)",
    options: ["HMAC (Hash-based Message Authentication Code)", "CRC32", "MD5 without key", "Public Key Certificate"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "What curve is famously used in Bitcoin and Ethereum for ECDSA public key cryptography?",
    code_snippet: "y^2 = x^3 + 7 over Fp",
    options: ["secp256k1", "Curve25519", "NIST P-256", "ed25519"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Cryptography",
    question: "What key exchange protocol enables two parties to negotiate a shared secret over an insecure channel without transmitting the secret?",
    code_snippet: "g^(ab) mod p",
    options: ["Diffie-Hellman Key Exchange", "RSA Encryption", "ChaCha20", "RC4"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "What property guarantees that compromise of a server's long-term private key does NOT compromise past session keys?",
    code_snippet: "DHE / ECDHE ciphersuites",
    options: ["Forward Secrecy (PFS)", "Post-Quantum Immunity", "Collision Resistance", "Non-repudiation"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Cryptography",
    question: "What is the output length of a SHA-256 cryptographic hash digest in bits?",
    code_snippet: "sha256(data)",
    options: ["256 bits (32 bytes)", "128 bits (16 bytes)", "512 bits (64 bytes)", "160 bits (20 bytes)"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "Which hash construction is vulnerable to Length Extension Attacks when used as Hash(Secret || Message)?",
    code_snippet: "Merkle-Damgård based hashes (MD5, SHA-1, SHA-256)",
    options: ["Merkle-Damgård hashes (SHA-256, MD5)", "Sponge construction (SHA-3)", "BLAKE3", "Argon2"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Cryptography",
    question: "What modern memory-hard password hashing function won the Password Hashing Competition (PHC)?",
    code_snippet: "$argon2id$v=19$m=65536,t=3,p=4$...",
    options: ["Argon2 (Argon2id)", "bcrypt", "scrypt", "PBKDF2"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "What stream cipher created by Daniel J. Bernstein is widely paired with Poly1305 in TLS 1.3?",
    code_snippet: "ChaCha20-Poly1305",
    options: ["ChaCha20", "RC4", "Salsa20", "A5/1"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "What is a 'Nonce' in cryptographic protocols?",
    code_snippet: "Number used once",
    options: ["Number used once to guarantee freshness and prevent replay", "A persistent master key", "A public hash prefix", "A private certificate chain"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "What flaw occurs if the same key and nonce are reused in AES-GCM or ChaCha20?",
    code_snippet: "C1 xor C2 = P1 xor P2",
    options: ["Catastrophic keystream reuse allowing plaintext recovery and tag forgery", "Key bits leak directly into ciphertext", "Ciphertext length doubles", "Authentication tag calculation loops infinitely"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Cryptography",
    question: "What mathematical principle states that finding a hash collision requires approximately 2^(n/2) operations for an n-bit hash?",
    code_snippet: "O(sqrt(N))",
    options: ["Birthday Paradox / Birthday Bound", "Fermat's Little Theorem", "Chinese Remainder Theorem", "Pigeonhole Principle strictly"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cryptography",
    question: "Which quantum algorithm threatens public-key cryptography by solving integer factorization and discrete logs in polynomial time?",
    code_snippet: "Shor's Algorithm",
    options: ["Shor's Algorithm", "Grover's Algorithm", "Deutsch-Jozsa Algorithm", "Simon's Algorithm"],
    correct_index: 0,
    difficulty: "medium"
  },

  // --- 5. KERNEL & LOW-LEVEL INTERNALS ---
  {
    category: "Kernel Internals",
    question: "In the Windows kernel, what is an IRP?",
    code_snippet: "IoCompleteRequest(pIrp, IO_NO_INCREMENT);",
    options: ["I/O Request Packet", "Interrupt Routing Pointer", "Internal Resource Protocol", "Instruction Register Pointer"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Kernel Internals",
    question: "What x86_64 Model Specific Register (MSR) stores the kernel entry point for the SYSCALL instruction?",
    code_snippet: "wrmsr on MSR 0xC0000082",
    options: ["IA32_LSTAR (0xC0000082)", "IA32_STAR", "IA32_FMASK", "IA32_EFER"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Kernel Internals",
    question: "What CPU control register contains the base physical address of the page table hierarchy (PML4) for the current process?",
    code_snippet: "mov rax, cr3",
    options: ["CR3", "CR0", "CR4", "CR8"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "What Windows 64-bit kernel protection prevents modifying system tables like SSDT or IDT from kernel mode?",
    code_snippet: "Kernel Patch Protection",
    options: ["PatchGuard (KPP)", "Driver Signature Enforcement (DSE)", "HVCI", "BitLocker"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Kernel Internals",
    question: "What technique modifies active kernel objects in memory (e.g. unlinking a process from ActiveProcessLinks) to hide rootkits?",
    code_snippet: "pEprocess->ActiveProcessLinks.Blink->Flink = ...",
    options: ["DKOM (Direct Kernel Object Manipulation)", "SSDT Hooking", "IDT Hooking", "IRP Hooking"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "In the Linux kernel, what structure represents every running task/process?",
    code_snippet: "struct task_struct *current;",
    options: ["struct task_struct", "struct thread_info", "struct mm_struct", "struct cred"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "What function call in Linux kernel exploits modifies a process's credentials to root (UID 0)?",
    code_snippet: "commit_creds(prepare_kernel_cred(0));",
    options: ["commit_creds(prepare_kernel_cred(0))", "sys_setuid(0)", "set_current_state(ROOT)", "do_execve('/bin/sh')"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "What CPU security feature prevents supervisor/kernel mode from reading user-mode memory pages directly?",
    code_snippet: "CR4 bit 21",
    options: ["SMAP (Supervisor Mode Access Prevention)", "SMEP", "KPTI", "CET"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "What table maps software and hardware interrupt vectors to their corresponding service routines in x86/x64?",
    code_snippet: "lidt instruction",
    options: ["IDT (Interrupt Descriptor Table)", "GDT", "LDT", "TSS"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "What virtualization-based security (VBS) hypervisor component enforces code integrity in Windows kernel mode?",
    code_snippet: "Hypervisor-Protected Code Integrity",
    options: ["HVCI (Hypervisor-Protected Code Integrity)", "Secure Boot", "AppLocker", "Defender ATP"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "What mitigation isolates kernel page tables from user space to mitigate Meltdown (rogue data cache load)?",
    code_snippet: "Page Table Isolation",
    options: ["KPTI (Kernel Page Table Isolation)", "ASLR", "eBPF", "Retpoline"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "What Linux subsystem allows unprivileged or privileged programs to run sandboxed byte-code programs directly inside the kernel?",
    code_snippet: "bpf(BPF_PROG_LOAD, ...)",
    options: ["eBPF (Extended Berkeley Packet Filter)", "AppArmor", "cgroups", "SELinux"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Kernel Internals",
    question: "What IRQL (Interrupt Request Level) in Windows represents the normal execution level for user threads and kernel dispatchers?",
    code_snippet: "PASSIVE_LEVEL (0)",
    options: ["PASSIVE_LEVEL", "APC_LEVEL", "DISPATCH_LEVEL", "HIGH_LEVEL"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "At or above what Windows IRQL is code strictly forbidden from accessing pageable memory (must use non-paged pool)?",
    code_snippet: "KeAcquireSpinLock raises to DISPATCH_LEVEL",
    options: ["DISPATCH_LEVEL (IRQL 2)", "PASSIVE_LEVEL (IRQL 0)", "APC_LEVEL (IRQL 1)", "LOW_LEVEL"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Kernel Internals",
    question: "What Windows kernel synchronization primitive causes a busy wait loop instead of relinquishing the CPU core?",
    code_snippet: "KeAcquireSpinLock",
    options: ["Spinlock", "Fast Mutex", "Executive Resource (ERESOURCE)", "Notification Event"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Kernel Internals",
    question: "What structure in Windows contains the EPROCESS object pointer in the Kernel Debugger?",
    code_snippet: "!process 0 0",
    options: ["_EPROCESS", "_ETHREAD", "_KPCR", "_EJOB"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Kernel Internals",
    question: "What Windows mechanism allows 32-bit x86 applications to run on 64-bit Windows?",
    code_snippet: "C:\\Windows\\SysWOW64",
    options: ["WoW64 (Windows 32-bit on Windows 64-bit)", "Hyper-V", "WSL", "NTVDM"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Kernel Internals",
    question: "What technique bypasses Driver Signature Enforcement (DSE) by exploiting vulnerable signed legitimate third-party drivers?",
    code_snippet: "BYOVD (Bring Your Own Vulnerable Driver)",
    options: ["BYOVD", "Pass-The-Hash", "DLL Hijacking", "COM Hijacking"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Kernel Internals",
    question: "In x86 paging, what exception vector (Interrupt 14 / 0x0E) is raised when code attempts to access unmapped or protected virtual memory?",
    code_snippet: "INT 0x0E",
    options: ["Page Fault (#PF)", "General Protection Fault (#GP)", "Invalid Opcode (#UD)", "Double Fault (#DF)"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Kernel Internals",
    question: "What CPU register stores the linear address that caused a Page Fault exception?",
    code_snippet: "mov rax, cr2",
    options: ["CR2", "CR0", "CR3", "CR4"],
    correct_index: 0,
    difficulty: "medium"
  },

  // --- 6. NETWORK PROTOCOLS & FORENSICS ---
  {
    category: "Network Security",
    question: "What 3-way handshake packet sequence initiates a standard TCP connection?",
    code_snippet: "SYN -> SYN/ACK -> ACK",
    options: ["SYN -> SYN/ACK -> ACK", "ACK -> SYN -> ACK", "FIN -> SYN -> ACK", "RST -> SYN -> ACK"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What TCP flag combination defines a 'SYN Flood' DoS attack?",
    code_snippet: "Flooding SYN without completing handshake",
    options: ["High volume of SYN packets without completing the ACK", "Continuous RST packets", "Excessive URG packets", "FIN packets with invalid checksums"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What protocol resolves an IPv4 network address to a media access control (MAC) hardware address?",
    code_snippet: "arp -a",
    options: ["ARP (Address Resolution Protocol)", "DNS", "DHCP", "ICMP"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What attack sends unsolicited gratuitous ARP replies to poison local network switch/host MAC lookup tables?",
    code_snippet: "arpspoof -i eth0 -t target gateway",
    options: ["ARP Spoofing / Poisoning", "DNS Amplification", "BGP Hijacking", "SYN Flooding"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "Which ICMP message type indicates that a destination host or port is unreachable?",
    code_snippet: "Type 3, Code 3",
    options: ["ICMP Type 3", "ICMP Type 8 (Echo Request)", "ICMP Type 0 (Echo Reply)", "ICMP Type 11 (Time Exceeded)"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Network Security",
    question: "What DNS record type maps an IPv6 address to a domain name?",
    code_snippet: "dig AAAA domain.com",
    options: ["AAAA", "A", "CNAME", "PTR"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What attack exploits open recursive DNS resolvers to flood a victim using UDP spoofing and large EDNS responses?",
    code_snippet: "DNS Amplification Attack",
    options: ["DNS Amplification Attack", "Zone Transfer Leak", "DNS Tunneling", "Subdomain Takeover"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What TLS handshake extension transmits the target hostname in plaintext during Client Hello, allowing SNI filtering?",
    code_snippet: "Server Name Indication (SNI)",
    options: ["SNI (Server Name Indication)", "ALPN", "Session Ticket", "Key Share"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "In Wireshark display filters, what syntax filters traffic strictly for HTTP requests directed to port 8080?",
    code_snippet: "tcp.port == 8080 && http",
    options: ["tcp.port == 8080 && http", "port:8080 and http", "http.port == 8080", "ip.port == 8080"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What is the standard port for SSH (Secure Shell)?",
    code_snippet: "ssh user@host",
    options: ["Port 22", "Port 23", "Port 21", "Port 25"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What protocol replaces Telnet and FTP by encapsulating secure encrypted remote terminal management?",
    code_snippet: "OpenSSH",
    options: ["SSH", "RDP", "SNMP", "TFTP"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What attack redirects Internet traffic routes by injecting false Autonomous System (AS) paths into routing tables?",
    code_snippet: "BGP Route Hijacking",
    options: ["BGP Hijacking", "OSPF Poisoning", "RIP Injection", "VLAN Hopping"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Network Security",
    question: "What Nmap scan technique sends TCP SYN packets and analyzes response SYN/ACK vs RST without completing the 3-way handshake?",
    code_snippet: "nmap -sS target",
    options: ["SYN Stealth Scan (-sS)", "TCP Connect Scan (-sT)", "UDP Scan (-sU)", "FIN Scan (-sF)"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What Wi-Fi security standard replaces WPA2 and introduces Simultaneous Authentication of Equals (SAE) to stop offline dictionary attacks?",
    code_snippet: "WPA3-Personal",
    options: ["WPA3", "WPA-Enterprise", "WEP2", "802.1X"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "In network packet captures, what protocol uses 4-way handshakes involving EAPOL packets for wireless key negotiation?",
    code_snippet: "aircrack-ng -w wordlist.txt capture.cap",
    options: ["WPA/WPA2 4-Way Handshake", "IPsec IKEv2", "TLS 1.3 Key Share", "Kerberos AS-REQ"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Network Security",
    question: "What command in Linux displays active TCP connections, listening sockets, and associated PID processes?",
    code_snippet: "ss -tulpn / netstat -tulpn",
    options: ["ss -tulpn", "ifconfig -a", "route -n", "iptables -L"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What field in an IPv4 header decrements by 1 at each router hop to prevent infinite routing loops?",
    code_snippet: "TTL (Time to Live)",
    options: ["TTL (Time to Live)", "TOS (Type of Service)", "Identification", "Header Checksum"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Network Security",
    question: "What does an attacker accomplish via 'DNS Tunneling'?",
    code_snippet: "data.attacker-c2.com queries",
    options: ["Exfiltrating data or encapsulating C2 communication through DNS queries to bypass perimeter firewalls", "Cracking DNSSEC keys", "Overwriting the root zone file", "Poisoning recursive cache records"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Network Security",
    question: "What defense mechanism blocks unauthorized DHCP servers from handing out rogue gateway configurations on switched networks?",
    code_snippet: "ip dhcp snooping",
    options: ["DHCP Snooping", "Dynamic ARP Inspection", "BPDU Guard", "Port Security"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Network Security",
    question: "What protocol operates over port 53 and uses UDP for standard queries and TCP for zone transfers?",
    code_snippet: "port 53",
    options: ["DNS", "NTP", "DHCP", "LDAP"],
    correct_index: 0,
    difficulty: "easy"
  },

  // --- 7. ACTIVE DIRECTORY & ENTERPRISE ATTACKS ---
  {
    category: "Active Directory",
    question: "In Active Directory Kerberos authentication, what does the TGT stand for?",
    code_snippet: "klist",
    options: ["Ticket Granting Ticket", "Trust Gateway Token", "Transit Group Tag", "Terminal Group Tree"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Active Directory",
    question: "What attack requests Kerberos TGS tickets for Service Principal Names (SPNs) and cracks the encrypted service ticket offline?",
    code_snippet: "GetUserSPNs.py",
    options: ["Kerberoasting", "AS-REP Roasting", "Pass-The-Hash", "Golden Ticket"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Active Directory",
    question: "What attack targets Active Directory user accounts that have 'Do not require Kerberos preauthentication' enabled?",
    code_snippet: "GetNPUsers.py",
    options: ["AS-REP Roasting", "Kerberoasting", "Silver Ticket", "Skeleton Key"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Active Directory",
    question: "Which Active Directory account's NTLM hash or Kerberos key is required to forge a 'Golden Ticket'?",
    code_snippet: "mimikatz lsadump::dcsync /domain:... /user:krbtgt",
    options: ["krbtgt", "Administrator", "DefaultAccount", "Guest"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Active Directory",
    question: "What tool maps Active Directory attack paths and access control list (ACL) graph relationships?",
    code_snippet: "Sharphound / Neo4j",
    options: ["BloodHound", "Wireshark", "Burp Suite", "Ghidra"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Active Directory",
    question: "What protocol does Mimikatz emulate to extract password hashes from a Domain Controller without executing code on the DC itself?",
    code_snippet: "DRSUAPI RPC calls",
    options: ["DCSync (MS-DRSR Directory Replication Service)", "Pass-the-Ticket", "WMI Execution", "SMB Relay"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Active Directory",
    question: "What attack leverages SMB authentication reflections against un-signed SMB targets on a local network?",
    code_snippet: "ntlmrelayx.py -tf targets.txt -smb2support",
    options: ["NTLM Relay Attack", "Pass-The-Hash", "Golden Ticket", "Overpass-the-Hash"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Active Directory",
    question: "What Windows process holds plaintext credentials, Kerberos tickets, and NTLM hashes in memory?",
    code_snippet: "lsass.exe",
    options: ["lsass.exe", "csrss.exe", "explorer.exe", "svchost.exe"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Active Directory",
    question: "What attack uses an extracted NTLM hash directly to authenticate to remote SMB or RPC services without knowing the cleartext password?",
    code_snippet: "psexec.py domain/user@ip -hashes :hash",
    options: ["Pass-the-Hash (PtH)", "Kerberoasting", "Brute Force", "Credential Stuffing"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Active Directory",
    question: "What feature in modern Windows isolates the LSASS process in a virtualized container to prevent memory dumping?",
    code_snippet: "RunAsPPL / Credential Guard",
    options: ["Windows Defender Credential Guard (LSA Protection / PPL)", "UAC", "Windows Firewall", "BitLocker"],
    correct_index: 0,
    difficulty: "medium"
  },

  // --- 8. CLOUD, CONTAINERS & INCIDENT RESPONSE ---
  {
    category: "Cloud Security",
    question: "What IP address is universally used by AWS, GCP, and Azure for instance link-local metadata services?",
    code_snippet: "curl http://169.254.169.254/latest/meta-data/",
    options: ["169.254.169.254", "192.168.1.1", "10.0.0.1", "127.0.0.1"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cloud Security",
    question: "What AWS service manages access permissions to services and resources through JSON policy documents?",
    code_snippet: "aws:iam::policies",
    options: ["AWS IAM (Identity and Access Management)", "AWS KMS", "AWS CloudTrail", "AWS VPC"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cloud Security",
    question: "What Linux kernel feature isolates resource views (PID, mount, network, IPC) for Docker containers?",
    code_snippet: "clone(..., CLONE_NEWPID | CLONE_NEWNS)",
    options: ["Linux Namespaces", "cgroups", "Seccomp", "AppArmor"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Cloud Security",
    question: "What Linux kernel feature limits the amount of resources (CPU, memory, disk I/O) a container can consume?",
    code_snippet: "/sys/fs/cgroup",
    options: ["cgroups (Control Groups)", "Namespaces", "Capabilities", "chroot"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Cloud Security",
    question: "Running a Docker container with which flag gives the container almost complete access to the host's devices and kernel?",
    code_snippet: "docker run --privileged ...",
    options: ["--privileged", "--network=host", "-v /tmp:/tmp", "-d"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cloud Security",
    question: "What Kubernetes resource controls what a user or service account can do within a specific namespace?",
    code_snippet: "RoleBinding and Role",
    options: ["RBAC (Role-Based Access Control)", "PodSecurityPolicy", "NetworkPolicy", "Ingress"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Cloud Security",
    question: "What tool allows analyzing memory dump images (RAM) during digital forensics and incident response?",
    code_snippet: "vol.py -f memory.dmp windows.pslist",
    options: ["Volatility", "Autopsy", "Wireshark", "Metasploit"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cloud Security",
    question: "In AWS, what service logs all API calls made within an account for audit trails and threat detection?",
    code_snippet: "CloudTrail event logs",
    options: ["AWS CloudTrail", "Amazon CloudWatch", "AWS GuardDuty", "AWS Config"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Cloud Security",
    question: "What Linux capability allows a process to bypass file read, write, and execute permission checks?",
    code_snippet: "CAP_DAC_OVERRIDE",
    options: ["CAP_DAC_OVERRIDE", "CAP_SYS_ADMIN", "CAP_NET_RAW", "CAP_SYS_PTRACE"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Cloud Security",
    question: "What Linux capability allows a process to attach to other processes via ptrace for debugging and code injection?",
    code_snippet: "ptrace(PTRACE_ATTACH, pid)",
    options: ["CAP_SYS_PTRACE", "CAP_SYS_BOOT", "CAP_CHOWN", "CAP_KILL"],
    correct_index: 0,
    difficulty: "medium"
  },
  // --- 9. MOBILE & EMBEDDED SECURITY ---
  {
    category: "Mobile Security",
    question: "What dynamic instrumentation toolkit is widely used to hook Android Java classes and native functions at runtime?",
    code_snippet: "Java.use('com.example.app.SecurityCheck')",
    options: ["Frida", "GDB", "Radare2", "Wireshark"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Mobile Security",
    question: "What intermediate bytecode format is executed by the Android ART/Dalvik virtual machine inside APKs?",
    code_snippet: "classes.dex",
    options: ["DEX (Dalvik Executable)", "Java Bytecode (.class)", "ARM Thumb", "LLVM IR"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Mobile Security",
    question: "What tool disassembles and decompiles Android APK files back into human-readable Smali and decompiled Java source?",
    code_snippet: "jadx -d out app.apk",
    options: ["JADX", "Binwalk", "Afl-fuzz", "Sqlmap"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Mobile Security",
    question: "What file in an Android application specifies required permissions, exported components, and activities?",
    code_snippet: "AndroidManifest.xml",
    options: ["AndroidManifest.xml", "build.gradle", "strings.xml", "classes.dex"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Mobile Security",
    question: "What vulnerability occurs if an Android ContentProvider or Activity has 'android:exported=true' without permission checks?",
    code_snippet: "android:exported='true'",
    options: ["Exported Component Vulnerability (Arbitrary invocation by third-party apps)", "Buffer Overflow", "XSS", "Heap Corruption"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Mobile Security",
    question: "On iOS, what secure hardware enclave stores cryptographic keys and performs biometric authentication?",
    code_snippet: "Apple Secure Enclave",
    options: ["Secure Enclave Processor (SEP)", "TrustZone", "TPM 2.0", "HSM"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Mobile Security",
    question: "What binary format is executed natively by iOS and macOS platforms?",
    code_snippet: "Mach-O 64-bit",
    options: ["Mach-O", "ELF", "PE32+", "COFF"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Mobile Security",
    question: "What technique hooks Objective-C method implementations dynamically by exchanging method pointers in the runtime?",
    code_snippet: "method_exchangeImplementations",
    options: ["Method Swizzling", "VMT Hooking", "PLT Hooking", "Inline Detour"],
    correct_index: 0,
    difficulty: "medium"
  },
  // --- 10. HARDWARE & FIRMWARE SECURITY ---
  {
    category: "Hardware Security",
    question: "What hardware protocol uses 4 pins (TDI, TDO, TCK, TMS) to debug embedded microcontrollers and extract firmware?",
    code_snippet: "JTAG IEEE 1149.1",
    options: ["JTAG", "I2C", "SPI", "CAN bus"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Hardware Security",
    question: "What asynchronous serial bus protocol is commonly identified on IoT hardware boards for serial console root shells?",
    code_snippet: "RX, TX, GND, VCC (115200 baud)",
    options: ["UART (Universal Asynchronous Receiver-Transmitter)", "SPI", "USB-C", "PCIe"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Hardware Security",
    question: "What tool is specifically designed to scan firmware binary images and automatically extract embedded file systems (SquashFS)?",
    code_snippet: "binwalk -e firmware.bin",
    options: ["Binwalk", "Volatility", "Nmap", "Wireshark"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Hardware Security",
    question: "What attack analyzes power consumption fluctuations during cryptographic operations (e.g. RSA or AES) to extract secret keys?",
    code_snippet: "DPA / CPA",
    options: ["Differential Power Analysis (DPA)", "Rowhammer", "Spectre", "Cold Boot Attack"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Hardware Security",
    question: "What DRAM vulnerability induces bit flips in adjacent memory rows by rapidly reading specific memory addresses?",
    code_snippet: "Rowhammer",
    options: ["Rowhammer", "Meltdown", "Foreshadow", "Heartbleed"],
    correct_index: 0,
    difficulty: "medium"
  },
  // --- 11. FUZZING & VULNERABILITY RESEARCH ---
  {
    category: "Vulnerability Research",
    question: "What genetic algorithm fuzzer uses edge-coverage instrumentation in compile-time to guide mutation generation?",
    code_snippet: "afl-fuzz -i in -o out ./target @@",
    options: ["AFL / AFL++ (American Fuzzy Lop)", "Peach Fuzzer", "Boofuzz", "Sulley"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Vulnerability Research",
    question: "Which LLVM sanitizer detects out-of-bounds memory accesses, use-after-free, and stack corruption at runtime?",
    code_snippet: "-fsanitize=address",
    options: ["AddressSanitizer (ASan)", "ThreadSanitizer (TSan)", "MemorySanitizer (MSan)", "UBSan"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Vulnerability Research",
    question: "Which LLVM sanitizer detects reading uninitialized memory in C/C++?",
    code_snippet: "-fsanitize=memory",
    options: ["MemorySanitizer (MSan)", "AddressSanitizer (ASan)", "LeakSanitizer", "UndefinedBehaviorSanitizer"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Vulnerability Research",
    question: "What Python framework is widely used for symbolic execution and automated binary analysis in CTFs and research?",
    code_snippet: "import angr\nproj = angr.Project('binary')",
    options: ["angr", "pwntools", "scapy", "capstone"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Vulnerability Research",
    question: "What CPU hardware feature traces branch instructions and program flow with minimal overhead for coverage-guided fuzzing?",
    code_snippet: "Intel PT (Processor Trace)",
    options: ["Intel Processor Trace (Intel PT)", "Intel SGX", "Intel VT-x", "Hyper-Threading"],
    correct_index: 0,
    difficulty: "hard"
  },
  {
    category: "Vulnerability Research",
    question: "What type of fuzzing generates inputs based on a formal grammar or RFC specification (e.g. JSON, HTTP, ASN.1)?",
    code_snippet: "Grammar-based / Syntax-aware fuzzing",
    options: ["Grammar-based Fuzzing", "Mutation-based Fuzzing", "Blind Random Fuzzing", "Radamsa pure stream"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Vulnerability Research",
    question: "What Python library is standard for rapid exploit payload crafting, packing integers, and managing socket interactions?",
    code_snippet: "from pwn import *",
    options: ["pwntools", "requests", "paramiko", "socketserver"],
    correct_index: 0,
    difficulty: "easy"
  },
  // --- 12. EDR & DEFENSIVE EVASION ---
  {
    category: "Defensive Evasion",
    question: "What Windows technique bypasses user-mode EDR API hooks by reading syscall numbers and executing 'syscall' directly?",
    code_snippet: "Direct Syscalls (Hell's Gate / SysWhispers)",
    options: ["Direct Syscalls (Hell's Gate / SysWhispers)", "VMT Hooking", "DLL Side-loading", "Process Injection"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Defensive Evasion",
    question: "What technique unhooks ntdll.dll in memory by reading a fresh copy of the .text section directly from disk?",
    code_snippet: "Perun's Fart / ntdll unhooking",
    options: ["ntdll Unhooking", "Process Hollowing", "Reflective DLL Loading", "Thread Execution Hijacking"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Defensive Evasion",
    question: "What process injection technique creates a suspended legitimate process, unmaps its image, and writes malicious PE sections?",
    code_snippet: "NtUnmapViewOfSection -> SetThreadContext",
    options: ["Process Hollowing (RunPE)", "AtomBombing", "Process Doppelgänging", "AppInit_DLLs"],
    correct_index: 0,
    difficulty: "medium"
  },
  {
    category: "Defensive Evasion",
    question: "What Windows logging provider records comprehensive kernel and user-mode process, network, and registry telemetry?",
    code_snippet: "Event Tracing for Windows",
    options: ["ETW (Event Tracing for Windows)", "WMI", "Sysvol", "WinRM"],
    correct_index: 0,
    difficulty: "easy"
  },
  {
    category: "Defensive Evasion",
    question: "What in-memory patching technique disables AMSI (Antimalware Scan Interface) by patching AmsiScanBuffer to return E_INVALIDARG?",
    code_snippet: "mov eax, 80070057h; ret",
    options: ["AMSI Memory Patching (AmsiScanBuffer)", "DSE Disable", "ETW Ti Hook", "AppLocker Bypass"],
    correct_index: 0,
    difficulty: "medium"
  }
];

// Duplicate / generate variations to exceed 160 questions if needed
const outPath = path.resolve('supabase/questions_bank.json');
fs.writeFileSync(outPath, JSON.stringify(questions, null, 2));
console.log(`Generated ${questions.length} questions in ${outPath}`);
