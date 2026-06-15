// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract ArcCart {
    struct Item { address owner; string label; uint256 price; bool paid; address payer; uint256 at; }
    Item[] public items;
    mapping(address => uint256[]) private mineMap;
    uint256 public volume;
    event Created(uint256 indexed id, address indexed owner, uint256 price);
    event Paid(uint256 indexed id, address indexed payer, uint256 price);
    function create(string calldata label, uint256 price) external returns (uint256 id) {
        require(price > 0, "Zero price");
        id = items.length;
        items.push(Item(msg.sender, label, price, false, address(0), block.timestamp));
        mineMap[msg.sender].push(id);
        emit Created(id, msg.sender, price);
    }
    function pay(uint256 id) external payable {
        Item storage it = items[id];
        require(!it.paid, "Already paid");
        require(msg.value == it.price, "Wrong amount");
        it.paid = true; it.payer = msg.sender; volume += msg.value;
        (bool ok,) = payable(it.owner).call{value: msg.value}(""); require(ok, "transfer failed");
        emit Paid(id, msg.sender, msg.value);
    }
    function get(uint256 id) external view returns (Item memory) { return items[id]; }
    function getMine(address u) external view returns (uint256[] memory) { return mineMap[u]; }
    function total() external view returns (uint256) { return items.length; }
}
