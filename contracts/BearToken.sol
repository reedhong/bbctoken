pragma solidity ^0.4.4;

import 'zeppelin-solidity/contracts/token/PausableToken.sol';


/// @title BearToken Contract
/// Just For Fun
/// @author xiaohong(http://xiaohong.me)
contract BearToken is PausableToken {
    using SafeMath for uint;

    /// Constant token specific fields
    string public constant name = "BearToken";
    string public constant symbol = "BBC";
    uint public constant decimals = 18;

    /// bear total tokens supply
    uint public maxTotalSupply;

    /// Fields that are only changed in constructor
    address public minter; 

    /*
     * MODIFIERS
     */
    modifier onlyMinter {
        assert(msg.sender == minter);
        _;
    }

    modifier isLaterThan (uint x){
        assert(now > x);
        _;
    }

    modifier maxTokenAmountNotReached (uint amount){
        assert(totalSupply.add(amount) <= maxTotalSupply);
        _;
    }

    modifier validAddress( address addr ) {
        require(addr != address(0x0));
        require(addr != address(this));
        _;
    }

    /**
     * CONSTRUCTOR 
     * 
     * @dev Initialize the Bear Token
     * @param _minter The BearCrowdSale Contract 
     * @param _admin owner of the contract
     * @param _maxTotalSupply total supply token    
     */
    function BearToken(address _minter, address _admin, uint _maxTotalSupply) 
        public 
        validAddress(_admin)
        validAddress(_minter)
        {
        minter = _minter;
        maxTotalSupply = _maxTotalSupply;
        transferOwnership(_admin);
    }

    /**
     * EXTERNAL FUNCTION 
     * 
     * @dev BearCrowdSale contract instance mint token
     * @param receipent The destination account owned mint tokens    
     * @param amount The amount of mint token
     * be sent to this address.
     */
    function mint(address receipent, uint amount)
        external
        onlyMinter
        maxTokenAmountNotReached(amount)
        returns (bool)
    {
        balances[receipent] = balances[receipent].add(amount);
        totalSupply = totalSupply.add(amount);
        return true;
    }
}