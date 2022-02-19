# Tsurugi-Marketplace

Steps for integrating backend with smart contracts:
1. Create an instance of `lazyMinter` class from `signer.js`
    - `const lazyMinter = new LazyMinter({ contract: nftContractInstance, signer: owner/minter account })`
2. Upload images to ipfs, along with their metadata. Metadata can include:
    - image url
    - name
    - description
    - price of nft
    - payment token
3. Create NFT signature for lazymint
    - `await lazyMinter.createVoucher(tokenId, quantity, minPrice, token uri(calculated in previous step), creator address, payment token address);`
4. This data generated in last step can be stored in ipfs/database corresponding to each tokenID for retrieval when the buy transaction is called by the user
5. The smart contract has a redeem function which takes input the value returned by the step 3 or the value stored in step 4. If the nft has payment token apart from zero address, make sure that before redeem, appropriat approval has been taken.