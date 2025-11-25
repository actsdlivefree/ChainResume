'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ExperienceTimeline } from '@/components/ExperienceTimeline';
import { ethers } from 'ethers';
import { ChainResumeABI } from '@/abi/ChainResumeABI';
import { ChainResumeAddresses } from '@/abi/ChainResumeAddresses';
import { useFhevm } from '@/fhevm/useFhevm';
import { FhevmDecryptionSignature } from '@/fhevm/FhevmDecryptionSignature';
import { GenericStringInMemoryStorage } from '@/fhevm/GenericStringStorage';

export default function ResumeViewPage() {
  const params = useParams();
  const resumeId = params.id as string;
  const { address, chainId, isConnected, provider } = useMetaMask();
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<number | null>(null);

  const contractInfo = ChainResumeAddresses[chainId?.toString() as keyof typeof ChainResumeAddresses];
  const contractAddress = contractInfo?.address as `0x${string}` | undefined;

  // FHEVM instance for encryption/decryption
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider: provider,
    chainId,
    initialMockChains: { 31337: 'http://localhost:8545' },
    enabled: true,
  });
  const [storage] = useState(() => new GenericStringInMemoryStorage());

  // metadata from IPFS
  const [meta, setMeta] = useState<any | null>(null);
  const [metaError, setMetaError] = useState<string>('');

  // FHE handles + clear values
  const [repHandle, setRepHandle] = useState<string>('');
  const [noteHandle, setNoteHandle] = useState<string>('');
  const [repClear, setRepClear] = useState<string>('');
  const [noteClear, setNoteClear] = useState<string>('');
  const [fheBusy, setFheBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    if (contractAddress && resumeId) {
      loadResume();
      loadHandles();
    }
  }, [contractAddress, resumeId]);

  const loadResume = async () => {
    if (!contractAddress) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, provider);

      const resumeData = await contract.getResume(resumeId);
      
      setResume({
        id: resumeId,
        owner: resumeData.owner,
        metadataCID: resumeData.metadataCID,
        experiences: resumeData.experiences || [],
      });

      // load metadata json from IPFS
      try {
        setMetaError('');
        const cid: string = resumeData.metadataCID;
        if (cid && typeof cid === 'string') {
          const url = cid.startsWith('ipfs://')
            ? cid.replace('ipfs://', 'https://ipfs.io/ipfs/')
            : `https://ipfs.io/ipfs/${cid}`;
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          setMeta(json);
        } else {
          setMeta(null);
        }
      } catch (e: any) {
        setMeta(null);
        setMetaError(`读取元数据失败: ${e.message || e}`);
      }
    } catch (error) {
      console.error('加载简历失败:', error);
      alert('简历不存在');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (d?: string) => {
    if (!d) return '';
    if (/^\d{4}-\d{2}/.test(d)) return d;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  };

  const loadHandles = async () => {
    try {
      if (!contractAddress) return;
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, provider);
      const rh = await contract.getScore(resumeId);
      const nh = await contract.getPrivateNote(resumeId);
      setRepHandle(rh);
      setNoteHandle(nh);
    } catch {}
  };

  const handleVerify = async (expIndex: number) => {
    if (!contractAddress || !isConnected) {
      alert('请先连接钱包');
      return;
    }

    setVerifying(expIndex);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, signer);

      const tx = await contract.verifyExperience(resumeId, expIndex);
      await tx.wait();

      alert('认证成功！');
      loadResume();
    } catch (error: any) {
      console.error('认证失败:', error);
      alert(`认证失败: ${error.message}`);
    } finally {
      setVerifying(null);
    }
  };

  // FHE: reputation +1/-1
  const adjustReputation = async (delta: number) => {
    if (!fhevmInstance || !contractAddress || !isConnected) {
      alert('请先连接钱包并等待 FHEVM 初始化');
      return;
    }
    setFheBusy(true);
    setMsg(`正在加密并${delta > 0 ? '增加' : '减少'}声誉...`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, signer);

      const userAddr = (await signer.getAddress()) as `0x${string}`;
      const input = fhevmInstance.createEncryptedInput(contractAddress, userAddr);
      input.add32(Math.abs(delta));
      await new Promise((r) => setTimeout(r, 100));
      const enc = await input.encrypt();

      setMsg('发送交易中...');
      const tx = delta > 0
        ? await contract.incrementScore(resumeId, enc.handles[0], enc.inputProof)
        : await contract.decrementScore(resumeId, enc.handles[0], enc.inputProof);
      await tx.wait();
      setMsg('已完成，加载最新句柄...');
      await loadHandles();
      setMsg('');
    } catch (e: any) {
      setMsg(`失败：${e.message}`);
    } finally {
      setFheBusy(false);
    }
  };

  // FHE: set random note
  const setRandomNote = async () => {
    if (!fhevmInstance || !contractAddress || !isConnected) {
      alert('请先连接钱包并等待 FHEVM 初始化');
      return;
    }
    setFheBusy(true);
    const value = Math.floor(Math.random() * 1000000);
    setMsg(`正在加密备注：${value}`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, ChainResumeABI.abi, signer);

      const userAddr = (await signer.getAddress()) as `0x${string}`;
      const input = fhevmInstance.createEncryptedInput(contractAddress, userAddr);
      input.add64(value);
      await new Promise((r) => setTimeout(r, 100));
      const enc = await input.encrypt();

      const tx = await contract.setPrivateNote(resumeId, enc.handles[0], enc.inputProof);
      await tx.wait();
      await loadHandles();
      setMsg('');
    } catch (e: any) {
      setMsg(`失败：${e.message}`);
    } finally {
      setFheBusy(false);
    }
  };

  const decryptHandle = async (handle: string, setClear: (v: string) => void) => {
    if (!fhevmInstance || !contractAddress || !isConnected) return;
    if (!handle || handle === ethers.ZeroHash) {
      setClear('0');
      return;
    }
    setFheBusy(true);
    setMsg('构建解密签名...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [contractAddress],
        signer,
        storage
      );
      if (!sig) {
        setMsg('签名失败');
        return;
      }
      setMsg('解密中...');
      const result = await fhevmInstance.userDecrypt(
        [{ handle, contractAddress }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );
      const clear = result[handle];
      setClear(String(clear));
      setMsg('');
    } catch (e: any) {
      setMsg(`解密失败：${e.message}`);
    } finally {
      setFheBusy(false);
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

  if (!resume) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">简历不存在</p>
        <Link href="/">
          <Button className="mt-4">返回首页</Button>
        </Link>
      </div>
    );
  }

  const isOwner = address && resume.owner.toLowerCase() === address.toLowerCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-3xl p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">简历 #{resumeId}</h1>
              <p className="text-white/90">链上可验证的职业履历</p>
            </div>
            {isOwner && (
              <Link href={`/edit/${resumeId}`}>
                <Button className="bg-white text-purple-600 hover:bg-gray-100">
                  编辑简历
                </Button>
              </Link>
            )}
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 space-y-3">
            <div>
              <span className="text-white/70 text-sm">所有者</span>
              <p className="font-mono text-lg">{resume.owner}</p>
            </div>
            <div>
              <span className="text-white/70 text-sm">元数据 CID</span>
              <p className="font-mono break-all">{resume.metadataCID}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata (from IPFS) */}
      <Card>
        <CardContent className="py-6">
          <h3 className="text-lg font-semibold mb-4">简历资料</h3>
          {metaError && (
            <p className="text-sm text-red-600 mb-2">{metaError}</p>
          )}
          {!meta && !metaError && (
            <p className="text-sm text-gray-500">未找到元数据，或 CID 未指向有效 JSON。</p>
          )}
          {meta && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div>
                  {meta.basic?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meta.basic.avatarUrl} alt="avatar" className="w-32 h-32 rounded-2xl object-cover border" />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">无头像</div>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div className="text-2xl font-bold">{meta.basic?.name || '未命名'}</div>
                  <div className="text-blue-600 font-medium">{meta.basic?.title || ''}</div>
                  <div className="text-gray-700">{meta.basic?.summary || ''}</div>
                  <div className="text-gray-500 text-sm">{meta.basic?.location || ''}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="font-medium">联系方式</div>
                  <div className="text-sm text-gray-700">邮箱：{meta.contact?.email || '-'}</div>
                  <div className="text-sm text-gray-700">手机/微信：{meta.contact?.phone || '-'}</div>
                  <div className="text-sm text-gray-700">网站：{meta.contact?.website || '-'}</div>
                  <div className="text-sm text-gray-700">GitHub：{meta.contact?.github || '-'}</div>
                  <div className="text-sm text-gray-700">Twitter：{meta.contact?.twitter || '-'}</div>
                  <div className="text-sm text-gray-700">ENS / Lens：{meta.contact?.ens || meta.contact?.lens || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">技能</div>
                  <div className="text-sm text-gray-700">{Array.isArray(meta.skills) ? meta.skills.join('、') : meta.skills || '-'}</div>
                  <div className="font-medium mt-4">链接</div>
                  <ul className="list-disc pl-5 text-sm text-blue-600 space-y-1">
                    {(meta.links || []).map((l: any, i: number) => (
                      <li key={i}>
                        <a href={l.url} target="_blank" rel="noreferrer" className="hover:underline">{l.label || l.url}</a>
                      </li>
                    ))}
                    {(!meta.links || meta.links.length === 0) && <li className="text-gray-500">无</li>}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="font-medium mb-2">教育经历</div>
                  <div className="space-y-3">
                    {(meta.education || []).map((e: any, i: number) => (
                      <div key={i} className="border rounded-lg p-3">
                        <div className="font-semibold">{e.school}</div>
                        <div className="text-sm text-gray-700">{e.degree}</div>
                        <div className="text-xs text-gray-500">{fmt(e.startDate)} - {fmt(e.endDate) || '至今'}</div>
                        {e.description && <div className="text-sm text-gray-700 mt-1">{e.description}</div>}
                      </div>
                    ))}
                    {(!meta.education || meta.education.length === 0) && <div className="text-sm text-gray-500">无</div>}
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-2">证书 / 徽章</div>
                  <div className="space-y-3">
                    {(meta.certificates || []).map((c: any, i: number) => (
                      <div key={i} className="border rounded-lg p-3">
                        <div className="font-semibold">{c.title}</div>
                        <div className="text-sm text-gray-700">{c.issuer}</div>
                        <div className="text-xs text-gray-500">{fmt(c.date)}</div>
                        {c.proofCID && (
                          <a className="text-blue-600 text-xs hover:underline" href={`https://ipfs.io/ipfs/${c.proofCID}`} target="_blank" rel="noreferrer">查看证明</a>
                        )}
                      </div>
                    ))}
                    {(!meta.certificates || meta.certificates.length === 0) && <div className="text-sm text-gray-500">无</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FHE Controls */}
      <Card>
        <CardContent className="py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">🔐 FHEVM 加密声誉与私密备注</h3>
            <div className="text-sm text-gray-600">FHEVM: {fhevmStatus}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reputation */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">加密声誉（euint32）</span>
                <div className="flex gap-2">
                  <Button size="sm" disabled={!isOwner || fheBusy || fhevmStatus !== 'ready'} onClick={() => adjustReputation(+1)}>+1</Button>
                  <Button size="sm" variant="secondary" disabled={!isOwner || fheBusy || fhevmStatus !== 'ready'} onClick={() => adjustReputation(-1)}>-1</Button>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">句柄：</div>
              <p className="font-mono break-all text-xs bg-gray-50 p-2 rounded">{repHandle || '—'}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-gray-600">明文：</div>
                <Button size="sm" variant="outline" disabled={!repHandle || fheBusy || fhevmStatus !== 'ready'} onClick={() => decryptHandle(repHandle, setRepClear)}>解密</Button>
              </div>
              <p className="text-2xl font-bold text-blue-600">{repClear || '—'}</p>
            </div>

            {/* Private Note */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">加密私密备注（euint64）</span>
                <Button size="sm" disabled={!isOwner || fheBusy || fhevmStatus !== 'ready'} onClick={setRandomNote}>设置随机备注</Button>
              </div>
              <div className="text-sm text-gray-600 mb-2">句柄：</div>
              <p className="font-mono break-all text-xs bg-gray-50 p-2 rounded">{noteHandle || '—'}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-gray-600">明文：</div>
                <Button size="sm" variant="outline" disabled={!noteHandle || fheBusy || fhevmStatus !== 'ready'} onClick={() => decryptHandle(noteHandle, setNoteClear)}>解密</Button>
              </div>
              <p className="text-2xl font-bold text-purple-600">{noteClear || '—'}</p>
            </div>
          </div>

          {msg && <p className="text-sm text-gray-700">{msg}</p>}
        </CardContent>
      </Card>

      {/* Experiences */}
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">工作经历</h2>
            <div className="text-sm text-gray-600">
              {resume.experiences.filter((e: any) => e.verified).length} / {resume.experiences.length} 已认证
            </div>
          </div>

          <ExperienceTimeline experiences={resume.experiences} />
        </CardContent>
      </Card>

      {/* Verification Section */}
      {!isOwner && isConnected && resume.experiences.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <h3 className="text-lg font-semibold mb-4">认证经历</h3>
            <p className="text-sm text-gray-600 mb-4">
              如果你是以下公司/机构的代表，可以对候选人的经历进行链上背书
            </p>
            <div className="space-y-2">
              {resume.experiences.map((exp: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{exp.company}</p>
                    <p className="text-sm text-gray-600">{exp.position}</p>
                  </div>
                  {exp.verified ? (
                    <span className="text-green-600 text-sm">✅ 已认证</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleVerify(index)}
                      loading={verifying === index}
                    >
                      认证此经历
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Button */}
      <div className="text-center">
        <Link href="/">
          <Button variant="outline">返回首页</Button>
        </Link>
      </div>
    </div>
  );
}

