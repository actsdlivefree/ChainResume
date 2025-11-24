export type HandleContractPair = { handle: string; contractAddress: `0x${string}` };

export type UserDecryptResults = Record<string, string | bigint | boolean>;
export type DecryptedResults = UserDecryptResults;

export type EIP712Type = {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: `0x${string}`;
    version: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;
  primaryType: string;
  types: {
    [key: string]: { name: string; type: string }[];
  };
};

export type FhevmInstanceConfig = {
  network: string | unknown;
  publicKey?: { id: string | null; data: Uint8Array | null };
  publicParams: null | { "2048": { publicParamsId: string; publicParams: Uint8Array } };
  aclContractAddress: `0x${string}`;
};

export type FhevmInstance = {
  createEncryptedInput: (contractAddress: `0x${string}`, userAddress: `0x${string}`) => {
    add32: (value: number) => void;
    add64: (value: number) => void;
    addBool?: (value: boolean) => void;
    encrypt: () => Promise<{ handles: string[]; inputProof: string }>;
  };
  generateKeypair: () => { publicKey: string; privateKey: string };
  createEIP712: (
    publicKey: string,
    contractAddresses: string[],
    startTimestamp: number,
    durationDays: number
  ) => EIP712Type;
  userDecrypt: (
    pairs: HandleContractPair[],
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: `0x${string}`[],
    userAddress: `0x${string}`,
    startTimestamp: number,
    durationDays: number
  ) => Promise<DecryptedResults>;
  getPublicKey: () => { publicKeyId: string; publicKey: Uint8Array } | null;
  getPublicParams: (size: 2048) => { publicParamsId: string; publicParams: Uint8Array } | null;
};


