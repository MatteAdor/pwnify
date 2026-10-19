#!/usr/bin/env bash
# =====================================================================
# ZERODAY RANKED SYSTEM — CONCURRENCY HARNESS
# Tests concurrent execution of find_or_create_match with 2 parallel psql
# sessions using FOR UPDATE SKIP LOCKED.
# Asserts: Exactly 1 match created, 0 deadlocks, clean pairing, identical match_id.
# =====================================================================

set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

echo "[Concurrency Test] Initializing test fixture and clearing queues..."

psql "$DB_URL" -v ON_ERROR_STOP=1 -q << 'EOF'
-- Ensure test users exist with confirmed emails
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'operator_alpha@zeroday.local', pg_catalog.now(), '{"nick": "AlphaOperative"}'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'operator_bravo@zeroday.local', pg_catalog.now(), '{"nick": "BravoOperative"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET email_confirmed_at = pg_catalog.now();

-- Ensure profiles exist and reset cooldowns & ELO
INSERT INTO public.profiles (id, nick, elo, rank, xp, inventory, flagged, matchmaking_cooldown_until)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'AlphaOperative', 1000, 'Bronze Recruit', 0, '{}'::jsonb, false, NULL),
    ('22222222-2222-2222-2222-222222222222', 'BravoOperative', 1000, 'Bronze Recruit', 0, '{}'::jsonb, false, NULL)
ON CONFLICT (id) DO UPDATE 
SET elo = 1000, rank = 'Bronze Recruit', matchmaking_cooldown_until = NULL, flagged = false;

-- Clean recent matches between Alpha & Bravo to avoid anti-farming block
DELETE FROM public.matches 
WHERE (p1_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
   AND p2_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'));

-- Clear matchmaking queue
DELETE FROM public.matchmaking_queue;

-- Ensure questions exist for match creation
INSERT INTO public.questions (id, category, question, code_snippet, options, correct_index, difficulty)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Reverse Engineering', 'What instruction restores stack frame in x86?', 'leave\nret', '["leave", "pop eax", "nop", "int 3"]'::jsonb, 0, 'easy'),
    ('a0000000-0000-0000-0000-000000000002', 'Binary Exploitation', 'Which mitigation randomizes stack and heap layout?', NULL, '["DEP", "ASLR", "CFI", "SafeSEH"]'::jsonb, 1, 'easy'),
    ('a0000000-0000-0000-0000-000000000003', 'Kernel Internals', 'What privilege level does ring 0 represent on x86_64?', NULL, '["User Mode", "Hypervisor", "Kernel Mode", "SMM"]'::jsonb, 2, 'medium'),
    ('a0000000-0000-0000-0000-000000000004', 'Cryptography', 'Which AES block mode requires an unpredictable IV?', NULL, '["ECB", "CTR", "GCM", "CBC"]'::jsonb, 3, 'medium'),
    ('a0000000-0000-0000-0000-000000000005', 'Network Security', 'What protocol header field protects against replay in IPsec?', NULL, '["Sequence Number", "TTL", "Flow Label", "Checksum"]'::jsonb, 0, 'hard')
ON CONFLICT (id) DO NOTHING;
EOF

OUT1=$(mktemp)
OUT2=$(mktemp)
ERR1=$(mktemp)
ERR2=$(mktemp)

trap 'rm -f "$OUT1" "$OUT2" "$ERR1" "$ERR2"' EXIT

echo "[Concurrency Test] Launching 2 simultaneous parallel matchmaking workers..."

run_matchmaking_session() {
    local uid="$1"
    local out="$2"
    local err="$3"
    local last_res=""

    for attempt in $(seq 1 30); do
        local res
        res=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A << EOF 2>> "$err"
SET request.jwt.claim.sub = '$uid';
SET request.jwt.claim.role = 'authenticated';
SET ROLE authenticated;
SELECT public.find_or_create_match();
EOF
)
        last_res="$res"
        local status
        status=$(echo "$res" | grep -o '"status": *"[^"]*"' | cut -d'"' -f4 || true)

        if [ "$status" = "matched" ]; then
            echo "$res" > "$out"
            return 0
        fi

        sleep 0.05
    done

    echo "$last_res" > "$out"
}

# Launch concurrently in background
run_matchmaking_session '11111111-1111-1111-1111-111111111111' "$OUT1" "$ERR1" &
PID1=$!

run_matchmaking_session '22222222-2222-2222-2222-222222222222' "$OUT2" "$ERR2" &
PID2=$!

# Wait for both background workers
wait "$PID1" || true
wait "$PID2" || true

RES1=$(cat "$OUT1")
RES2=$(cat "$OUT2")

echo "Session 1 (Alpha): $RES1"
echo "Session 2 (Bravo): $RES2"

# Check for stderr errors or deadlocks
if [ -s "$ERR1" ]; then
    echo "ERROR in Session 1:" >&2
    cat "$ERR1" >&2
    exit 1
fi

if [ -s "$ERR2" ]; then
    echo "ERROR in Session 2:" >&2
    cat "$ERR2" >&2
    exit 1
fi

STATUS1=$(echo "$RES1" | grep -o '"status": *"[^"]*"' | cut -d'"' -f4)
STATUS2=$(echo "$RES2" | grep -o '"status": *"[^"]*"' | cut -d'"' -f4)

MATCH_ID1=$(echo "$RES1" | grep -o '"match_id": *"[^"]*"' | cut -d'"' -f4)
MATCH_ID2=$(echo "$RES2" | grep -o '"match_id": *"[^"]*"' | cut -d'"' -f4)

echo "Resulting statuses: [$STATUS1, $STATUS2]"
echo "Matched IDs: [$MATCH_ID1, $MATCH_ID2]"

# Verify in DB: exactly 1 active match created
MATCH_COUNT=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A -c "
SELECT count(*) FROM public.matches 
WHERE (p1_id = '11111111-1111-1111-1111-111111111111' AND p2_id = '22222222-2222-2222-2222-222222222222')
   OR (p1_id = '22222222-2222-2222-2222-222222222222' AND p2_id = '11111111-1111-1111-1111-111111111111');
")

echo "Total matches created in DB between pair: $MATCH_COUNT"

if [ "$MATCH_COUNT" -ne 1 ]; then
    echo "[FAILURE] Concurrency race produced $MATCH_COUNT matches (expected exactly 1)!" >&2
    exit 1
fi

if [ "$STATUS1" != "matched" ] || [ "$STATUS2" != "matched" ]; then
    echo "[FAILURE] Both sessions did not reach 'matched' status!" >&2
    exit 1
fi

if [ "$MATCH_ID1" != "$MATCH_ID2" ]; then
    echo "[FAILURE] Sessions paired to different matches: $MATCH_ID1 != $MATCH_ID2" >&2
    exit 1
fi

echo "[SUCCESS] Concurrency test passed: 2 parallel sessions matched into the exact same match ($MATCH_ID1) with 0 deadlocks and exactly 1 match created."
exit 0
