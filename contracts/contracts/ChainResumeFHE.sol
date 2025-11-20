// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, externalEuint32, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ChainResumeFHE
 * @notice 去中心化简历，结合 FHEVM 存储与运算加密数据：
 *  - 每份简历维护一个加密的声誉分（endorsementScore）
 *  - 每份简历支持一个加密的私密备注（privateNote），仅 owner/指定地址可解密
 *  - 经历与验证信息为公开字段，适合展示与验证
 */
contract ChainResumeFHE is ZamaEthereumConfig {
    struct Experience {
        string company;
        string position;
        string description;
        uint256 startDate;
        uint256 endDate;
        string proofCID;
        bool verified;
        address verifier;
    }

    struct Resume {
        uint256 id;
        address owner;
        string metadataCID; // 基本个人信息 JSON (IPFS)
        Experience[] experiences; // 公开经历（可被验证方背书）
    }

    // 简历主体
    mapping(uint256 => Resume) private _resumes;
    mapping(address => uint256[]) private _userResumes;
    uint256 public resumeCount;

    // 加密字段（FHE）
    mapping(uint256 => euint32) private _endorsementScore; // 加密声誉
    mapping(uint256 => euint64) private _privateNote; // 加密私密备注（演示用途）

    event ResumeCreated(uint256 indexed id, address indexed owner);
    event ExperienceAdded(uint256 indexed id, string company);
    event ExperienceVerified(uint256 indexed id, uint256 index, address verifier);
    event ResumeUpdated(uint256 indexed id);
    event ScoreChanged(uint256 indexed id);
    event PrivateNoteUpdated(uint256 indexed id);

    modifier onlyOwnerOf(uint256 resumeId) {
        require(_resumes[resumeId].owner == msg.sender, "Not owner");
        _;
    }

    function createResume(string calldata metadataCID) external returns (uint256) {
        resumeCount++;
        uint256 id = resumeCount;
        Resume storage r = _resumes[id];
        r.id = id;
        r.owner = msg.sender;
        r.metadataCID = metadataCID;
        _userResumes[msg.sender].push(id);
        emit ResumeCreated(id, msg.sender);
        return id;
    }

    function addExperience(
        uint256 resumeId,
        string calldata company,
        string calldata position,
        string calldata description,
        uint256 startDate,
        uint256 endDate,
        string calldata proofCID
    ) external onlyOwnerOf(resumeId) {
        Resume storage r = _resumes[resumeId];
        r.experiences.push(
            Experience(company, position, description, startDate, endDate, proofCID, false, address(0))
        );
        emit ExperienceAdded(resumeId, company);
    }

    function verifyExperience(uint256 resumeId, uint256 index) external {
        Experience storage exp = _resumes[resumeId].experiences[index];
        exp.verified = true;
        exp.verifier = msg.sender;
        emit ExperienceVerified(resumeId, index, msg.sender);
    }

    function updateResume(uint256 resumeId, string calldata newCID) external onlyOwnerOf(resumeId) {
        _resumes[resumeId].metadataCID = newCID;
        emit ResumeUpdated(resumeId);
    }

    // =========================
    // FHE: 声誉分（加密加减）
    // =========================
    function incrementScore(uint256 resumeId, externalEuint32 input, bytes calldata inputProof) external onlyOwnerOf(resumeId) {
        euint32 v = FHE.fromExternal(input, inputProof);
        _endorsementScore[resumeId] = FHE.add(_endorsementScore[resumeId], v);
        // 解密授权：合约自身 + 拥有者
        FHE.allowThis(_endorsementScore[resumeId]);
        FHE.allow(_endorsementScore[resumeId], _resumes[resumeId].owner);
        emit ScoreChanged(resumeId);
    }

    function decrementScore(uint256 resumeId, externalEuint32 input, bytes calldata inputProof) external onlyOwnerOf(resumeId) {
        euint32 v = FHE.fromExternal(input, inputProof);
        _endorsementScore[resumeId] = FHE.sub(_endorsementScore[resumeId], v);
        FHE.allowThis(_endorsementScore[resumeId]);
        FHE.allow(_endorsementScore[resumeId], _resumes[resumeId].owner);
        emit ScoreChanged(resumeId);
    }

    function getScore(uint256 resumeId) external view returns (euint32) {
        return _endorsementScore[resumeId];
    }

    // =========================
    // FHE: 私密备注（加密写入/读取）
    // =========================
    function setPrivateNote(uint256 resumeId, externalEuint64 note, bytes calldata inputProof) external onlyOwnerOf(resumeId) {
        euint64 v = FHE.fromExternal(note, inputProof);
        _privateNote[resumeId] = v;
        // 授权 owner 解密；可扩展授权给 verifier
        FHE.allowThis(_privateNote[resumeId]);
        FHE.allow(_privateNote[resumeId], _resumes[resumeId].owner);
        emit PrivateNoteUpdated(resumeId);
    }

    function getPrivateNote(uint256 resumeId) external view returns (euint64) {
        return _privateNote[resumeId];
    }

    // 允许 owner 授权额外地址对加密字段解密（例如：招聘方/验证方）
    function allowDecrypt(uint256 resumeId, address to) external onlyOwnerOf(resumeId) {
        FHE.allow(_endorsementScore[resumeId], to);
        FHE.allow(_privateNote[resumeId], to);
    }

    // =========================
    // 公开读取
    // =========================
    function getResume(uint256 resumeId) external view returns (Resume memory) {
        return _resumes[resumeId];
    }

    function getUserResumes(address user) external view returns (uint256[] memory) {
        return _userResumes[user];
    }
}


