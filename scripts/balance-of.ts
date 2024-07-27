import { ethers, network } from 'hardhat'
import { encryptDataField, decryptNodeResponse } from '@swisstronik/utils'
import { HttpNetworkConfig } from 'hardhat/types'
import deployedAddress from '../utils/deployed-address'
import { TransactionRequest, Wallet } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

const sendShieldedQuery = async (wallet: Wallet, destination: string, data: string) => {
  if (!wallet.provider) {
    throw new Error("wallet doesn't contain connected provider")
  }

  const rpclink = (network.config as HttpNetworkConfig).url
  const [encryptedData, usedEncryptedKey] = await encryptDataField(rpclink, data)

  const networkInfo = await wallet.provider.getNetwork()
  const nonce = await wallet.getNonce()

  const callData: TransactionRequest = {
    to: destination,
    data: encryptedData,
    nonce: nonce,
    chainId: networkInfo.chainId,
  }

  const signedRawCallData = await wallet.signTransaction(callData)
  const decoded = ethers.Transaction.from(signedRawCallData)

  const signedCallData = {
    nonce: nonce,
    to: decoded.to,
    data: decoded.data,
    chainId: 1291,
  }

  const response = await wallet.provider.call(signedCallData)
  return await decryptNodeResponse(rpclink, response, usedEncryptedKey)
}

async function main() {
  const contractAddress = deployedAddress
  const [signer] = await ethers.getSigners()

  const wallet = new ethers.Wallet('0x' + process.env.PRIVATE_KEY, signer.provider)

  const contractFactory = await ethers.getContractFactory('PrivateNFT')
  const contract = contractFactory.attach(contractAddress)

  const functionName = 'balanceOf'
  const functionArgs = [wallet.address]
  const responseMessage = await sendShieldedQuery(
    wallet,
    contractAddress,
    contract.interface.encodeFunctionData(functionName, functionArgs)
  )
  const totalBalance = contract.interface.decodeFunctionResult(functionName, responseMessage)[0]

  console.log('Total Balance is:', totalBalance, 'Token')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
