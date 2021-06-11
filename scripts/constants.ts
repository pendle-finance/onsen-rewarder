import { BigNumber as BN } from 'ethers';

const ONE_E_18 = BN.from(10).pow(18);

export const consts = {
  ONE_E_18,
  INF: BN.from(2).pow(256).sub(1),
  MASTERCHEF_V2: '0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d',
  MASTERCHEF: '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd',
  MASTERCHEF_V2_OWNER: '0x19B3Eb3Af5D93b77a5619b047De0EED7115A19e7',
  MASTERCHEF_OWNER: '0x9a8541Ddf3a932a9A922B607e9CF7301f1d47bD1',
  REWARD_MULTIPLIER: ONE_E_18,
  PENDLE_ADDRESS: '0x808507121b80c02388fad14726482e061b8da827',
  // PENDLE_WHALE: "0x8849d0d4c35679aa78df1b5b4ceca358d57635df",
  PENDLE_WHALE: '0xa9cdf0542a1128c5caca1e81521a09aec8abe1a7',
  SUSHI_ADDRESS: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
  PENDLE_WETH_POOL: '0x37922c69b08babcceae735a31235c81f1d1e8e43',
  PENDLE_WETH_LP_WHALE: '0x5fa58f29c6138c07c2f9e9d0066f774a7ca3b7df',
  MASTERCHEF_V2_PID: 250,
  PENDLE_WETH_SUSHI_ALLOC_POINTS: 100,
  PENDLE_WETH_PENDLE_ALLOC_POINTS: 100,
  PENDLE_WETH_PID: 3, //
  PENDLE_PER_BLOCK: ONE_E_18, //
};
