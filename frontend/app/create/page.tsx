'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ethers } from 'ethers';
import { ChainResumeABI } from '@/abi/ChainResumeABI';
import { ChainResumeAddresses } from '@/abi/ChainResumeAddresses';

export default function CreateResumePage() {
  const router = useRouter();
  const { address, chainId, isConnected } = useMetaMask();
  const [loading, setLoading] = useState(false);
  const [pinataJWT, setPinataJWT] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    metadataCID: '',
    basic: {
      name: '',
      title: '',
      summary: '',
      avatarUrl: '',
      location: '',
    },
    contact: {
      email: '',
      phone: '',
      website: '',
      github: '',
      twitter: '',
      ens: '',
      lens: '',
    },
    skills: '' as string, // 逗号分隔
    links: [] as Array<{ label: string; url: string }>,
    education: [] as Array<{ school: string; degree: string; startDate: string; endDate: string; description: string }>,
    certificates: [] as Array<{ title: string; issuer: string; date: string; proofCID: string }>,
    experiences: [] as Array<{
      company: string;
      position: string;
      description: string;
      startDate: string;
      endDate: string;
      proofCID: string;
    }>,
  });

  const contractInfo = ChainResumeAddresses[chainId?.toString() as keyof typeof ChainResumeAddresses];
  const contractAddress = contractInfo?.address as `0x${string}` | undefined;

  const addExperience = () => {
    setFormData({
      ...formData,
      experiences: [
        ...formData.experiences,
        { company: '', position: '', description: '', startDate: '', endDate: '', proofCID: '' },
      ],
    });
  };

  const removeExperience = (index: number) => {
    setFormData({
      ...formData,
      experiences: formData.experiences.filter((_, i) => i !== index),
    });
  };

  const updateExperience = (index: number, field: string, value: string) => {
    const newExperiences = [...formData.experiences];
    newExperiences[index] = { ...newExperiences[index], [field]: value };
    setFormData({ ...formData, experiences: newExperiences });
  };

  const addLink = () => setFormData({ ...formData, links: [...formData.links, { label: '', url: '' }] });
  const updateLink = (i: number, k: keyof (typeof formData)['links'][number], v: string) => {
    const arr = [...formData.links];
    arr[i] = { ...arr[i], [k]: v } as any;
    setFormData({ ...formData, links: arr });
  };
  const removeLink = (i: number) => setFormData({ ...formData, links: formData.links.filter((_, idx) => idx !== i) });

  const addEdu = () => setFormData({ ...formData, education: [...formData.education, { school: '', degree: '', startDate: '', endDate: '', description: '' }] });
  const updateEdu = (i: number, k: keyof (typeof formData)['education'][number], v: string) => {
    const arr = [...formData.education];
    arr[i] = { ...arr[i], [k]: v } as any;
    setFormData({ ...formData, education: arr });
  };
  const removeEdu = (i: number) => setFormData({ ...formData, education: formData.education.filter((_, idx) => idx !== i) });

  const addCert = () => setFormData({ ...formData, certificates: [...formData.certificates, { title: '', issuer: '', date: '', proofCID: '' }] });
  const updateCert = (i: number, k: keyof (typeof formData)['certificates'][number], v: string) => {
    const arr = [...formData.certificates];
    arr[i] = { ...arr[i], [k]: v } as any;
    setFormData({ ...formData, certificates: arr });
  };
  const removeCert = (i: number) => setFormData({ ...formData, certificates: formData.certificates.filter((_, idx) => idx !== i) });

  const metadataJson = useMemo(() => {
    const skills = formData.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      $schema: 'https://schema.chainresume.app/v1',
      basic: formData.basic,
      contact: formData.contact,
      skills,
      links: formData.links,
      education: formData.education,
      certificates: formData.certificates,
      experiences: formData.experiences.map((e) => ({
        company: e.company,
        position: e.position,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
        proofCID: e.proofCID,
      })),
      createdAt: new Date().toISOString(),
      owner: address,
    };
  }, [formData, address]);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(metadataJson, null, 2));
      alert('已复制 JSON 到剪贴板。请上传到 IPFS 并把 CID 填入上方输入框。');
    } catch {}
  };

  const uploadToPinata = async () => {
    if (!pinataJWT) {
      alert('请先填入 Pinata JWT');
      return;
    }
    try {
      setUploading(true);
      const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pinataJWT}`,
        },
        body: JSON.stringify({
          pinataOptions: { cidVersion: 1 },
          pinataMetadata: { name: `chainresume-${Date.now()}` },
          pinataContent: metadataJson,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Pinata 上传失败');
      }
      if (data?.IpfsHash) {
        setFormData({ ...formData, metadataCID: data.IpfsHash });
        alert(`上传成功！CID: ${data.IpfsHash}`);
      } else {
        throw new Error('Pinata 未返回 IpfsHash');
      }
    } catch (e: any) {
      alert(`上传失败: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!contractAddress || !isConnected) {
      alert('请先连接钱包');
      return;
    }

    if (!formData.metadataCID) {
      alert('请输入元数据 CID（将下方 JSON 上传到 IPFS 后粘贴 CID）');
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, signer);

      const tx = await contract.createResume(formData.metadataCID);
      await tx.wait();

      const resumeId = await contract.resumeCount();

      for (const exp of formData.experiences) {
        if (exp.company && exp.position) {
          const startTimestamp = exp.startDate ? new Date(exp.startDate).getTime() / 1000 : 0;
          const endTimestamp = exp.endDate ? new Date(exp.endDate).getTime() / 1000 : 0;
          const expTx = await contract.addExperience(
            resumeId,
            exp.company,
            exp.position,
            exp.description,
            Math.floor(startTimestamp),
            Math.floor(endTimestamp),
            exp.proofCID || ''
          );
          await expTx.wait();
        }
      }

      alert('简历创建成功！');
      router.push(`/resume/${resumeId}`);
    } catch (error: any) {
      console.error('创建简历失败:', error);
      alert(`创建失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-gray-600">请先连接钱包</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">创建简历</h1>
        <p className="text-gray-600">填写你的职业信息，创建链上简历</p>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">姓名 *</label>
              <input
                type="text"
                placeholder="张三"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                value={formData.basic.name}
                onChange={(e) => setFormData({ ...formData, basic: { ...formData.basic, name: e.target.value } })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">职位/头衔 *</label>
              <input
                type="text"
                placeholder="全栈工程师 / 区块链开发"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                value={formData.basic.title}
                onChange={(e) => setFormData({ ...formData, basic: { ...formData.basic, title: e.target.value } })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">个人简介</label>
            <textarea
              placeholder="一句话介绍你的经验与优势..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.basic.summary}
              onChange={(e) => setFormData({ ...formData, basic: { ...formData.basic, summary: e.target.value } })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">头像 URL</label>
              <input
                type="text"
                placeholder="https://.../avatar.png"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.basic.avatarUrl}
                onChange={(e) => setFormData({ ...formData, basic: { ...formData.basic, avatarUrl: e.target.value } })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">所在城市</label>
              <input
                type="text"
                placeholder="Shanghai, China"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.basic.location}
                onChange={(e) => setFormData({ ...formData, basic: { ...formData.basic, location: e.target.value } })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Skills */}
      <Card>
        <CardHeader>
          <CardTitle>联系方式 & 技能</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="邮箱"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.contact.email}
              onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })}
            />
            <input
              type="text"
              placeholder="手机/微信"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.contact.phone}
              onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })}
            />
            <input
              type="text"
              placeholder="个人网站"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.contact.website}
              onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, website: e.target.value } })}
            />
            <input
              type="text"
              placeholder="GitHub"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.contact.github}
              onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, github: e.target.value } })}
            />
            <input
              type="text"
              placeholder="Twitter / X"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.contact.twitter}
              onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, twitter: e.target.value } })}
            />
            <input
              type="text"
              placeholder="ENS / Lens"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.contact.ens}
              onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, ens: e.target.value } })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">技能标签（逗号分隔）</label>
            <input
              type="text"
              placeholder="Solidity, React, TypeScript, Rust"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>个人链接</CardTitle>
            <Button variant="outline" size="sm" onClick={addLink}>+ 添加链接</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.links.length === 0 ? (
            <p className="text-gray-500 text-sm">可添加作品集、博客、演讲等链接</p>
          ) : (
            formData.links.map((link, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <input
                  className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="标签（如 Blog）"
                  value={link.label}
                  onChange={(e) => updateLink(i, 'label', e.target.value)}
                />
                <input
                  className="md:col-span-8 px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => updateLink(i, 'url', e.target.value)}
                />
                <button className="md:col-span-1 text-red-500" onClick={() => removeLink(i)}>删除</button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>教育经历</CardTitle>
            <Button variant="outline" size="sm" onClick={addEdu}>+ 添加教育</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.education.length === 0 ? (
            <p className="text-gray-500 text-sm">例如：XX 大学 计算机科学 本科</p>
          ) : (
            formData.education.map((edu, i) => (
              <div key={i} className="space-y-3 border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="px-4 py-2 border rounded-lg" placeholder="学校" value={edu.school} onChange={(e) => updateEdu(i, 'school', e.target.value)} />
                  <input className="px-4 py-2 border rounded-lg" placeholder="学位/专业" value={edu.degree} onChange={(e) => updateEdu(i, 'degree', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="px-4 py-2 border rounded-lg" type="month" placeholder="开始" value={edu.startDate} onChange={(e) => updateEdu(i, 'startDate', e.target.value)} />
                  <input className="px-4 py-2 border rounded-lg" type="month" placeholder="结束" value={edu.endDate} onChange={(e) => updateEdu(i, 'endDate', e.target.value)} />
                </div>
                <textarea className="w-full px-4 py-2 border rounded-lg" rows={2} placeholder="描述" value={edu.description} onChange={(e) => updateEdu(i, 'description', e.target.value)} />
                <div className="text-right"><button className="text-red-500" onClick={() => removeEdu(i)}>删除</button></div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Certificates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>证书 / 徽章</CardTitle>
            <Button variant="outline" size="sm" onClick={addCert}>+ 添加证书</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.certificates.length === 0 ? (
            <p className="text-gray-500 text-sm">例如：AWS Certified, Google Professional Cloud Architect 等</p>
          ) : (
            formData.certificates.map((c, i) => (
              <div key={i} className="space-y-3 border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className="px-4 py-2 border rounded-lg" placeholder="证书名称" value={c.title} onChange={(e) => updateCert(i, 'title', e.target.value)} />
                  <input className="px-4 py-2 border rounded-lg" placeholder="颁发机构" value={c.issuer} onChange={(e) => updateCert(i, 'issuer', e.target.value)} />
                  <input className="px-4 py-2 border rounded-lg" type="month" placeholder="日期" value={c.date} onChange={(e) => updateCert(i, 'date', e.target.value)} />
                </div>
                <input className="w-full px-4 py-2 border rounded-lg" placeholder="证明文件 CID（可选）" value={c.proofCID} onChange={(e) => updateCert(i, 'proofCID', e.target.value)} />
                <div className="text-right"><button className="text-red-500" onClick={() => removeCert(i)}>删除</button></div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Experiences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>工作经历</CardTitle>
            <Button variant="outline" size="sm" onClick={addExperience}>
              <span className="mr-1">+</span> 添加经历
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {formData.experiences.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>还没有添加工作经历</p>
              <Button variant="ghost" size="sm" onClick={addExperience} className="mt-4">
                + 添加第一份经历
              </Button>
            </div>
          ) : (
            formData.experiences.map((exp, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-6 space-y-4 relative">
                <button
                  onClick={() => removeExperience(index)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">公司名称 *</label>
                    <input
                      type="text"
                      placeholder="Acme Inc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">职位 *</label>
                    <input
                      type="text"
                      placeholder="高级工程师"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={exp.position}
                      onChange={(e) => updateExperience(index, 'position', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">工作描述</label>
                  <textarea
                    placeholder="描述你的工作内容和成就..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={exp.description}
                    onChange={(e) => updateExperience(index, 'description', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">开始日期</label>
                    <input
                      type="month"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={exp.startDate}
                      onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">结束日期（留空表示至今）</label>
                    <input
                      type="month"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={exp.endDate}
                      onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">证明文件 CID（可选）</label>
                  <input
                    type="text"
                    placeholder="QmXxx..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={exp.proofCID}
                    onChange={(e) => updateExperience(index, 'proofCID', e.target.value)}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Metadata JSON Preview */}
      <Card>
        <CardHeader>
          <CardTitle>元数据 JSON（上传到 IPFS，然后把 CID 粘贴到下方）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-auto text-xs max-h-72">
{JSON.stringify(metadataJson, null, 2)}
          </pre>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex gap-3">
              <Button variant="outline" onClick={copyJson}>复制 JSON</Button>
              <a className="px-4 py-2 rounded-xl border text-sm text-gray-700 hover:bg-gray-50" href="https://web3.storage/" target="_blank" rel="noreferrer">打开 Web3.Storage 上传</a>
              <a className="px-4 py-2 rounded-xl border text-sm text-gray-700 hover:bg-gray-50" href="https://pinata.cloud/" target="_blank" rel="noreferrer">打开 Pinata 上传</a>
            </div>
            <div className="flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="password"
              className="md:col-span-4 w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="在此粘贴 Pinata JWT（仅本地使用，不会被存储）"
              value={pinataJWT}
              onChange={(e) => setPinataJWT(e.target.value)}
            />
            <Button onClick={uploadToPinata} loading={uploading} variant="primary" className="md:col-span-1">
              用 Pinata 上传并填 CID
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CID + Actions */}
      <Card>
        <CardHeader>
          <CardTitle>链上存证</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="block text-sm font-medium">元数据 CID（IPFS）</label>
          <input
            type="text"
            placeholder="QmXxx..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            value={formData.metadataCID}
            onChange={(e) => setFormData({ ...formData, metadataCID: e.target.value })}
          />
          <p className="text-xs text-gray-500">将上方 JSON 上传到 IPFS，复制 CID 后粘贴到此处。</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="secondary" size="lg" onClick={() => router.back()}>
          取消
        </Button>
        <Button size="lg" onClick={handleCreate} loading={loading} className="flex-1">
          创建简历并上链
        </Button>
      </div>
    </div>
  );
}

