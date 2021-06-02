import hre from "hardhat";
import { consts } from "./constants";

async function main() {
  const Rewarder = await hre.ethers.getContractFactory("PendleOnsenRewarder");
  const rewarder = await Rewarder.deploy(
    consts.REWARD_MULTIPLIER,
    consts.PENDLE_ADDRESS,
    consts.MASTERCHEF_V2
  );
  await rewarder.deployed();

  console.log("PendleOnsenRewarder deployed to:", rewarder.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
