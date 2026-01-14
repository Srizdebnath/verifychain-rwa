// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RealRWA is ERC20, Ownable {
    
    struct BondMetadata {
        string name;
        string isin;
        uint256 faceValue;   // Extracted from PDF (The Reserve Limit)
        uint256 currentYield; // Live from Yahoo Finance
        uint256 lastUpdate;   // Oracle timestamp
        string ipfsHash;
        bool isActive;
    }

    mapping(uint256 => BondMetadata) public bonds;
    uint256 public nextBondId;

    // Track how many tokens minted per bond to enforce reserves
    mapping(uint256 => uint256) public mintedAmount;

    event OracleUpdate(uint256 indexed bondId, uint256 newYield, uint256 timestamp);
    event BondCreated(uint256 indexed bondId, uint256 reserveCap);

    constructor() ERC20("India Govt Bond", "IGB") Ownable(msg.sender) {}

    // 1. CREATE ASSET (Backed by PDF Data)
function createAsset(
        string memory _name,
        string memory _isin,
        uint256 _faceValue, // e.g. 10,000,000 (From PDF)
        uint256 _initialYield,
        string memory _ipfsHash
    ) public onlyOwner {
        nextBondId++;
        bonds[nextBondId] = BondMetadata(
            _name, 
            _isin, 
            _faceValue, 
            _initialYield, 
            block.timestamp, 
            _ipfsHash, 
            true
        );
        
        // FRACTIONALIZATION MAGIC:
        // We mint exactly 1 Token per 1 Unit of Currency found in the PDF.
        // If PDF says 10,000,000 INR, we mint 10,000,000 Tokens.
        // The * 10**18 makes it divisible down to 0.000000000000000001
        _mint(msg.sender, _faceValue * 10**18); 
        
        emit BondCreated(nextBondId, _faceValue);
    }

    // 2. THE ORACLE (Python calls this with Real Data)
    function updateMarketData(uint256 _bondId, uint256 _liveYield) public onlyOwner {
        require(bonds[_bondId].isActive, "Bond not active");
        bonds[_bondId].currentYield = _liveYield;
        bonds[_bondId].lastUpdate = block.timestamp;
        emit OracleUpdate(_bondId, _liveYield, block.timestamp);
    }

    // 3. MINT (Enforces Proof of Reserve)
    // Cannot mint more than the Face Value found in the PDF
    function mintFractionalShares(uint256 _bondId, uint256 _amount) public onlyOwner {
        require(mintedAmount[_bondId] + _amount <= bonds[_bondId].faceValue, "Reserve Exceeded! Not enough backing.");
        mintedAmount[_bondId] += _amount;
        _mint(msg.sender, _amount * 10**18); 
    }
}