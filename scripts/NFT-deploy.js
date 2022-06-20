const { expect } = require("chai");
const { ethers } = require("hardhat");
const { LazyMinter } = require("../scripts/signer");
const CONFIG = require("../credentials");

const provider = new ethers.providers.JsonRpcProvider("https://rinkeby-light.eth.linkpool.io/"); 
const signer = new ethers.Wallet(CONFIG.wallet.PKEY);
const account = signer.connect(provider);

describe("NFT", function () {

  before(async() =>{
    const NFT = await ethers.getContractFactory("NFT");
    nft = await NFT.deploy("LazyNFT", "1" );
    await nft.deployed();

    const USDC = await ethers.getContractFactory("USDC");
    usdc = await USDC.deploy();
    await usdc.deployed();

    accounts = await ethers.getSigners();

    console.log({
      nft: nft.address,
      usdc: usdc.address,
    })
    
  })

  after(async () => {
    console.log('\u0007');
    console.log('\u0007');
    console.log('\u0007');
    console.log('\u0007');
  })
  
  it("Should check for contract's ownership!", async function () {
    expect(await nft.owner()).to.equal(accounts[0].address);
  });

//   it ("should unpause", async () => {
// 	  await nft.togglePauseState();
//   })

  it("Should redeem an NFT from a signed voucher", async function() {
	  let tx = await nft.togglePauseState();
    await tx.wait()
    const lazyMinter = new LazyMinter({ contract: nft, signer: account })
    const voucher = await lazyMinter.createVoucher(1, 5, 10, "ipfs://QmTBUog5UCCJWeBsVi73HinyBYfbpfAqq5vmK1jBSqs3nR/1.json", "0x096DABeFE2DE1DeAF8E40368918d7B171aAf911c", "0x0000000000000000000000000000000000000000");

    console.log(voucher)
    tx = await nft.redeem(voucher, { value: "50" });
    await tx.wait()

    const voucher2 = await lazyMinter.createVoucher(3, 3, 20, "ipfs://QmTBUog5UCCJWeBsVi73HinyBYfbpfAqq5vmK1jBSqs3nR/3.json", "0x096DABeFE2DE1DeAF8E40368918d7B171aAf911c", usdc.address);
    console.log(voucher2)
    tx = await nft.setTokens([usdc.address], true)
    await tx.wait()
    tx = await usdc.approve(nft.address, "1000000000000000000000000")
    await tx.wait()
    tx = await nft.redeem(voucher2);
    await tx.wait()

//     await expect(redeemerContract.redeem(redeemer.address, voucher))
//       .to.emit(contract, 'Transfer')  // transfer from null address to minter
//       .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
//       .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
//       .withArgs(minter.address, redeemer.address, voucher.tokenId);
  });


});
