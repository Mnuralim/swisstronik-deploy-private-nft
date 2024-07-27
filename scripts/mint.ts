import { ethers, network } from 'hardhat'
import { encryptDataField } from '@swisstronik/utils'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/src/signers'
import { HttpNetworkConfig } from 'hardhat/types'
import * as fs from 'fs'
import * as path from 'path'
import deployedAddress from '../utils/deployed-address'

const sendShieldedTransaction = async (
  signer: HardhatEthersSigner,
  destination: string,
  data: string,
  value: number
) => {
  const rpclink = (network.config as HttpNetworkConfig).url

  const [encryptedData] = await encryptDataField(rpclink, data)

  return await signer.sendTransaction({
    from: signer.address,
    to: destination,
    data: encryptedData,
    value,
  })
}

async function main() {
  const contractAddress = deployedAddress

  const [signer] = await ethers.getSigners()

  const contractFactory = await ethers.getContractFactory('PrivateNFT')
  const contract = contractFactory.attach(contractAddress)

  const mintFunctionName = 'mintNFT'
  const recipientAddress = signer.address
  const mintTx = await sendShieldedTransaction(
    //@ts-ignore
    signer,
    contractAddress,
    contract.interface.encodeFunctionData(mintFunctionName, [recipientAddress]),
    0
  )
  const mintReceipt = await mintTx.wait()
  console.log('Mint Transaction Hash: ', `https://explorer-evm.testnet.swisstronik.com/tx/${mintTx.hash}`)

  const mintEvent = mintReceipt?.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log)
      } catch (e) {
        return null
      }
    })
    .find((event) => event && event.name === 'NFTMinted')
  const tokenId = mintEvent?.args?.tokenId
  console.log('Minted NFT ID: ', tokenId.toString())

  const filePath = path.join(__dirname, '../utils/tx-hash.txt')
  fs.writeFileSync(filePath, `NFT ID ${tokenId} : https://explorer-evm.testnet.swisstronik.com/tx/${mintTx.hash}\n`, {
    flag: 'a',
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
