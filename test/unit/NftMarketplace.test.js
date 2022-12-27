const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts, getUnnamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function() {
          let nftMarketplace, nftMarketplaceContract, nftTokens, nftTokensContract
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0

          beforeEach(async () => {
              // deployer = (await getNamedAccounts()).deployer
              // player = (await getUnnamedAccounts()).player
              // const accounts = await ethers.getSigners()
              // user = accounts[1]
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]
              await deployments.fixture(["all"])
              nftMarketplaceContract = await ethers.getContract("NftMarketplace")
              nftMarketplace = nftMarketplaceContract.connect(deployer)
              nftTokensContract = await ethers.getContract("NftToken")
              nftTokens = await nftTokensContract.connect(deployer)

              await nftTokens.mintNft()
              await nftTokens.approve(nftMarketplaceContract.address, TOKEN_ID)
          })

          describe("listNft", function() {
              it("Should list NFT on marketplace", async function() {
                  await nftMarketplace.listNft(nftTokens.address, TOKEN_ID, PRICE)
              })
          })

          describe("buyNft", function() {
              it("Should allow user to buy NFT", async function() {
                  await nftMarketplace.listNft(nftTokens.address, TOKEN_ID, PRICE)
                  const userConnectedNftMarketplace = nftMarketplace.connect(user)
                  await userConnectedNftMarketplace.buyNft(nftTokens.address, TOKEN_ID, {
                      value: PRICE
                  })
                  const newOwner = await nftTokens.ownerOf(TOKEN_ID)
                  assert(newOwner.toString() == user.address)
              })
          })

          describe("withdrawPayments", function() {
              it("Should allow deployer to withdraw profit", async function() {
                  await nftMarketplace.listNft(nftTokens.address, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await nftMarketplace.buyNft(nftTokens.address, TOKEN_ID, { value: PRICE })
                  nftMarketplace = nftMarketplaceContract.connect(deployer)

                  const deployerProceedsBefore = await nftMarketplace.getPayments(deployer.address)
                  const deployerBalanceBefore = await deployer.getBalance()
                  const txResponse = await nftMarketplace.withdrawPayments()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await deployer.getBalance()
                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )
              })
          })
      })
