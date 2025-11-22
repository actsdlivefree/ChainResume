'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ResumeCard } from '@/components/ResumeCard';
import { ethers } from 'ethers';
import { ChainResumeABI } from '@/abi/ChainResumeABI';
import { ChainResumeAddresses } from '@/abi/ChainResumeAddresses';
import { useFhevm } from '@/fhevm/useFhevm';
import { Badge } from '@/components/ui/Badge';

export default function Home() {
  const { address, chainId, connect, isConnected, provider } = useMetaMask();
  const [myResumes, setMyResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalResumes: 0,
    totalExperiences: 0,
    totalVerified: 0,
  });

  const contractInfo = ChainResumeAddresses[chainId?.toString() as keyof typeof ChainResumeAddresses];
  const contractAddress = contractInfo?.address as `0x${string}` | undefined;

  // FHEVM 状态（测试网/真实环境启用 Relayer SDK；本地 31337 启用 Mock）
  const { status: fhevmStatus } = useFhevm({
    provider: provider,
    chainId,
    initialMockChains: { 31337: 'http://localhost:8545' },
    enabled: isConnected,
  });

  useEffect(() => {
    if (isConnected && address && contractAddress) {
      loadMyResumes();
    }
  }, [isConnected, address, contractAddress]);

  const loadMyResumes = async () => {
    if (!contractAddress || !address) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, provider);

      // 获取用户简历 ID 列表
      const resumeIds: bigint[] = await contract.getUserResumes(address);
      
      const resumes: any[] = [];
      let totalExp = 0;
      let totalVer = 0;

      for (const id of resumeIds) {
        try {
          const resume = await contract.getResume(id);
          const expCount = resume.experiences?.length || 0;
          const verCount = resume.experiences?.filter((e: any) => e.verified).length || 0;
          resumes.push({
            id: Number(id),
            metadataCID: resume.metadataCID,
            owner: resume.owner,
            experienceCount: expCount,
            verifiedCount: verCount,
          });
          totalExp += expCount;
          totalVer += verCount;
        } catch (e) {
          // ignore
        }
      }

      setMyResumes(resumes);
      setStats({
        totalResumes: resumes.length,
        totalExperiences: totalExp,
        totalVerified: totalVer,
      });
    } catch (error) {
      console.error('加载简历失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="max-w-md w-full text-center" gradient>
          <CardContent className="py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-4xl">🔐</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">连接钱包</h2>
            <p className="mb-8 text-white/90">
              连接 MetaMask 钱包以开始使用 ChainResume
            </p>
            <Button onClick={connect} size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
              连接 MetaMask
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-3xl p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <h1 className="text-5xl font-bold mb-4">
            ChainResume · 去中心化简历 ✨
          </h1>
          <p className="text-xl mb-8 text-white/90">
            在链上创建你的职业身份，使用 FHEVM 加密声誉与私密信息
          </p>
          <div className="flex items-center gap-3 mb-6">
            <Badge variant={fhevmStatus === 'ready' ? 'success' : fhevmStatus === 'loading' ? 'warning' : 'info'}>
              FHEVM: {fhevmStatus}
            </Badge>
            {chainId && (
              <span className="text-sm text-white/80">
                {chainId === 31337 ? '本地 Mock 模式' : 'Relayer SDK 模式'}
              </span>
            )}
          </div>
          <Link href="/create">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 hover:scale-105">
              <span className="mr-2">+</span> 创建我的去中心化简历
            </Button>
          </Link>
        </div>
      </div>

      {/* FHE Demo Banner */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">🔐 体验 FHEVM 加密解密</h3>
              <p className="text-sm text-gray-600">
                查看全同态加密如何在链上保护你的私密数据
              </p>
            </div>
            <Link href="/fhe-demo">
              <Button variant="outline">
                去体验 →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="text-center py-6">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
              {stats.totalResumes}
            </div>
            <div className="text-gray-600">我的简历</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent mb-2">
              {stats.totalExperiences}
            </div>
            <div className="text-gray-600">工作经历</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">
              {stats.totalVerified}
            </div>
            <div className="text-gray-600">已认证经历</div>
          </CardContent>
        </Card>
      </div>

      {/* My Resumes */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">我的简历</h2>
          {myResumes.length > 0 && (
            <Link href="/create">
              <Button variant="outline" size="sm">
                <span className="mr-1">+</span> 创建新简历
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : myResumes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2">还没有简历</h3>
              <p className="text-gray-600 mb-6">创建你的第一份链上简历</p>
              <Link href="/create">
                <Button>开始创建</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myResumes.map((resume) => (
              <ResumeCard key={resume.id} {...resume} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
