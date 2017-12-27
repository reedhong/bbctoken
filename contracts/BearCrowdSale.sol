pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';
import './TokenTimelock.sol';
import './BearToken.sol';


/// @title BearCrowdSale Contract
/// Just For Fun
/// @author xiaohong(http://xiaohong.me)
contract BearCrowdSale is Pausable {
    using SafeMath for uint;

    /// Constant fields
    /// total tokens supply
    uint public constant TOTAL_SUPPLY = 1000000000000 ether;
    uint public constant MAX_SALE_DURATION = 3 years;

    // release lock token after time
    uint public constant LOCK_TIME =  1 days;

    /// Exchange rates for first phase
    uint public constant PRICE_RATE_FIRST = 20833;
    /// Exchange rates for second phase
    uint public constant PRICE_RATE_SECOND = 18518;
    /// Exchange rates for last phase
    uint public constant PRICE_RATE_LAST = 16667;


    uint256 public minBuyLimit = 0.1 ether;
    uint256 public maxBuyLimit = 100 ether;

    uint public constant LOCK_STAKE = 50;            
    uint public constant OPEN_SALE_STAKE = 25;
    uint public constant TEAM_STAKE = 25;
    uint public constant DIVISOR_STAKE = 100;

    // max open sale tokens
    uint public constant MAX_OPEN_SOLD = TOTAL_SUPPLY * OPEN_SALE_STAKE / DIVISOR_STAKE;
    uint public constant STAKE_MULTIPLIER = TOTAL_SUPPLY / DIVISOR_STAKE;

    /// All deposited ETH will be instantly forwarded to this address.
    address public wallet;
    address public lockAddress;
    address public teamAddress;
    /// Contribution start time
    uint public startTime;
    /// Contribution end time
    uint public endTime;

    /// Fields that can be changed by functions
    /// Accumulator for open sold tokens
    uint public openSoldTokens;
    /// ERC20 compilant bear token contact instance
    BearToken public bearToken; 

    // lock token
    TokenTimelock public tokenTimelock; 

    /*
     * EVENTS
     */
    event NewSale(address indexed destAddress, uint ethCost, uint gotTokens);
    event NewWallet(address onwer, address oldWallet, address newWallet);

    modifier notEarlierThan(uint x) {
        require(now >= x);
        _;
    }

    modifier earlierThan(uint x) {
        require(now < x);
        _;
    }

    modifier ceilingNotReached() {
        require(openSoldTokens < MAX_OPEN_SOLD);
        _;
    }  

    modifier isSaleEnded() {
        require(now > endTime || openSoldTokens >= MAX_OPEN_SOLD);
        _;
    }

    modifier validAddress( address addr ) {
        require(addr != address(0x0));
        require(addr != address(this));
        _;
    }

    function BearCrowdSale (address _admin, 
        address _wallet, 
        address _lockAddress,
        address _teamAddress
        ) public 
        validAddress(_admin) 
        validAddress(_wallet) 
        validAddress(_lockAddress) 
        validAddress(_teamAddress)
        {

        wallet = _wallet;
        lockAddress = _lockAddress;  
        teamAddress = _teamAddress;
        startTime = now;
        endTime = startTime + MAX_SALE_DURATION;

        openSoldTokens = 0;
        /// Create bear token contract instance
        bearToken = new BearToken(this, _admin, TOTAL_SUPPLY);

        tokenTimelock = new TokenTimelock(bearToken, lockAddress, now + LOCK_TIME);

        /// Reserve tokens according bear rules
        bearToken.mint(tokenTimelock, LOCK_STAKE * STAKE_MULTIPLIER);
        bearToken.mint(teamAddress, TEAM_STAKE * STAKE_MULTIPLIER);

        transferOwnership(_admin);
    }

    function setMaxBuyLimit(uint256 limit)
        public
        onlyOwner
        earlierThan(endTime)
    {
        maxBuyLimit = limit;
    }

    function setMinBuyLimit(uint256 limit)
        public
        onlyOwner
        earlierThan(endTime)
    {
        minBuyLimit = limit;
    }

    /// @dev Emergency situation
    function setWallet(address newAddress)  external onlyOwner { 
        NewWallet(owner, wallet, newAddress);
        wallet = newAddress; 
    }

    /// @return true if sale not ended, false otherwise.
    function saleNotEnd() constant internal returns (bool) {
        return now < endTime && openSoldTokens < MAX_OPEN_SOLD;
    }

    /**
     * Fallback function 
     * 
     * @dev If anybody sends Ether directly to this  contract, consider he is getting bear token
     */
    function () public payable {
      buyBBC(msg.sender);
    }

    /*
     * PUBLIC FUNCTIONS
     */
    /// @dev Exchange msg.value ether to bear for account recepient
    /// @param receipient bear tokens receiver
    function buyBBC(address receipient) 
        public 
        payable 
        whenNotPaused  
        ceilingNotReached 
        earlierThan(endTime)
        validAddress(receipient)
        returns (bool) 
    {
        require(msg.value >= minBuyLimit);
        require(msg.value <= maxBuyLimit);
        // Do not allow contracts to game the system
        require(!isContract(msg.sender));        

        require(tx.gasprice <= 50000000000 wei);
        
        doBuy(receipient);

        return true;
    }


    /// @dev Buy bear token normally
    function doBuy(address receipient) internal {
        // protect partner quota in stage one
        uint tokenAvailable = MAX_OPEN_SOLD.sub(openSoldTokens);
        require(tokenAvailable > 0);
        uint toFund;
        uint toCollect;
        (toFund, toCollect) = costAndBuyTokens(tokenAvailable);
        if (toFund > 0) {
            require(bearToken.mint(receipient, toCollect));         
            wallet.transfer(toFund);
            openSoldTokens = openSoldTokens.add(toCollect);
            NewSale(receipient, toFund, toCollect);             
        }

        // not enough token sale, just return eth
        uint toReturn = msg.value.sub(toFund);
        if (toReturn > 0) {
            msg.sender.transfer(toReturn);
        }
    }

    /// CONSTANT METHODS
    /// @dev Get current exchange rate
    function priceRate() public view returns (uint) {
        if (startTime <= now && now < startTime + 1 years ) {
            return  PRICE_RATE_FIRST;
        }else if (startTime + 1 years <= now && now < startTime + 2 years ) {
            return PRICE_RATE_SECOND;
        }else if (startTime + 2 years <= now && now < endTime) {
            return PRICE_RATE_LAST;
        }else {
            assert(false);
        }
        return now;
    }

    /// @dev Utility function for calculate available tokens and cost ethers
    function costAndBuyTokens(uint availableToken) constant internal returns (uint costValue, uint getTokens) {
        // all conditions has checked in the caller functions
        uint exchangeRate = priceRate();
        getTokens = exchangeRate * msg.value;

        if (availableToken >= getTokens) {
            costValue = msg.value;
        } else {
            costValue = availableToken / exchangeRate;
            getTokens = availableToken;
        }
    }

    /// @dev Internal function to determine if an address is a contract
    /// @param _addr The address being queried
    /// @return True if `_addr` is a contract
    function isContract(address _addr) constant internal returns(bool) {
        uint size;
        if (_addr == 0) {
            return false;
        }

        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }

    // release lock token 
    function releaseLockToken()  external onlyOwner {
        tokenTimelock.release();
    }
}