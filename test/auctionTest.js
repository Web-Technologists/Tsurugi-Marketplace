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

    const AUCTION = await ethers.getContractFactory("MockNFTAuction");
    auction = await AUCTION.deploy(marketplace.address, tokenRegistry.address, accounts[5].address, 25);

    artist = accounts[1]
    buyer = accounts[2]
    platformFeeRecipient = accounts[5]
    bidder1 = accounts[6]
    bidder2 = accounts[7]
    bidder3 = accounts[8]
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
    An artist mints an NFT from him/herself
    He/She then put it on an auction with reserve price of 20 OCT
    Bidder1, bidder2, bidder3 then bid the auction with 20 OCT, 25 OCT, and 30 OCT respectively`);

    await tokenRegistry.add(usdc.address);
    await auction.updateBidWithdrawalLockTime(0)

    console.log(`
        The artist should mint nft`);
    await nft.mint(artist.address, 1)
    await nft1155.mint(artist.address, 1, 10)
    
    console.log(`
    The artist approves the nft to the market`);
    await nft.connect(artist).setApprovalForAll(auction.address, true);
    await nft1155.connect(artist).setApprovalForAll(auction.address, true);

    console.log(`
    Let's mock that the current time: 2021-09-25 10:00:00`);
    await auction.setTime(BigNumber.from("1632564000"));

    console.log(`
    The artist auctions his nfts with reserve price of 20 OCT`);
    result = await auction.connect(artist).createAuction(
      nft.address,
      BigNumber.from("1"),
      BigNumber.from("1"),
      usdc.address,
      utils.parseEther("20"),
      BigNumber.from("1632564000"), // 2021-09-25 10:00:00
      BigNumber.from("1632996000"), // 2021-09-30 10:00:00
    );
    await auction.connect(artist).createAuction(
        nft1155.address,
        BigNumber.from("1"),
        BigNumber.from("10"),
        usdc.address,
        utils.parseEther("20"),
        BigNumber.from("1632564000"), // 2021-09-25 10:00:00
        BigNumber.from("1632996000"), // 2021-09-30 10:00:00
    );

    console.log(`
    *Event AuctionCreated should be emitted with correct values: 
    nftAddress = ${nft.address}, 
    tokenId = 1, 
    payToken = ${usdc.address}`);

    console.log(`
    Mint 50 OCT to bidder1 so he can bid the auctioned nft`);
    await usdc.mint(bidder1.address, utils.parseEther("50"));
    await usdc.mint(bidder1.address, utils.parseEther("50"));

    console.log(`
    Bidder1 approves OctaMarketplace to transfer up to 50 OCT`);
    await usdc.connect(bidder1).approve(auction.address, utils.parseEther("50"));

    console.log(`
    Mint 50 OCT to bidder2 so he can bid the auctioned nft`);
    await usdc.mint(bidder2.address, utils.parseEther("50"));
    await usdc.mint(bidder2.address, utils.parseEther("50"));

    console.log(`
    Bidder2 approves OctaMarketplace to transfer up to 50 OCT`);
    await usdc.connect(bidder2).approve(auction.address, utils.parseEther("50"));

    console.log(`
    Mint 50 OCT to bidder3 so he can bid the auctioned nft`);
    await usdc.mint(bidder3.address, utils.parseEther("50"));
    await usdc.mint(bidder3.address, utils.parseEther("50"));

    console.log(`
    Bidder3 approves OctaMarketplace to transfer up to 50 OCT`);
    await usdc.connect(bidder3).approve(auction.address, utils.parseEther("60"));

    console.log(`
    Bidder1 place a bid of 20 OCT`);
    await auction.connect(bidder1).placeBidWithERC20(
      nft.address,
      BigNumber.from("1"),
      utils.parseEther("20")
    );
    await auction.connect(bidder1).placeBidWithERC20(
        nft1155.address,
        BigNumber.from("1"),
        utils.parseEther("20")
    );

    balance = await usdc.balanceOf(bidder1.address);
    console.log(`
    *Bidder1's OCT balance after bidding should be 30 OCT`);
    expect(weiToEther(balance) * 1).to.be.equal(60);

    console.log(`
    Bidder2 place a bid of 25 OCT`);
    await auction.connect(bidder2).placeBidWithERC20(
      nft.address,
      BigNumber.from("1"),
      utils.parseEther("25"));
    await auction.connect(bidder2).placeBidWithERC20(
        nft1155.address,
        BigNumber.from("1"),
        utils.parseEther("25"));

    await auction.connect(bidder1).withdrawBid(nft.address, BigNumber.from("1"), 1);
    await auction.connect(bidder1).withdrawBid(nft1155.address, BigNumber.from("1"), 1);
    balance = await usdc.balanceOf(bidder1.address);
    console.log(`
    *Bidder1's OCT balance after bidder2 outbid should be back to 50 OCT`);
    expect(weiToEther(balance) * 1).to.be.equal(100);

    balance = await usdc.balanceOf(bidder2.address);
    console.log(`
    *Bidder2's OCT balance after bidding should be 25`);
    expect(weiToEther(balance) * 1).to.be.equal(50);

    console.log(`
    Bidder3 place a bid of 30 OCT`);
    await auction.connect(bidder3).placeBidWithERC20(
      nft.address,
      BigNumber.from("1"),
      utils.parseEther("30"),
    );
    await auction.connect(bidder3).placeBidWithERC20(
        nft1155.address,
        BigNumber.from("1"),
        utils.parseEther("30"),
    );

    await auction.connect(bidder2).withdrawBid(nft.address, BigNumber.from("1"), 2);
    await auction.connect(bidder2).withdrawBid(nft1155.address, BigNumber.from("1"), 2);
    balance = await usdc.balanceOf(bidder2.address);
    console.log(`
    *Bidder2's OCT balance after bidder3 outbid should be back to 50 OCT`);
    expect(weiToEther(balance) * 1).to.be.equal(100);

    balance = await usdc.balanceOf(bidder3.address);
    console.log(`
    *Bidder3's OCT balance after bidding should be 20`);
    expect(weiToEther(balance) * 1).to.be.equal(40);

    console.log(`
    Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
    await auction.setTime(BigNumber.from("1632999600"));

    console.log(`
    The artist tries to make the auction complete`);
    result = await auction.connect(artist).resultAuction(
      nft.address,
      BigNumber.from("1"));

    await auction.connect(artist).manualResultAuction(
        nft1155.address,
        BigNumber.from("1"),
        3);

    await auction.payEscrow(nft.address, BigNumber.from("1"), artist.address);
    await auction.payEscrow(nft1155.address, BigNumber.from("1"), artist.address);

    console.log(`
    *As the platformFee is 2.5%, the platform fee recipient should get 2.5% of (30 - 20) which is 0.25 OCT.`);
    balance = await usdc.balanceOf(platformFeeRecipient.address);
    expect(weiToEther(balance) * 1).to.be.equal(0.5);

    console.log(`
    *The artist should get 29.75 OCT.`);
    balance = await usdc.balanceOf(artist.address);
    expect(weiToEther(balance) * 1).to.be.equal(59.5);

    const nftOwner = await nft.ownerOf("1");
    console.log(`
    *The owner of the nft now should be the bidder3`);
    expect(nftOwner).to.be.equal(bidder3.address);

    console.log(`
    *Event AuctionResulted should be emitted with correct values: 
    nftAddress = ${nft.address}, 
    tokenId = 1,
    winner = ${bidder3} ,
    payToken = ${usdc.address},
    unitPrice = 0,
    winningBid = 30`);
  });

  it("Scenario 2", async function () {
    console.log(`
    Scenario 2:
    An artist mints an NFT from him/herself
    He/She then put it on an auction with reserve price of 10 ETH
    Bidder1, bidder2, bidder3 then bid the auction with 10 ETH, 15 ETH, and 20 ETH respectively`);

    await tokenRegistry.add(usdc.address);
    await auction.updateBidWithdrawalLockTime(0)

    console.log(`
        The artist should mint nft`);
    await nft.mint(artist.address, 1)
    await nft1155.mint(artist.address, 1, 10)
    
    console.log(`
    The artist approves the nft to the market`);
    await nft.connect(artist).setApprovalForAll(auction.address, true);
    await nft1155.connect(artist).setApprovalForAll(auction.address, true);

    console.log(`
    Let's mock that the current time: 2021-09-25 10:00:00`);
    await auction.setTime(BigNumber.from("1632564000"));

    console.log(`
    The artist auctions his nfts with reserve price of 20 OCT`);
    result = await auction.connect(artist).createAuction(
      nft.address,
      BigNumber.from("1"),
      BigNumber.from("1"),
      constants.AddressZero,
      utils.parseEther("10"),
      BigNumber.from("1632564000"), // 2021-09-25 10:00:00
      BigNumber.from("1632996000"), // 2021-09-30 10:00:00
    );
    await auction.connect(artist).createAuction(
        nft1155.address,
        BigNumber.from("1"),
        BigNumber.from("10"),
        constants.AddressZero,
        utils.parseEther("10"),
        BigNumber.from("1632564000"), // 2021-09-25 10:00:00
        BigNumber.from("1632996000"), // 2021-09-30 10:00:00
    );

    console.log(`
    *Event AuctionCreated should be emitted with correct values: 
    nftAddress = ${nft.address}, 
    tokenId = 1, 
    payToken = ${constants.AddressZero}`);

    balance1 = await web3.eth.getBalance(bidder1.address);
    console.log(`
    Bidder1's ETH balance before bidding: ${weiToEther(balance1)}`);

    console.log(`
    Bidder1 places a bid of 10 ETH`);
    await auction.connect(bidder1).placeBid(
      nft.address,
      BigNumber.from("1"),
      { value: utils.parseEther("10") },
    );
    await auction.connect(bidder1).placeBid(
        nft1155.address,
        BigNumber.from("1"),
        { value: utils.parseEther("10") },
    );

    balance2 = await web3.eth.getBalance(bidder1.address);
    console.log(`
    Bidder1's ETH balance after bidding: ${weiToEther(balance2)}`);

    console.log(`
    *The difference of bidder1's ETH balance before and after bidding 
    should be more than 10 but less than 11 assuming that the gas fees are less than 1 ETH`);
    expect(
      weiToEther(balance1) * 1 - weiToEther(balance2) * 1
    ).to.be.equal(20);
    // expect(
    //   weiToEther(balance1) * 1 - weiToEther(balance2) * 1
    // ).to.be.lessThan(21);

    balance3 = await web3.eth.getBalance(bidder2.address);
    console.log(`
    Bidder2's ETH balance before bidding: ${weiToEther(balance3)}`);

    console.log(`
    Bidder2 places a bid of 15 ETH`);
    await auction.connect(bidder2).placeBid(
      nft.address,
      BigNumber.from("1"),
      { value: utils.parseEther("15") },);
    await auction.connect(bidder2).placeBid(
        nft1155.address,
        BigNumber.from("1"),
        { value: utils.parseEther("15") });



    await auction.connect(bidder1).withdrawBid(nft.address, BigNumber.from("1"), 1);
    await auction.connect(bidder1).withdrawBid(nft1155.address, BigNumber.from("1"), 1);
    balance4 = await web3.eth.getBalance(bidder2.address);
    console.log(`
    Bidder2's ETH balance after bidding: ${weiToEther(balance4)}`);

    console.log(`
    *The difference of bidder2's ETH balance before and after bidding 
    should be more than 15 but less than 16 assuming that the gas fees are less than 1 ETH`);
    expect(
        weiToEther(balance3) * 1 - weiToEther(balance4) * 1
    ).to.be.equal(30);
    // expect(
    //     weiToEther(balance3) * 1 - weiToEther(balance4) * 1
    // ).to.be.lessThan(32);

    balance1 = await web3.eth.getBalance(bidder1.address);
    console.log(`
    Bidder1's ETH balance after bidder2 outbid bidder1: ${weiToEther(
        balance1
    )}`);

    console.log(`
    *The difference of bidder1's ETH balance before and after 
    being outbid by bidder2 should 10`);
    expect(weiToEther(balance1) * 1 - weiToEther(balance2) * 1).to.be.equal(
        20
    );

    balance5 = await web3.eth.getBalance(bidder3.address);
    console.log(`
    Bidder3's ETH balance before bidding: ${weiToEther(balance5)}`);

    console.log(`
    Bidder3 places a bid of 20 ETH`);
    await auction.connect(bidder3).placeBid(
      nft.address,
      BigNumber.from("1"),
      { value: utils.parseEther("20") },
    );
    await auction.connect(bidder3).placeBid(
        nft1155.address,
        BigNumber.from("1"),
        { value: utils.parseEther("20") },
    );

    await auction.connect(bidder2).withdrawBid(nft.address, BigNumber.from("1"), 2);
    await auction.connect(bidder2).withdrawBid(nft1155.address, BigNumber.from("1"), 2);


    balance6 = await web3.eth.getBalance(bidder3.address);
    console.log(`
    Bidder3's ETH balance after bidding: ${weiToEther(balance6)}`);

    console.log(`
    *The difference of bidder3's ETH balance before and after bidding 
    should be more than 20 but less than 21 assuming that the gas fees are less than 1 ETH`);
    expect(
      weiToEther(balance5) * 1 - weiToEther(balance6) * 1
    ).to.be.equal(40);
    // expect(
    //   weiToEther(balance5) * 1 - weiToEther(balance6) * 1
    // ).to.be.lessThan(21);

    balance3 = await web3.eth.getBalance(bidder2.address);
    console.log(`
    Bidder2's ETH balance after bidder3 outbid bidder2: ${weiToEther(
      balance3
    )}`);

    console.log(`
    *The difference of bidder2's ETH balance before and after 
    being outbid by bidder3 should 15`);
    expect(weiToEther(balance3) * 1 - weiToEther(balance4) * 1).to.be.equal(
      30
    );

    console.log(`
    Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
    await auction.setTime(BigNumber.from("1632999600"));

    balance1 = await web3.eth.getBalance(platformFeeRecipient.address);
    console.log(`
    The platform fee recipient's ETH balance 
    before the artist completes the auction: ${weiToEther(balance1)}`);

    balance3 = await web3.eth.getBalance(artist.address);
    console.log(`
    The artist's ETH balance 
    before he completes the auction: ${weiToEther(balance3)}`);

    console.log(`
    The artist tries to make the auction complete`);
    result = await auction.connect(artist).resultAuction(
      nft.address,
      BigNumber.from("1"));

    await auction.connect(artist).manualResultAuction(
        nft1155.address,
        BigNumber.from("1"),
        3);
    
    await auction.payEscrow(nft.address, BigNumber.from("1"), artist.address);
    await auction.payEscrow(nft1155.address, BigNumber.from("1"), artist.address);

    balance2 = await web3.eth.getBalance(platformFeeRecipient.address);
    console.log(`
    The platform fee recipient's ETH balance 
    after the artist completes the auction: ${weiToEther(balance2)}`);

    balance4 = await web3.eth.getBalance(artist.address);
    console.log(`
    The artist's ETH balance 
    after he completes the auction: ${weiToEther(balance4)}`);

    console.log(`
    *As the platformFee is 2.5%, the platform fee recipient should get 2.5% of (20 - 10) which is 0.25.`);
    // expect(
    //     (weiToEther(balance2) * 1 - weiToEther(balance1) * 1).toFixed(2)
    // ).to.be.equal("0.5");

    console.log(`
    *The difference of the artist's ETH balance before and after 
    the auction completes should be 19.75`);
    expect(
        (weiToEther(balance4) * 1 - weiToEther(balance3) * 1).toFixed(2)
    ).to.be.equal("19.75");

    const nftOwner = await this.octa.ownerOf("1");
    console.log(`
    *The owner of the nft now should be the bidder3`);
    expect(nftOwner).to.be.equal(bidder3.address);

    console.log(`
    *Event AuctionResulted should be emitted with correct values: 
    nftAddress = ${nft.address}, 
    tokenId = 1,
    winner = ${bidder3.address} ,
    payToken = ${constants.AddressZero},
    unitPrice = 0,
    winningBid = 20`);
    
  });
});
