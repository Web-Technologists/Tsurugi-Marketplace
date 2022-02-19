const { expect } = require("chai");
const { ethers } = require("hardhat");
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545"); 
const { LazyMinter } = require("../scripts/signer");

describe("NFT", function () {

  before(async() =>{
    const NFT = await ethers.getContractFactory("NFT");
    nft = await NFT.deploy("LazyNFT", "1" );
    await nft.deployed();

    accounts = await ethers.getSigners();
    
  })

  it("Should check for contract's ownership!", async function () {
    expect(await nft.owner()).to.equal(accounts[0].address);
  });

//   it ("should unpause", async () => {
// 	  await nft.togglePauseState();
//   })

  it("Should redeem an NFT from a signed voucher", async function() {
	await nft.togglePauseState();
    const lazyMinter = new LazyMinter({ contract: nft, signer: accounts[0] })
    const voucher = await lazyMinter.createVoucher(1, 5, 10, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", accounts[2].address, "0x0000000000000000000000000000000000000000");

	const NFTVoucher = {
		tokenId: 1, 
		quantity: 5, 
		minPrice: 10, 
		uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 
		creator: accounts[2].address, 
		token: "0x0000000000000000000000000000000000000000"
	}
	console.log(NFTVoucher, voucher)
	await nft.connect(accounts[1]).redeem(voucher, { value: "50" });
    const voucher2 = await lazyMinter.createVoucher(1, 11, 2, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", accounts[2].address, "0x0000000000000000000000000000000000000000");
	await nft.connect(accounts[2]).redeem(voucher2, { value: "22" });
//     await expect(redeemerContract.redeem(redeemer.address, voucher))
//       .to.emit(contract, 'Transfer')  // transfer from null address to minter
//       .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
//       .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
//       .withArgs(minter.address, redeemer.address, voucher.tokenId);
  });


});
