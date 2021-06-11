import { expect } from 'chai';
import hre from 'hardhat';
import { ethers, waffle } from 'hardhat';
import { consts } from '../scripts/constants';
import { Contract, Wallet, BigNumber as BN, BigNumberish } from 'ethers';
const { provider } = waffle;

describe('PendleOnsenComplexRewarder', function () {
  let rewarder: Contract;
  let sushiToken: Contract;
  let pendleToken: Contract;
  let lpToken: Contract;
  let masterchef: Contract;
  let masterchefV2: Contract;
  let alice: Wallet;
  let bob: Wallet;
  let snapshotId: string;

  const printState = async (label: string) => {
    console.log(`\tPrinting state - ${label}`);
    console.log(`\t\t Sushi balance of MasterchefV2 = ${await sushiToken.balanceOf(masterchefV2.address)}`);
    console.log(`\t\t Sushi balance of Alice = ${await sushiToken.balanceOf(alice.address)}`);
    console.log(`\t\t Pendle balance of Alice = ${await pendleToken.balanceOf(alice.address)}`);
  };

  async function evm_snapshot(): Promise<any> {
    return await hre.network.provider.request({
      method: 'evm_snapshot',
      params: [],
    });
  }

  async function evm_revert(snapshotId: string) {
    return await hre.network.provider.request({
      method: 'evm_revert',
      params: [snapshotId],
    });
  }

  function approxBigNumber(
    _actual: BigNumberish,
    _expected: BigNumberish,
    _delta: BigNumberish,
    log: boolean = true
  ) {
    let actual: BN = BN.from(_actual);
    let expected: BN = BN.from(_expected);
    let delta: BN = BN.from(_delta);

    var diff = expected.sub(actual);
    if (diff.lt(0)) {
      diff = diff.mul(-1);
    }
    if (diff.lte(delta) == false) {
      expect(
        diff.lte(delta),
        `expecting: ${expected.toString()}, received: ${actual.toString()}, diff: ${diff.toString()}, allowedDelta: ${delta.toString()}`
      ).to.be.true;
    } else {
      if (log) {
        console.log(
          `expecting: ${expected.toString()}, received: ${actual.toString()}, diff: ${diff.toString()}, allowedDelta: ${delta.toString()}`
        );
      }
    }
  }
  const impersonateAccount = async (address: string): Promise<any> => {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
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
    await masterchef.connect(masterchefOwner).set(consts.MASTERCHEF_V2_PID, consts.PENDLE_WETH_SUSHI_ALLOC_POINTS, false);
    const masterchefV2Owner = await impersonateAccount(consts.MASTERCHEF_V2_OWNER);

    await masterchefV2
      .connect(masterchefV2Owner)
      .add(consts.PENDLE_WETH_SUSHI_ALLOC_POINTS, consts.PENDLE_WETH_POOL, rewarder.address);

    // Fund PendleOnsenComplexRewarder with PENDLE
    const pendleWhale = await impersonateAccount(consts.PENDLE_WHALE);
    console.log(`\t Pendle balance of pendleWhale = ${await pendleToken.balanceOf(consts.PENDLE_WHALE)}`);
    await pendleToken.connect(pendleWhale).transfer(rewarder.address, BN.from(400000).mul(consts.ONE_E_18));

    // Print out status of MasterchefV2
    const sushiForMCV2 = await masterchefV2.sushiPerBlock();
    console.log(`\t sushiPerBlock for MasterchefV2 = ${sushiForMCV2}`);

    console.log(`\t totalAllocPoint of MasterchefV2 = ${await masterchefV2.totalAllocPoint()}`);
    console.log(`\t totalAllocPoint of Masterchef = ${await masterchef.totalAllocPoint()}`);

    await masterchefV2.harvestFromMasterChef();
    await printState("After setting up rewarder in MCV2");
  };

  before(async () => {
    [alice, bob] = provider.getWallets();
    const Rewarder = await ethers.getContractFactory('PendleOnsenComplexRewarder');
    rewarder = await Rewarder.deploy(consts.PENDLE_ADDRESS, consts.PENDLE_PER_BLOCK, consts.MASTERCHEF_V2);
    await rewarder.deployed();
    console.log('PendleOnsenComplexRewarder deployed to:', rewarder.address);

    sushiToken = await ethers.getContractAt('IERC20', consts.SUSHI_ADDRESS);
    pendleToken = await ethers.getContractAt('ERC20', consts.PENDLE_ADDRESS);
    lpToken = await ethers.getContractAt('ERC20', consts.PENDLE_WETH_POOL);
    masterchef = await ethers.getContractAt('IMasterChef', consts.MASTERCHEF);
    masterchefV2 = await ethers.getContractAt('IMasterChefV2', consts.MASTERCHEF_V2);

    await setUpDoubleIncentives();
    await rewarder.add(consts.PENDLE_WETH_PENDLE_ALLOC_POINTS, consts.PENDLE_WETH_PID);

    const pendleWethLpWhale = await impersonateAccount(consts.PENDLE_WETH_LP_WHALE);
    const testPendleWethLpBalance = (await lpToken.balanceOf(pendleWethLpWhale.address)).div(2);

    await lpToken
      .connect(pendleWethLpWhale)
      .transfer(alice.address, testPendleWethLpBalance);

    await lpToken
      .connect(pendleWethLpWhale)
      .transfer(bob.address, testPendleWethLpBalance);

    console.log(`\t About to approve masterchefV2 `);
    await lpToken.approve(masterchefV2.address, consts.INF);
    await lpToken.connect(bob).approve(masterchefV2.address, consts.INF);
    snapshotId = await evm_snapshot();
  });

  beforeEach(async () => {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  })

  it('Correct pendle rewards, before and after setting new reward rate', async function () {
    const lpTokenAmount = (await lpToken.balanceOf(alice.address)).div(10);
    console.log(`\t About to deposit into masterchefV2 `);
    await masterchefV2.deposit(consts.PENDLE_WETH_PID, lpTokenAmount, alice.address);

    await printState("Right after staking");
    await masterchefV2.harvest(consts.PENDLE_WETH_PID, alice.address);
    // previous transaction is considered block t0

    await printState("After harvesting");
    const alicePendleBalance = await pendleToken.balanceOf(alice.address);
    approxBigNumber(alicePendleBalance, consts.PENDLE_PER_BLOCK, 1000000000);

    console.log(`\tBob depositing`);
    await masterchefV2.connect(bob).deposit(consts.PENDLE_WETH_PID, lpTokenAmount, bob.address);
    // previous transaction happened at t0+1

    console.log(`\tBob harvesting`);
    await masterchefV2.connect(bob).harvest(consts.PENDLE_WETH_PID, bob.address);
    // previous transaction happened at t0+2

    const bobPendleBalance = await pendleToken.balanceOf(bob.address);
    approxBigNumber(bobPendleBalance, consts.PENDLE_PER_BLOCK.div(2), 1000000000);

    const newPendlePerBlock = consts.PENDLE_PER_BLOCK.mul(7);
    await rewarder.setRewardRate(newPendlePerBlock, [consts.PENDLE_WETH_PID]);
    // previous transaction happened at t0+3

    // next transaction is at t0+4. A should get 1 block of PENDLE_PER_BLOCK, 2 blocks of PENDLE_PER_BLOCK /2,
    // and 1 block of newPendlePerBlock/2
    await masterchefV2.harvest(consts.PENDLE_WETH_PID, alice.address);
    const aliceAdditionalPendle = (await pendleToken.balanceOf(alice.address)).sub(alicePendleBalance);
    approxBigNumber(
      aliceAdditionalPendle,
      consts.PENDLE_PER_BLOCK.mul(2).add(newPendlePerBlock.div(2)),
      10000000000
    );
  });
});
