import { Contract, JsonRpcProvider } from "ethers";
import { FhevmInstance } from "../../fhevmTypes";
import { MockFhevmInstance } from "@fhevm/mock-utils";

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<FhevmInstance> => {
  const provider = new JsonRpcProvider(parameters.rpcUrl);
  // 动态解析 InputVerifier 的 EIP712 domain 以获取 verifyingContract 地址
  const inputVerifierContract = new Contract(
    parameters.metadata.InputVerifierAddress,
    [
      "function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"
    ],
    provider
  );
  const domain = await inputVerifierContract.eip712Domain();
  const verifyingContractAddressInputVerification = domain[4] as `0x${string}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = (await MockFhevmInstance.create(
    provider,
    provider,
    {
      aclContractAddress: parameters.metadata.ACLAddress,
      chainId: parameters.chainId,
      gatewayChainId: parameters.chainId,
      inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
      kmsContractAddress: parameters.metadata.KMSVerifierAddress,
      verifyingContractAddressDecryption: "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
      verifyingContractAddressInputVerification
    },
    {
      inputVerifierProperties: {},
      kmsVerifierProperties: {}
    }
  )) as unknown as FhevmInstance;
  return instance;
};


