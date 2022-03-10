const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber, utils, constants } = require("ethers");
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545"); 
const { LazyMinter } = require("../scripts/signer");

const weiToEther = (n) => {
    return web3.utils.fromWei(n.toString(), "ether");
  };

describe("NFT", function () {

  beforeEach(async() =>{
    accounts = await ethers.getSigners();

    const USDC = await ethers.getContractFactory("USDC");
    usdc = await USDC.deploy();
    await usdc.deployed();

    const NFT = await ethers.getContractFactory("NFTERC721Test");
    nft = await NFT.deploy("LazyNFT", "TST" );
    await nft.deployed();

    const NFT1155 = await ethers.getContractFactory("NFTERC1155Test");
    nft1155 = await NFT1155.deploy();
    await nft1155.deployed();

    const TOKENREGISTRY = await ethers.getContractFactory("TokenRegistry");
    tokenRegistry = await TOKENREGISTRY.deploy();
    await tokenRegistry.deployed();

    const MARKETPLACE = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await MARKETPLACE.deploy(tokenRegistry.address, 50, accounts[5].address);
    await marketplace.deployed();

    artist = accounts[1]
    buyer = accounts[2]
    platformFeeRecipient = accounts[5]
  })

  it("Should print addresses", async () => {
      console.log({
        nft: nft.address,
        usdc: usdc.address,
        nft1155: nft1155.address,
        tokenRegistry: tokenRegistry.address,
        marketplace: marketplace.address,
      })
  })

  it("Should check for contract's ownership!", async function () {
    expect(await nft.owner()).to.equal(accounts[0].address);
  });

  it("Should add paytoken", async () => {
      await tokenRegistry.add(usdc.address);
  })

  it("Scenario 1", async function () {
    console.log(`
        Scenario 1:
        An artist mints an NFT for him/herself
        He/She then put it on the marketplace with price of 20 Tokens
        A buyer then buys that NFT with ERC20
        `);

    await tokenRegistry.add(usdc.address);
    await marketplace.updateNFTContract(nft1155.address)
    await nft1155.updateAddresses(marketplace.address, constants.AddressZero);

    console.log(`
        The artist should mint nft`);
    await nft.mint(artist.address, 1)
    await nft1155.mint(artist.address, 1, 10)

    console.log(`
        The artist approves the nft to the market`);
    await nft.connect(artist).setApprovalForAll(marketplace.address, true);
    await nft1155.connect(artist).setApprovalForAll(marketplace.address, true);

    console.log(`
        The artist lists the nft in the market with price 20 Token and starting time 2021-09-22 10:00:00 GMT`);
    await marketplace.connect(artist).listItem(
        nft.address,
      BigNumber.from("1"),
      BigNumber.from("1"),
      usdc.address,
      utils.parseEther("20"),
      BigNumber.from("1632304800"), // 2021-09-22 10:00:00 GMT
    );

    await marketplace.connect(artist).listItem(
        nft1155.address,
      BigNumber.from("1"),
      BigNumber.from("10"),
      usdc.address,
      utils.parseEther("20"),
      BigNumber.from("1632304800"), // 2021-09-22 10:00:00 GMT
    );

    await marketplace.connect(artist).createNFTAndList(
      BigNumber.from("10"),
      "IPFS://DUMMY",
      usdc.address,
      utils.parseEther("20"),
      BigNumber.from("1632304800"), // 2021-09-22 10:00:00 GMT
    );

    let listing = await marketplace.listings(
      nft.address,
      BigNumber.from("1"),
      artist.address
    );
    console.log(`
        *The nft should be on the marketplace listing`);
    expect(listing.quantity.toString()).to.be.equal("1");
    expect(listing.payToken).to.be.equal(usdc.address);
    expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(20);
    expect(listing.startingTime.toString()).to.be.equal("1632304800");

    console.log(`
        Mint 50 Tokens to buyer so he can buy the nft`);
    await usdc.mint(buyer.address, utils.parseEther("50"));
    await usdc.mint(buyer.address, utils.parseEther("550"));

    console.log(`
        Buyer approves Marketplace to transfer up to 50 Token`);
    await usdc.connect(buyer).approve(
      marketplace.address,
      utils.parseEther("50")
    );
    await usdc.connect(buyer).approve(
        marketplace.address,
        utils.parseEther("550")
    );  

    console.log(`
        Buyer buys the nft for 20 Tokens`);
    result = await marketplace.connect(buyer).buyItemWithERC20(
      // function overloading doesn't work
      nft.address,
      BigNumber.from("1"),
      usdc.address,
      artist.address
    );

    await marketplace.connect(buyer).buyItemWithERC20(
        // function overloading doesn't work
        nft1155.address,
        BigNumber.from("1"),
        usdc.address,
        artist.address
    );

    await marketplace.connect(buyer).buyItemWithERC20(
        // function overloading doesn't work
        nft1155.address,
        BigNumber.from("1000000000000000001"),
        usdc.address,
        artist.address
    );

    await marketplace.payEscrow(nft.address, BigNumber.from("1"), artist.address);
    await marketplace.payEscrow(nft1155.address, BigNumber.from("1"), artist.address);
    await marketplace.payEscrow(nft1155.address, BigNumber.from("1000000000000000001"), artist.address);

    console.log(`
        *Event ItemSold should be emitted with correct values: 
        seller = ${artist.address}, 
        buyer = ${buyer.address}, 
        nft = ${nft.address},
        tokenId = 1,
        quantity =1,
        payToken = ${usdc.address},
        unitPrice = 20,
        pricePerItem = 20`);

    balance = await usdc.balanceOf(buyer.address);
    console.log(`
        *The Token balance of buyer now should be 30 Tokens`);
    expect(weiToEther(balance) * 1).to.be.equal(180);

    const nftOwner = await nft.ownerOf(1);
    console.log(`
        The owner of the nft now should be the buyer`);
    expect(nftOwner).to.be.equal(buyer.address);

    balance = await usdc.balanceOf(artist.address);
    console.log(`
        *The Token balance of the artist should be 19 Tokens`);
    expect(weiToEther(balance) * 1).to.be.equal(399);

    balance = await usdc.balanceOf(platformFeeRecipient.address);
    console.log(`
        *The Token balance of the recipient should be 1 Token`);
    expect(weiToEther(balance) * 1).to.be.equal(21);

    listing = await marketplace.listings(
      nft.address,
      BigNumber.from("1"),
      artist.address
    );
    console.log(`
        *The nft now should be removed from the listing`);
    expect(listing.quantity.toString()).to.be.equal("0");
    expect(listing.payToken).to.be.equal(constants.AddressZero);
    expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(0);
    expect(listing.startingTime.toString()).to.be.equal("0");

    console.log("");
  });
  it("Scenario 2", async function () {
    console.log(`
        Scenario 1:
        An artist mints an NFT for him/herself
        He/She then put it on the marketplace with price of 20 eth
        A buyer then buys that NFT with eth
        `);
    await tokenRegistry.add(usdc.address);
    await marketplace.updateNFTContract(nft1155.address)
    await nft1155.updateAddresses(marketplace.address, constants.AddressZero);

    console.log(`
        The artist should mint nft`);
    await nft.mint(artist.address, 1)
    await nft1155.mint(artist.address, 1, 10)    

    console.log(`
        The artist approves the nft to the market`);
    await nft.connect(artist).setApprovalForAll(marketplace.address, true);
    await nft1155.connect(artist).setApprovalForAll(marketplace.address, true);

    console.log(`
        The artist lists the nft in the market with price 20 Token and starting time 2021-09-22 10:00:00 GMT`);
    await marketplace.connect(artist).listItem(
        nft.address,
      BigNumber.from("1"),
      BigNumber.from("1"),
      constants.AddressZero,
      utils.parseEther("20"),
      BigNumber.from("1632304800"), // 2021-09-22 10:00:00 GMT
    );

    await marketplace.connect(artist).listItem(
        nft1155.address,
      BigNumber.from("1"),
      BigNumber.from("10"),
      constants.AddressZero,
      utils.parseEther("20"),
      BigNumber.from("1632304800"), // 2021-09-22 10:00:00 GMT
    );

    await marketplace.connect(artist).createNFTAndList(
      BigNumber.from("10"),
      "IPFS://DUMMY",
      constants.AddressZero,
      utils.parseEther("20"),
      BigNumber.from("1632304800"), // 2021-09-22 10:00:00 GMT
    );

    let listing = await marketplace.listings(
      nft.address,
      BigNumber.from("1"),
      artist.address
    );
    console.log(`
        *The nft should be on the marketplace listing`);
    expect(listing.quantity.toString()).to.be.equal("1");
    expect(listing.payToken).to.be.equal(constants.AddressZero);
    expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(20);
    expect(listing.startingTime.toString()).to.be.equal("1632304800");

    balance1 = await web3.eth.getBalance(buyer.address);
    console.log(`
    The buyer's ETH balance before buying: ${weiToEther(balance1)}`);

    balance2 = await web3.eth.getBalance(artist.address);
    console.log(`
    The artist's ETH balance before the nfts is sold: ${weiToEther(
      balance2
    )}`);

    balance3 = await web3.eth.getBalance(platformFeeRecipient.address);
    console.log(`
    The platform fee recipient before the nft is sold: ${weiToEther(
      balance3
    )}`);

    console.log(`
        Buyer buys the nft for 20 ETH`);
    result = await marketplace.connect(buyer).buyItem(
      // function overloading doesn't work
      nft.address,
      BigNumber.from("1"),
      artist.address,
      { value: utils.parseEther("20") }
    );

    await marketplace.connect(buyer).buyItem(
        // function overloading doesn't work
        nft1155.address,
        BigNumber.from("1"),
        artist.address,
        { value: utils.parseEther("200") }
    );

    await marketplace.connect(buyer).buyItem(
        nft1155.address,
        BigNumber.from("1000000000000000001"),
        artist.address,
        { value: utils.parseEther("200") }
    );

    await marketplace.payEscrow(nft.address, BigNumber.from("1"), artist.address);
    await marketplace.payEscrow(nft1155.address, BigNumber.from("1"), artist.address);
    await marketplace.payEscrow(nft1155.address, BigNumber.from("1000000000000000001"), artist.address);

    console.log(`
        *Event ItemSold should be emitted with correct values: 
        seller = ${artist.address}, 
        buyer = ${buyer.address}, 
        nft = ${nft.address},
        tokenId = 1,
        quantity =1,
        payToken = ${constants.AddressZero},
        unitPrice = 20,
        pricePerItem = 20`);

    const nftOwner = await nft.ownerOf(1);
    console.log(`
        The owner of the nft now should be the buyer`);
    expect(nftOwner).to.be.equal(buyer.address);

    balance4 = await web3.eth.getBalance(buyer.address);
    console.log(`
    The buyer's ETH balance after buying: ${weiToEther(balance4)}`);

    console.log(`
    *The difference of the buyer's ETH balance should be more than 220 eth as buying costs some gases
    but should be less than 221 ETH as the gas shouldn't cost more than 1 ETH`);
    expect(
      weiToEther(balance1) * 1 - weiToEther(balance4) * 1
    ).to.be.equal(420);
    // expect(
    //   weiToEther(balance1) * 1 - weiToEther(balance4) * 1
    // ).to.be.lessThan(221);

    const balance5 = await web3.eth.getBalance(artist.address);
    console.log(`
    The artist's ETH balance after the nfts is sold: ${weiToEther(
      balance5
    )}`);
    console.log(`
    *The difference of the artist's ETH balance should be 19 ETH`);
    expect(
      (weiToEther(balance5) * 1 - weiToEther(balance2) * 1).toFixed(5) * 1
    ).to.be.equal(398);

    balance6 = await web3.eth.getBalance(platformFeeRecipient.address);
    console.log(`
    The platform fee recipient after the nft is sold: ${weiToEther(
      balance6
    )}`);
    console.log(`
    *The difference of the platform fee recipient's ETH balance should be 1 ETH`);
    expect(weiToEther(balance6) * 1 - weiToEther(balance3) * 1).to.be.equal(
      20
    );


    listing = await marketplace.listings(
      nft.address,
      BigNumber.from("1"),
      artist.address
    );
    console.log(`
        *The nft now should be removed from the listing`);
    expect(listing.quantity.toString()).to.be.equal("0");
    expect(listing.payToken).to.be.equal(constants.AddressZero);
    expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(0);
    expect(listing.startingTime.toString()).to.be.equal("0");

    console.log("");
  });

  //TODO offer and royalty test
});
