var helper = require('./helper')
var BearCrowdSale = artifacts.require("BearCrowdSale");
var BearToken = artifacts.require("BearToken");
var TokenTimelock = artifacts.require("TokenTimelock");

let LOCK_STAKE = 800;  
let DEV_TEAM_STAKE = 98;     
let COMMUNITY_STAKE = 2;     
let PRE_SALE_STAKE = 60;      
let OPEN_SALE_STAKE = 40;
let TOTAL_SUPPLY = 10000000000;
let DIVISOR_STAKE = 1000;

/// Exchange rates for first phase
let PRICE_RATE_FIRST = 20833;
/// Exchange rates for second phase
let PRICE_RATE_SECOND = 18518;
/// Exchange rates for last phase
let PRICE_RATE_LAST = 16667;

contract('BearCrowdSale', function(accounts) {
  it("BearCrowdSale start", async function () {
    let saleContract =  await BearCrowdSale.deployed();
    //console.log(saleContract);

    // get token contract
    let address = await saleContract.bearToken();
    console.log("BearCrowdSale start: bearToken: " + address);
    let tokenContract = await BearToken.at(address)
    let maxTotalSupply = await tokenContract.maxTotalSupply();
    console.log("BearToken maxTotalSupply: " + helper.fromWei(maxTotalSupply).valueOf());

    let tokenOwner = await tokenContract.owner();
    let saleOwner = await saleContract.owner();
    console.log("BearToken owner: " + tokenOwner);
    assert.equal(tokenOwner, saleOwner, "owner is ok");
    

    let localContractAddress = await saleContract.tokenTimelock();
    console.log("tokenTimelock start: tokenTimelock: " + localContractAddress);
    let lockContract = await TokenTimelock.at(address) 

    /////// 测试分配的值是否正确
    let lockBalance = await tokenContract.balanceOf(localContractAddress);
    console.log("lockBalance: " + helper.fromWei(lockBalance).valueOf());
    assert.equal(helper.fromWei(lockBalance),  TOTAL_SUPPLY*LOCK_STAKE/DIVISOR_STAKE, "lockBalance is ok");

    let presaleBalance = await tokenContract.balanceOf(accounts[2]);
    console.log("presaleBalance: " + helper.fromWei(presaleBalance).valueOf());
    assert.equal(helper.fromWei(presaleBalance),  TOTAL_SUPPLY*PRE_SALE_STAKE/DIVISOR_STAKE, "presaleBalance is ok");

    let teamBalance = await tokenContract.balanceOf(accounts[4]);
    console.log("teamBalance: " + helper.fromWei(teamBalance).valueOf());
    assert.equal(helper.fromWei(teamBalance),  TOTAL_SUPPLY*DEV_TEAM_STAKE/DIVISOR_STAKE, "teamBalance is ok");

    let communityBalance = await tokenContract.balanceOf(accounts[5]);
    console.log("communityBalance: " + helper.fromWei(communityBalance).valueOf());
    assert.equal(helper.fromWei(communityBalance),  TOTAL_SUPPLY*COMMUNITY_STAKE/DIVISOR_STAKE, "communityBalance is ok");

    
    /// test token transfer
    let transferAmount = 1000;
    let result = await tokenContract.transfer(accounts[6], helper.toWei(transferAmount), {from: accounts[2]});
    //console.log(result);
    presaleBalance = await tokenContract.balanceOf(accounts[2]);
    assert.equal(helper.fromWei(presaleBalance),  
      (TOTAL_SUPPLY*PRE_SALE_STAKE/DIVISOR_STAKE-transferAmount), "lockBalance is ok after transfer");
    
    /// test buy token
    let account = accounts[7];
    let walletAddress = accounts[1];
    let ethBalance = web3.eth.getBalance(account);
    console.log('account %s balance %deth', account, helper.fromWei(ethBalance));
    let value = 2;
    console.log("saleContract.address = "+ saleContract.address);
    try{
      let transactionResult = await web3.eth.sendTransaction({from:account, to:saleContract.address ,value:helper.toWei(10)})
    }catch(err){
      console.log(err);
      // set whitelist
      result = await saleContract.setWhiteList([account, accounts[9]], 1);
      console.log(result);
      
      let walletBalanceBefore = web3.eth.getBalance(walletAddress);
      console.log('walletBalanceBefore ' + helper.fromWei(walletBalanceBefore));

      let buyResult = await web3.eth.sendTransaction({from:account, to:saleContract.address ,value:helper.toWei(value)})
      console.log(buyResult);
      ethBalance = await web3.eth.getBalance(account);
      console.log('balance ' + helper.fromWei(ethBalance));
      let mpcBalance = await tokenContract.balanceOf(account);
      console.log('mpcBalance ' + helper.fromWei(mpcBalance));
      assert.equal(helper.fromWei(mpcBalance),  PRICE_RATE_FIRST*value, "get right mpc");

      let walletBalanceAfter = await web3.eth.getBalance(walletAddress);
      console.log('after transaction: walletBalanceAfter ' + helper.fromWei(walletBalanceAfter));
      //console.log('transaction: walletBalanceAfter ' + (parseInt(helper.fromWei(walletBalanceBefore), 10)+value) );
      assert.equal(helper.fromWei(walletBalanceAfter),
        (parseInt(helper.fromWei(walletBalanceBefore), 10)+value), "wallet has right eth");
      

      //////// set minBuyLimit
      console.log("\n\n test minBuyLimit");
      let minSet = 5;
      let minBuyLimit = await saleContract.minBuyLimit();
      console.log('minBuyLimit '+ helper.fromWei(minBuyLimit) );
      result = await saleContract.setMinBuyLimit(helper.toWei(minSet));
      minBuyLimit = await saleContract.minBuyLimit();
      console.log('after minBuyLimit '+ helper.fromWei(minBuyLimit) );
      assert.equal(helper.fromWei(minBuyLimit), minSet, "min buy limit is ok");
      try{
        buyResult = await web3.eth.sendTransaction({from:account, to:saleContract.address ,value:helper.toWei(value)})
      }catch(err){
        console.log(err);
        await saleContract.setMinBuyLimit(helper.toWei(0.1));
        minBuyLimit = await saleContract.minBuyLimit();
        console.log('after minBuyLimit2 '+ helper.fromWei(minBuyLimit) );
        buyResult = await web3.eth.sendTransaction({from:account, to:saleContract.address ,value:helper.toWei(value)})
        console.log(buyResult);
        let walletBalanceAfter2 = await web3.eth.getBalance(walletAddress);
        console.log("walletBalanceAfter2 "+helper.fromWei(walletBalanceAfter2));
      }

      ///////// test maxBuyLimit
      console.log("\n\n test maxBuyLimit");
      let maxSet = 0.2;
      console.log('1111111');
      let maxBuyLimit = await saleContract.maxBuyLimit();//maxBuyLimit();
      console.log('2222222');
      console.log('maxBuyLimit '+ helper.fromWei(maxBuyLimit) );
      result = await saleContract.setMaxBuyLimit(helper.toWei(maxSet));
      maxBuyLimit = await saleContract.maxBuyLimit();
      console.log('after maxBuyLimit '+ helper.fromWei(maxBuyLimit) );
      assert.equal(helper.fromWei(maxBuyLimit), maxSet, "max buy limit is ok");
      try{
        buyResult = await web3.eth.sendTransaction({from:account, to:saleContract.address ,value:helper.toWei(value)})
      }catch(err){
        console.log(err);
        await saleContract.setMaxBuyLimit(helper.toWei(10));
        maxBuyLimit = await saleContract.maxBuyLimit();
        console.log('after maxBuyLimit2 '+ helper.fromWei(maxBuyLimit) );
        buyResult = await web3.eth.sendTransaction({from:account, to:saleContract.address ,value:helper.toWei(value)})
        console.log(buyResult);
        let walletBalanceAfter2 = await web3.eth.getBalance(walletAddress);
        console.log("walletBalanceAfter2 "+helper.fromWei(walletBalanceAfter2));
      }

      ///// test set wallet
      let wa1 = await saleContract.wallet();
      assert(wa1, walletAddress, "wallet address is ok");

      let newWalletAddress = accounts[8];
      let walletBalance = await web3.eth.getBalance(newWalletAddress);
      console.log('new wallet address old balance is '+ helper.fromWei(walletBalance));
      let walletResult = await saleContract.setWallet(newWalletAddress);
      console.log(walletResult);
      assert(newWalletAddress, await saleContract.wallet(), "wallet new address is ok");
      walletResult = await web3.eth.sendTransaction({from:account, to:saleContract.address ,value:helper.toWei(value)})
      console.log(walletResult);
      let newWalletBalance = await web3.eth.getBalance(newWalletAddress);
      console.log('new wallet address new balance is '+ helper.fromWei(newWalletBalance));
      assert(helper.fromWei(walletBalance), parseInt(helper.fromWei(newWalletBalance))-value, "new wallet eth is ok is ok");

    }
    

    // //// test paused

  });


  it('BearCrowSale test buy token', async function(){
      let now = Math.floor((new Date()).valueOf()/1000);
      let saleContract = await BearCrowdSale.new(accounts[0], accounts[1],accounts[2],accounts[3],accounts[4],accounts[5], now);

      let openSoldTokens = await saleContract.openSoldTokens();
      console.log('openSoldTokens ' + openSoldTokens);


      let tokenAddress = await saleContract.bearToken();
      console.log("BearCrowdSale start: bearToken: " + tokenAddress);
      let tokenContract = await BearToken.at(tokenAddress);
      let account = accounts[7];
      result = await saleContract.setWhiteList([account, accounts[9]], 1);
      console.log(result);
      let value = 1;
      let walletAddress = accounts[1];


      //  1 
      let walletBalanceBefore = web3.eth.getBalance(walletAddress);
      console.log('walletBalanceBefore ' + helper.fromWei(walletBalanceBefore));
      let buyResult = await web3.eth.sendTransaction({from:account, to:saleContract.address ,value:helper.toWei(value)})
      console.log(buyResult);
      ethBalance = await web3.eth.getBalance(account);
      console.log('balance ' + helper.fromWei(ethBalance));
      let mpcBalance = await tokenContract.balanceOf(account);
      console.log('mpcBalance ' + helper.fromWei(mpcBalance));
      assert.equal(helper.fromWei(mpcBalance),  PRICE_RATE_FIRST*value, "get right mpc");
      let walletBalanceAfter = await web3.eth.getBalance(walletAddress);
      console.log('after transaction: walletBalanceAfter ' + helper.fromWei(walletBalanceAfter));
      //console.log('transaction: walletBalanceAfter ' + (parseInt(helper.fromWei(walletBalanceBefore), 10)+value) );
      assert.equal(helper.fromWei(walletBalanceAfter),
        (parseInt(helper.fromWei(walletBalanceBefore), 10)+value), "wallet has right eth");

      openSoldTokens = await saleContract.openSoldTokens();
      console.log('openSoldTokens ' + openSoldTokens);
      assert.equal(helper.fromWei(openSoldTokens),PRICE_RATE_FIRST*value, "wallet has right eth");      
  });


  it('BearCrowSale test release token', async function(){
    let now = (new Date()).valueOf()/1000;
    let saleContract = await BearCrowdSale.new(accounts[0], accounts[1],accounts[2],accounts[3],accounts[4],accounts[5], now);
    let address = await saleContract.bearToken.call();
    console.log("BearCrowSale Create: bearToken: " + address);

    let tokenAddress = await saleContract.bearToken();
    console.log("BearCrowdSale start: bearToken: " + tokenAddress);
    let tokenContract = await BearToken.at(tokenAddress);

    let localContractAddress = await saleContract.tokenTimelock();
    console.log("tokenTimelock start: tokenTimelock: " + localContractAddress);
    let lockContract = await TokenTimelock.at(localContractAddress) 
    
    // 必须把release的时间改为  3 seconds 才能正确测试这段代码
    // try{
    //   result = await saleContract.releaseLockToken();
    // }catch(err){
    //   console.log(err);
    //   for(var i = 0; i < 1000000000; i++){
    //     var j = i; 
    //     j = j*10;
    //     j = j**10;
    //   }

    //   console.log('releaseLockToken')
    //   result = await saleContract.releaseLockToken();
    //   console.log(result);

    //   let lockBalance = await tokenContract.balanceOf(accounts[3]);
    //   assert.equal(helper.fromWei(lockBalance),  TOTAL_SUPPLY*LOCK_STAKE/DIVISOR_STAKE, "lockBalance is ok");

    //   let lockContractBalance = await tokenContract.balanceOf(localContractAddress);
    //   console.log("lockContractBalance: " + helper.fromWei(lockContractBalance).valueOf());
    //   assert.equal(helper.fromWei(lockContractBalance),  0, "lockContractBalance is ok");
    // }
});

});
