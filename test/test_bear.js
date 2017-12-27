var helper = require('./helper')
var BearCrowdSale = artifacts.require("BearCrowdSale");
var BearToken = artifacts.require("BearToken");
var TokenTimelock = artifacts.require("TokenTimelock");

let TOTAL_SUPPLY = 1000000000000;
let DIVISOR_STAKE = 100;

let LOCK_STAKE = 50;            
let OPEN_SALE_STAKE = 25;
let TEAM_STAKE = 25;


/// Exchange rates for first phase
let PRICE_RATE_FIRST = 10000000;
/// Exchange rates for second phase
let PRICE_RATE_SECOND = 5000000;
/// Exchange rates for last phase
let PRICE_RATE_LAST = 2500000;

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

    let teamAcount = accounts[3];
    let teamBalance = await tokenContract.balanceOf(teamAcount);
    console.log("teamBalance: " + helper.fromWei(teamBalance).valueOf());
    assert.equal(helper.fromWei(teamBalance),  TOTAL_SUPPLY*TEAM_STAKE/DIVISOR_STAKE, "teamBalance is ok");
    
    /// test token transfer
    let transferAmount = 1000;
    let recvAccount = accounts[4];
    let result = await tokenContract.transfer(recvAccount, helper.toWei(transferAmount), {from: teamAcount});
    console.log(result);
    teamBalance = await tokenContract.balanceOf(teamAcount);
    assert.equal(helper.fromWei(teamBalance),  
      (TOTAL_SUPPLY*TEAM_STAKE/DIVISOR_STAKE-transferAmount), "teamBalance is ok after transfer");

    let recvBalance = await tokenContract.balanceOf(recvAccount);
    assert.equal(helper.fromWei(recvBalance), transferAmount, "recvBalance is ok after transfer");

    
    
    
    ///// test set wallet
    let walletAddress = accounts[1];
    let wa1 = await saleContract.wallet();
    assert(wa1, walletAddress, "wallet address is ok");
    let value = 5;

    let newWalletAddress = accounts[8];
    let walletBalance = await web3.eth.getBalance(newWalletAddress);
    console.log('new wallet address old balance is '+ helper.fromWei(walletBalance));
    let walletResult = await saleContract.setWallet(newWalletAddress);
    console.log(walletResult);
    assert(newWalletAddress, await saleContract.wallet(), "wallet new address is ok");
    walletResult = await web3.eth.sendTransaction({from:accounts[4], to:saleContract.address ,value:helper.toWei(value)})
    console.log(walletResult);
    let newWalletBalance = await web3.eth.getBalance(newWalletAddress);
    console.log('new wallet address new balance is '+ helper.fromWei(newWalletBalance));
    assert(helper.fromWei(walletBalance), parseInt(helper.fromWei(newWalletBalance))-value, "new wallet eth is ok is ok");
  });


  it('BearCrowSale test buy token', async function(){
    let now = Math.floor((new Date()).valueOf()/1000);
    let saleContract = await BearCrowdSale.new(accounts[0], accounts[1],accounts[2],accounts[3]);

    let openSoldTokens = await saleContract.openSoldTokens();
    console.log('openSoldTokens ' + openSoldTokens);

    let tokenAddress = await saleContract.bearToken();
    console.log("BearCrowdSale start: bearToken: " + tokenAddress);
    let tokenContract = await BearToken.at(tokenAddress);
    let account = accounts[7];
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

});
