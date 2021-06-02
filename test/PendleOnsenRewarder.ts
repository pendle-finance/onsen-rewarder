import { expect } from "chai";
import hre from "hardhat";
import { ethers, waffle } from "hardhat";
import { consts } from "../scripts/constants";
import { Contract, Wallet, BigNumber as BN } from "ethers";
const { provider } = waffle;

describe("PendleOnsenRewarder", function () {
  let rewarder: Contract;
  let sushiToken: Contract;
  let pendleToken: Contract;
  let lpToken: Contract;
  let masterchef: Contract;
  let masterchefV2: Contract;
  let alice: Wallet;
  let bob: Wallet;

  const printState = async () => {
    console.log(
      `\t\t Sushi balance of MasterchefV2 = ${await sushiToken.balanceOf(
        masterchefV2.address
      )}`
    );
    console.log(
      `\t\t Sushi balance of Alice = ${await sushiToken.balanceOf(
        alice.address
      )}`
    );
    console.log(
      `\t\t Pendle balance of Alice = ${await pendleToken.balanceOf(
        alice.address
      )}`
    );
  };

  const impersonateAccount = async (address: string): Promise<any> => {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [address],
    });
    await alice.sendTransaction({
      to: address,
      value: BN.from(10).pow(17),
      gasLimit: 1000000,
    }); // send 0.1 ETH for gas
    return await ethers.getSigner(address);
  };

  const setUpDoubleIncentives = async () => {
    const masterchefOwner = await impersonateAccount(consts.MASTERCHEF_OWNER);
    await masterchef
      .connect(masterchefOwner)
      .set(consts.MASTERCHEF_V2_PID, consts.PENDLE_WETH_ALLOC_POINTS, false);
    const masterchefV2Owner = await impersonateAccount(
      consts.MASTERCHEF_V2_OWNER
    );

    await masterchefV2
      .connect(masterchefV2Owner)
      .add(
        consts.PENDLE_WETH_ALLOC_POINTS,
        consts.PENDLE_WETH_POOL,
        rewarder.address
      );

    // Fund PendleOnsenRewarder with PENDLE
    const pendleWhale = await impersonateAccount(consts.PENDLE_WHALE);
    console.log(
      `\t Pendle balance of pendleWhale = ${await pendleToken.balanceOf(
        consts.PENDLE_WHALE
      )}`
    );
    await pendleToken
      .connect(pendleWhale)
      .transfer(rewarder.address, BN.from(400000).mul(consts.ONE_E_18));

    // Print out status of MasterchefV2
    const sushiForMCV2 = await masterchefV2.sushiPerBlock();
    console.log(`\t sushiPerBlock for MasterchefV2 = ${sushiForMCV2}`);

    console.log(
      `\t totalAllocPoint of MasterchefV2 = ${await masterchefV2.totalAllocPoint()}`
    );
    await masterchefV2.harvestFromMasterChef();
    await printState();
  };

  before(async () => {
    [alice, bob] = provider.getWallets();
    const Rewarder = await ethers.getContractFactory("PendleOnsenRewarder");
    rewarder = await Rewarder.deploy(
      consts.REWARD_MULTIPLIER,
      consts.PENDLE_ADDRESS,
      consts.MASTERCHEF_V2
    );
    await rewarder.deployed();
    console.log("PendleOnsenRewarder deployed to:", rewarder.address);

    sushiToken = await ethers.getContractAt("IERC20", consts.SUSHI_ADDRESS);
    pendleToken = await ethers.getContractAt("ERC20", consts.PENDLE_ADDRESS);
    lpToken = await ethers.getContractAt("ERC20", consts.PENDLE_WETH_POOL);
    masterchef = await ethers.getContractAt("IMasterChef", consts.MASTERCHEF);
    masterchefV2 = await ethers.getContractAt(
      "IMasterChefV2",
      consts.MASTERCHEF_V2
    );

    await setUpDoubleIncentives();

    const pendleWethLpWhale = await impersonateAccount(
      consts.PENDLE_WETH_LP_WHALE
    );
    await lpToken
      .connect(pendleWethLpWhale)
      .transfer(
        alice.address,
        await lpToken.balanceOf(pendleWethLpWhale.address)
      );
    // TODO:
    //    1. impersonate a Pendle whale
    //    2. send lots of Pendle from the whale to alice
    //    3. fund the rewarder contract with lots of Pendle
  });
  it("Should be able to stake Pendle-WETH LP and get Pendle", async function () {
    const lpTokenAmount = (await lpToken.balanceOf(alice.address)).div(10);

    console.log(`\t About to approve masterchefV2 `);
    await lpToken.approve(masterchefV2.address, consts.INF);
    console.log(`\t About to deposit into masterchefV2 `);

    await masterchefV2.deposit(
      consts.PENDLE_WETH_PID,
      lpTokenAmount,
      alice.address
    );

    await printState();
    await masterchefV2.harvest(consts.PENDLE_WETH_PID, alice.address);
    await printState();

    //TODO:
    //  1. Stake PENDLE-WETH into the Pendle-WETH market on Sushiswap
    //  2. Stake the LPs into the Onsen program
  });
});
