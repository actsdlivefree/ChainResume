import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("ChainResumeFHE", {
    from: deployer,
    log: true
  });

  console.log(`ChainResumeFHE contract deployed at: ${deployed.address}`);
};

export default func;
func.id = "deploy_chainresume_fhe";
func.tags = ["ChainResumeFHE"];


