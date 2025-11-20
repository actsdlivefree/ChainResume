## ChainResume Contracts

### Features
- FHE-enabled resume:
  - Encrypted endorsement score (`euint32`)
  - Encrypted private note (`euint64`)
  - Public experiences with on-chain verification
- Local mock (Hardhat + @fhevm/hardhat-plugin)
- Sepolia (Relayer SDK) ready

### Prerequisites
- Node.js 18+
- pnpm/npm

### Install
```bash
pnpm i
# or npm i
```

### Run local node (FHEVM mock)
```bash
pnpm node
# or npm run node
```

### Compile and deploy (localhost)
```bash
pnpm build
pnpm deploy:localhost
```

Artifacts will be saved under `deployments/localhost/ChainResumeFHE.json`.

### Deploy to Sepolia
Set env:
```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/XXXX
SEPOLIA_PRIVATE_KEY=0xabc...
```
Then:
```bash
pnpm deploy:sepolia
```


