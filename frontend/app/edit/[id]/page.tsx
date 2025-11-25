'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ethers } from 'ethers';
import { ChainResumeABI } from '@/abi/ChainResumeABI';
import { ChainResumeAddresses } from '@/abi/ChainResumeAddresses';

export default function EditResumePage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = params.id as string;
  const { address, chainId, isConnected } = useMetaMask();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metadataCID, setMetadataCID] = useState('');
  const [newExperience, setNewExperience] = useState({
    company: '',
    position: '',
    description: '',
    startDate: '',
    endDate: '',
    proofCID: '',
  });

  const contractInfo = ChainResumeAddresses[chainId?.toString() as keyof typeof ChainResumeAddresses];
  const contractAddress = contractInfo?.address as `0x${string}` | undefined;

  useEffect(() => {
    if (contractAddress && resumeId) {
      loadResume();
    }
  }, [contractAddress, resumeId]);

  const loadResume = async () => {
    if (!contractAddress) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, provider);

      const resumeData = await contract.getResume(resumeId);
      
      if (resumeData.owner.toLowerCase() !== address?.toLowerCase()) {
        alert('你不是此简历的所有者');
        router.push('/');
        return;
      }

      setMetadataCID(resumeData.metadataCID);
    } catch (error) {
      console.error('加载简历失败:', error);
      alert('简历不存在');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMetadata = async () => {
    if (!contractAddress || !isConnected) {
      alert('请先连接钱包');
      return;
    }

    setSaving(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, signer);

      const tx = await contract.updateResume(resumeId, metadataCID);
      await tx.wait();

      alert('元数据更新成功！');
    } catch (error: any) {
      console.error('更新失败:', error);
      alert(`更新失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddExperience = async () => {
    if (!contractAddress || !isConnected) {
      alert('请先连接钱包');
      return;
    }

    if (!newExperience.company || !newExperience.position) {
      alert('请填写公司和职位');
      return;
    }

    setSaving(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, signer);

      const startTimestamp = new Date(newExperience.startDate).getTime() / 1000;
      const endTimestamp = newExperience.endDate ? new Date(newExperience.endDate).getTime() / 1000 : 0;

      const tx = await contract.addExperience(
        resumeId,
        newExperience.company,
        newExperience.position,
        newExperience.description,
        Math.floor(startTimestamp),
        Math.floor(endTimestamp),
        newExperience.proofCID || ''
      );
      await tx.wait();

      alert('经历添加成功！');
      setNewExperience({
        company: '',
        position: '',
        description: '',
        startDate: '',
        endDate: '',
        proofCID: '',
      });
      router.push(`/resume/${resumeId}`);
    } catch (error: any) {
      console.error('添加失败:', error);
      alert(`添加失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="mt-4 text-gray-600">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">编辑简历 #{resumeId}</h1>
        <p className="text-gray-600">更新简历元数据或添加新经历</p>
      </div>

      {/* Update Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>更新元数据</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">元数据 CID（IPFS）</label>
            <input
              type="text"
              placeholder="QmXxx..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={metadataCID}
              onChange={(e) => setMetadataCID(e.target.value)}
            />
          </div>
          <Button onClick={handleUpdateMetadata} loading={saving}>
            更新元数据
          </Button>
        </CardContent>
      </Card>

      {/* Add Experience */}
      <Card>
        <CardHeader>
          <CardTitle>添加新经历</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">公司名称 *</label>
              <input
                type="text"
                placeholder="Acme Inc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newExperience.company}
                onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">职位 *</label>
              <input
                type="text"
                placeholder="高级工程师"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newExperience.position}
                onChange={(e) => setNewExperience({ ...newExperience, position: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">工作描述</label>
            <textarea
              placeholder="描述你的工作内容和成就..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={newExperience.description}
              onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">开始日期</label>
              <input
                type="month"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newExperience.startDate}
                onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">结束日期（留空表示至今）</label>
              <input
                type="month"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={newExperience.endDate}
                onChange={(e) => setNewExperience({ ...newExperience, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">证明文件 CID（可选）</label>
            <input
              type="text"
              placeholder="QmXxx..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={newExperience.proofCID}
              onChange={(e) => setNewExperience({ ...newExperience, proofCID: e.target.value })}
            />
          </div>

          <Button onClick={handleAddExperience} loading={saving} className="w-full">
            添加经历
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="secondary" size="lg" onClick={() => router.push(`/resume/${resumeId}`)}>
          返回查看
        </Button>
      </div>
    </div>
  );
}

