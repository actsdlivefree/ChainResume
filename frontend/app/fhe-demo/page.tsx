'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/hooks/useMetaMask';
import { useFhevm } from '@/fhevm/useFhevm';
import { FhevmDecryptionSignature } from '@/fhevm/FhevmDecryptionSignature';
import { GenericStringInMemoryStorage } from '@/fhevm/GenericStringStorage';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ethers } from 'ethers';
import { ChainResumeABI } from '@/abi/ChainResumeABI';
import { ChainResumeAddresses } from '@/abi/ChainResumeAddresses';

export default function FHEDemoPage() {
  const router = useRouter();
  const { address, chainId, isConnected, provider } = useMetaMask();
  const [storage] = useState(() => new GenericStringInMemoryStorage());
  
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider: provider,
    chainId,
    initialMockChains: { 31337: 'http://localhost:8545' },
    enabled: isConnected,
  });

  const [loading, setLoading] = useState(false);
  const [reputationHandle, setReputationHandle] = useState<string>('');
  const [noteHandle, setNoteHandle] = useState<string>('');
  const [decryptedReputation, setDecryptedReputation] = useState<string>('');
  const [decryptedNote, setDecryptedNote] = useState<string>('');
  const [message, setMessage] = useState('');

  const contractInfo = ChainResumeAddresses[chainId?.toString() as keyof typeof ChainResumeAddresses];
  const contractAddress = contractInfo?.address as `0x${string}` | undefined;

  // 加载句柄
  const loadHandles = async () => {
    if (!contractAddress || !isConnected) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, provider);

      const repHandle = await contract.encryptedReputation();
      const noteHandle = await contract.encryptedNote();

      setReputationHandle(repHandle);
      setNoteHandle(noteHandle);
    } catch (error) {
      console.error('加载句柄失败:', error);
    }
  };

  useEffect(() => {
    if (isConnected && contractAddress) {
      loadHandles();
    }
  }, [isConnected, contractAddress]);

  // 加密并调整声誉
  const adjustReputation = async (delta: number) => {
    if (!contractAddress || !isConnected || !fhevmInstance) {
      alert('请先连接钱包并等待 FHEVM 实例初始化');
      return;
    }

    setLoading(true);
    setMessage(`正在加密并${delta > 0 ? '增加' : '减少'}声誉...`);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, signer);

      // 1. 创建加密输入
      const userAddr = (await signer.getAddress()) as `0x${string}`;
      const input = fhevmInstance.createEncryptedInput(contractAddress, userAddr);
      input.add32(Math.abs(delta));

      setMessage('正在执行 FHE 加密（CPU 密集）...');
      
      // 2. 加密（CPU 密集型）
      await new Promise(resolve => setTimeout(resolve, 100));
      const encrypted = await input.encrypt();

      setMessage('加密完成，发送交易到链上...');

      // 3. 调用合约
      const tx = await contract.adjustReputation(encrypted.handles[0], encrypted.inputProof, delta > 0);
      setMessage(`交易已发送: ${tx.hash.slice(0, 10)}...`);

      await tx.wait();
      setMessage(`声誉调整成功！ ${delta > 0 ? '+' : ''}${delta}`);

      // 重新加载句柄
      await loadHandles();
    } catch (error: any) {
      console.error('调整声誉失败:', error);
      setMessage(`失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 设置加密备注
  const setPrivateNote = async () => {
    if (!contractAddress || !isConnected || !fhevmInstance) {
      alert('请先连接钱包并等待 FHEVM 实例初始化');
      return;
    }

    const randomNote = Math.floor(Math.random() * 1000000);

    setLoading(true);
    setMessage(`正在加密备注: ${randomNote}...`);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, signer);

      // 1. 创建加密输入
      const userAddr = (await signer.getAddress()) as `0x${string}`;
      const input = fhevmInstance.createEncryptedInput(contractAddress, userAddr);
      input.add64(randomNote);

      setMessage('正在执行 FHE 加密（CPU 密集）...');
      
      // 2. 加密
      await new Promise(resolve => setTimeout(resolve, 100));
      const encrypted = await input.encrypt();

      setMessage('加密完成，发送交易到链上...');

      // 3. 调用合约
      const tx = await contract.setPrivateNote(encrypted.handles[0], encrypted.inputProof);
      setMessage(`交易已发送: ${tx.hash.slice(0, 10)}...`);

      await tx.wait();
      setMessage(`加密备注设置成功！明文: ${randomNote}`);

      // 重新加载句柄
      await loadHandles();
    } catch (error: any) {
      console.error('设置备注失败:', error);
      setMessage(`失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 解密声誉
  const decryptReputation = async () => {
    if (!contractAddress || !isConnected || !fhevmInstance || !reputationHandle) {
      alert('请先连接钱包并确保有数据可解密');
      return;
    }

    if (reputationHandle === ethers.ZeroHash) {
      setDecryptedReputation('0 (未初始化)');
      return;
    }

    setLoading(true);
    setMessage('正在构建解密签名...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();

      // 1. 构建解密签名
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [contractAddress],
        signer,
        storage
      );

      if (!sig) {
        setMessage('构建解密签名失败');
        return;
      }

      setMessage('正在解密...');

      // 2. 解密
      const result = await fhevmInstance.userDecrypt(
        [{ handle: reputationHandle, contractAddress }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const clearValue = result[reputationHandle];
      setDecryptedReputation(clearValue.toString());
      setMessage(`解密成功！声誉分数: ${clearValue}`);
    } catch (error: any) {
      console.error('解密失败:', error);
      setMessage(`解密失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 解密备注
  const decryptNote = async () => {
    if (!contractAddress || !isConnected || !fhevmInstance || !noteHandle) {
      alert('请先连接钱包并确保有数据可解密');
      return;
    }

    if (noteHandle === ethers.ZeroHash) {
      setDecryptedNote('未设置');
      return;
    }

    setLoading(true);
    setMessage('正在构建解密签名...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();

      // 1. 构建解密签名
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [contractAddress],
        signer,
        storage
      );

      if (!sig) {
        setMessage('构建解密签名失败');
        return;
      }

      setMessage('正在解密...');

      // 2. 解密
      const result = await fhevmInstance.userDecrypt(
        [{ handle: noteHandle, contractAddress }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const clearValue = result[noteHandle];
      setDecryptedNote(clearValue.toString());
      setMessage(`解密成功！备注: ${clearValue}`);
    } catch (error: any) {
      console.error('解密失败:', error);
      setMessage(`解密失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Card>
          <CardContent className="py-12">
            <p className="text-gray-600 mb-4">请先连接钱包</p>
            <Button onClick={() => router.push('/')}>返回首页</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-3xl p-12 text-white">
        <h1 className="text-4xl font-bold mb-4">🔐 FHEVM 加密解密演示</h1>
        <p className="text-xl text-white/90 mb-2">
          使用全同态加密对链上数据进行加密运算与解密
        </p>
        <div className="flex items-center gap-3 mt-4">
          <Badge variant={fhevmStatus === 'ready' ? 'success' : 'warning'}>
            FHEVM: {fhevmStatus}
          </Badge>
          <span className="text-sm text-white/80">
            {chainId === 31337 ? '本地 Mock 模式' : 'Relayer SDK 模式'}
          </span>
        </div>
      </div>

      {/* 加密声誉 */}
      <Card>
        <CardHeader>
          <CardTitle>1️⃣ 加密声誉分数（euint32）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            链上存储加密的声誉分数，只有所有者可以解密查看。支持同态加减运算。
          </p>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => adjustReputation(1)} 
              loading={loading}
              disabled={fhevmStatus !== 'ready'}
            >
              声誉 +1
            </Button>
            <Button 
              onClick={() => adjustReputation(-1)} 
              loading={loading}
              disabled={fhevmStatus !== 'ready'}
              variant="secondary"
            >
              声誉 -1
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">加密句柄（Handle）：</span>
              <Button size="sm" variant="ghost" onClick={loadHandles}>
                刷新
              </Button>
            </div>
            <p className="font-mono text-xs break-all bg-gray-100 p-3 rounded">
              {reputationHandle || '未设置'}
            </p>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">解密后的明文：</span>
              <Button 
                size="sm" 
                onClick={decryptReputation}
                loading={loading}
                disabled={!reputationHandle || reputationHandle === ethers.ZeroHash || fhevmStatus !== 'ready'}
              >
                解密
              </Button>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {decryptedReputation || '点击解密查看'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 加密备注 */}
      <Card>
        <CardHeader>
          <CardTitle>2️⃣ 加密私密备注（euint64）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            存储加密的私密备注（随机数），只有所有者可以解密查看。
          </p>
          
          <Button 
            onClick={setPrivateNote} 
            loading={loading}
            disabled={fhevmStatus !== 'ready'}
          >
            设置随机加密备注
          </Button>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">加密句柄（Handle）：</span>
              <Button size="sm" variant="ghost" onClick={loadHandles}>
                刷新
              </Button>
            </div>
            <p className="font-mono text-xs break-all bg-gray-100 p-3 rounded">
              {noteHandle || '未设置'}
            </p>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">解密后的明文：</span>
              <Button 
                size="sm" 
                onClick={decryptNote}
                loading={loading}
                disabled={!noteHandle || noteHandle === ethers.ZeroHash || fhevmStatus !== 'ready'}
              >
                解密
              </Button>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {decryptedNote || '点击解密查看'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 状态消息 */}
      {message && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-700">{message}</p>
          </CardContent>
        </Card>
      )}

      {/* 说明 */}
      <Card>
        <CardHeader>
          <CardTitle>💡 工作原理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div>
            <strong>1. 加密过程：</strong>
            <p>前端使用 FHEVM 实例的 <code className="bg-gray-100 px-1 rounded">createEncryptedInput()</code> 创建加密输入，调用 <code className="bg-gray-100 px-1 rounded">encrypt()</code> 生成密文句柄和零知识证明，然后发送到链上。</p>
          </div>
          <div>
            <strong>2. 链上运算：</strong>
            <p>合约使用 <code className="bg-gray-100 px-1 rounded">FHE.add() / FHE.sub()</code> 对加密数据进行同态运算，无需解密即可计算。</p>
          </div>
          <div>
            <strong>3. 解密过程：</strong>
            <p>用户签名 EIP-712 消息授权解密，前端调用 <code className="bg-gray-100 px-1 rounded">userDecrypt()</code> 获得明文结果。</p>
          </div>
          <div>
            <strong>4. Mock vs Relayer：</strong>
            <p>本地使用 <code className="bg-gray-100 px-1 rounded">@fhevm/mock-utils</code>，测试网使用 CDN 加载的 Relayer SDK。</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="outline" onClick={() => router.push('/')}>
          返回首页
        </Button>
      </div>
    </div>
  );
}

