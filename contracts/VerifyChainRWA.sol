// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VerifyChainRWA is ERC20, Ownable {
    
    struct Bond {
        uint256 id;
        string name;
        string isin;
        string docHash;     // SHA256 Hash of the original PDF
        string ipfsHash;    // Real IPFS CID from Pinata
        uint256 yieldRate;  // Basis points (720 = 7.20%)
        uint256 maturity;   
        bool isActive;
    }

    uint256 public nextBondId;
    mapping(uint256 => Bond) public bonds;
    
    // RWA COMPLIANCE LAYER
    mapping(address => bool) public isKYCVerified;

    event BondTokenized(uint256 indexed id, string name, string isin);
    event UserWhitelisted(address indexed user);

    constructor() ERC20("India Govt Bond Token", "IGBT") Ownable(msg.sender) {
        // Issuer is automatically KYC'd
        isKYCVerified[msg.sender] = true;
    }

    // 1. COMPLIANCE: Whitelist an investor (KYC)
    function whitelistUser(address _user) public onlyOwner {
        isKYCVerified[_user] = true;
        emit UserWhitelisted(_user);
    }

    // 2. TOKENIZATION: Mint Bond with REAL Metadata
    function mintBond(
        string memory _name,
        string memory _isin,
        string memory _docHash,
        string memory _ipfsHash,
        uint256 _yieldRate,
        uint256 _totalSupply
    ) public onlyOwner {
        nextBondId++;
        bonds[nextBondId] = Bond(
            nextBondId,
            _name,
            _isin,
            _docHash,
            _ipfsHash,
            _yieldRate,
            block.timestamp + 365 days, 
            true
        );

        _mint(msg.sender, _totalSupply * 10**18); 
        emit BondTokenized(nextBondId, _name, _isin);
    }

    // 3. OVERRIDE TRANSFER: Enforce KYC on every trade
    function transfer(address to, uint256 value) public override returns (bool) {
        require(isKYCVerified[msg.sender], "Sender not KYC Verified");
        require(isKYCVerified[to], "Recipient not KYC Verified");
        return super.transfer(to, value);
    }

    function verifyIntegrity(uint256 _bondId, string memory _hashToCheck) public view returns (bool) {
        return (keccak256(abi.encodePacked(bonds[_bondId].docHash)) == keccak256(abi.encodePacked(_hashToCheck)));
    }
}