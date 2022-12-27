const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

const imagesLocation = "./images/dogsimages"
let tokenUris = [
    "ipfs://QmWR1SsiVtSL7w4qkV1sSt91F7HUzKzQwxuftSC1kt46mB",
    "ipfs://Qmd2WoD98NyBbd2CY17T6Uny82BUm1V4ZgcwHE6mAc9qe9"
]

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "",
            value: 10
        }
    ]
}

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let tokenUris

    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris()
    }
    const nftToken = await deploy("NftToken", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })
    //console.log(`nftToken deployed at: ${nftToken.address}`)
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(nftToken.address, args)
    }
    log("----------------------------------------------------")
}

async function handleTokenUris() {
    tokenUris = []
    const { responses: imageUploadedResponses, files } = await storeImages(imagesLocation)
    for (imageUploadResponseIndex in imageUploadedResponses) {
        let tokenUriMetadata = { ...metadataTemplate }
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
        tokenUriMetadata.description = `Cute ${tokenUriMetadata.name}`
        tokenUriMetadata.image = `ipfs://${imageUploadedResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name}...`)
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs uploaded: ")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "ipfsNft", "main"]
