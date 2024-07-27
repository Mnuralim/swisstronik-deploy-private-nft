import { ethers } from 'hardhat'
import fs from 'fs'
import path from 'path'

async function main() {
  const [signer] = await ethers.getSigners()
  const initalOwner = signer.address

  const Contract = await ethers.getContractFactory('PrivateNFT')

  console.log('Deploying NFT...')
  const contract = await Contract.deploy(initalOwner)

  await contract.waitForDeployment()
  const contractAddress = await contract.getAddress()

  console.log('NFT deployed to:', contractAddress)

  const deployedAddressPath = path.join(__dirname, '..', 'utils', 'deployed-address.ts')
  const fileContent = `const deployedAddress = '${contractAddress}'\n\nexport default deployedAddress\n`
  fs.writeFileSync(deployedAddressPath, fileContent, { encoding: 'utf8' })
  console.log('Address written to deployed-address.ts')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
