# Blockchain demonstration setup

This is a local integrity and access-audit demonstration. PostgreSQL remains the source of all clinical information. Ganache stores only SHA-256 hashes, record IDs, access-request IDs, status, timestamps, and expiry metadata.

## 1. Install prerequisites

```powershell
node -v
npm -v
npm install -g ganache
ganache
```

Keep Ganache running. Its default RPC endpoint is `http://127.0.0.1:8545`. Copy one displayed test-account private key; it is safe only for this local demo.

## 2. Configure and deploy

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env: set PRIVATE_KEY from Ganache and keep the default RPC URL.
npm run blockchain:compile
npm run blockchain:deploy
```

Copy the deployment address printed by the last command into `CONTRACT_ADDRESS` in `.env`, then start the existing API with `npm run dev`.

## 3. Apply database migration

Apply [migrations/009_add_blockchain_demo_metadata.sql](migrations/009_add_blockchain_demo_metadata.sql) to the existing PostgreSQL database. It adds nullable metadata columns only and does not migrate or alter existing clinical values.

## API

| API | Auth | Purpose |
| --- | --- | --- |
| `GET /api/blockchain/records/:id/verify` | record owner, its doctor, or admin | Re-hashes the database visit and compares it to the immutable chain hash. |
| `GET /api/blockchain/access-history` | patient or admin | Access history with request/approval/revocation metadata. |
| `GET /api/blockchain/status` | signed-in user | Indicates whether the local blockchain environment is configured. |

Existing endpoints now also write blockchain metadata when configured:

- `POST /api/patients/:patient_id/visits` returns `blockchain.status`, `hash`, and transaction ID.
- `POST /api/patients/:patient_id/access-requests` records a pending request on-chain.
- Patient approval, rejection, and termination record the corresponding on-chain approval or revocation event.

## Demo script

```powershell
npm run blockchain:verify -- 101
```

To demonstrate tampering, change a non-blockchain field of an already registered `medical_visits` row directly in PostgreSQL, then call the verification endpoint. It returns `INVALID` with `Medical record integrity compromised`.

## Important limitations

This deliberately does not use wallets, payments, mainnet, production key management, or on-chain medical data. Do not use Ganache private keys or this implementation for real healthcare data.
