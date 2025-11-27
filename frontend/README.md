## ChainResume Frontend

Next.js + Tailwind UI with FHEVM integration. Supports:
- Local Hardhat mock via `@fhevm/mock-utils`
- Sepolia via Relayer SDK (loaded from CDN)

### Install
```bash
pnpm i
# or npm i
```

### Generate ABI & addresses
Run after you deploy contracts in `action/contracts`:
```bash
pnpm genabi
```
This updates:
- `abi/ChainResumeABI.ts`
- `abi/ChainResumeAddresses.ts`

### Dev
```bash
pnpm dev
```
Open http://localhost:3000

### Local mock mode
- Ensure Hardhat node (with FHEVM mock) is running at `http://localhost:8545`
- Deploy the contract on localhost
- Run `pnpm genabi` here
- Start the frontend

### Sepolia (Relayer SDK) mode
- Deploy contract to Sepolia and run `pnpm genabi`
- Switch MetaMask network to Sepolia
- The app will auto-load Relayer SDK from CDN


