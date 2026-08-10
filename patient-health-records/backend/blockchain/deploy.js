const hre = require('hardhat');

async function main() {
  const Registry = await hre.ethers.getContractFactory('HealthcareRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  console.log(`HealthcareRegistry deployed to: ${await registry.getAddress()}`);
  console.log('Copy that address to CONTRACT_ADDRESS in backend/.env');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
