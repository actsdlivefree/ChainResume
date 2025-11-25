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

export default function MyResumesPage() {
  const { address, chainId, isConnected, connect } = useMetaMask();
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const contractInfo = ChainResumeAddresses[chainId?.toString() as keyof typeof ChainResumeAddresses];
  const contractAddress = contractInfo?.address as `0x${string}` | undefined;

  useEffect(() => {
    if (isConnected && address && contractAddress) {
      load();
    }
  }, [isConnected, address, contractAddress]);

  const load = async () => {
    if (!contractAddress || !address) return;
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, provider);
      const ids: bigint[] = await contract.getUserResumes(address);

      const list: any[] = [];
      for (const id of ids) {
        try {
          const r = await contract.getResume(id);
          list.push({
            id: Number(id),
            metadataCID: r.metadataCID,
            owner: r.owner,
            experienceCount: r.experiences?.length || 0,
            verifiedCount: r.experiences?.filter((e: any) => e.verified).length || 0,
          });
        } catch {}
      }
      setResumes(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-10">
            <p className="text-gray-600 mb-4">请先连接钱包以查看你的简历</p>
            <Button onClick={connect}>连接钱包</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">我的简历</h1>
        <Link href="/create">
          <Button>
            <span className="mr-1">+</span> 创建新简历
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : resumes.length === 0 ? (
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
          {resumes.map((r) => (
            <ResumeCard key={r.id} {...r} />
          ))}
        </div>
      )}
    </div>
  );
}
