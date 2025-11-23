'use client';

import React from 'react';
import { Badge } from './ui/Badge';

interface Experience {
  company: string;
  position: string;
  description: string;
  startDate: number | bigint;
  endDate: number | bigint;
  proofCID: string;
  verified: boolean;
  verifier: string;
}

interface ExperienceTimelineProps {
  experiences: Experience[];
}

export const ExperienceTimeline: React.FC<ExperienceTimelineProps> = ({ experiences }) => {
  const formatDate = (timestamp: number | bigint) => {
    const tsNum = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
    if (!tsNum || tsNum === 0) return '至今';
    const date = new Date(tsNum * 1000);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' });
  };

  if (experiences.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">暂无工作经历</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-600" />

      {/* Experiences */}
      <div className="space-y-8">
        {experiences.map((exp, index) => (
          <div key={index} className="relative pl-20">
            {/* Timeline Dot */}
            <div className="absolute left-6 top-6 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-4 border-white shadow-lg" />

            {/* Experience Card */}
            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{exp.position}</h3>
                  <p className="text-lg text-blue-600 font-medium">{exp.company}</p>
                </div>
                {exp.verified ? (
                  <Badge variant="success">
                    <span className="mr-1">✅</span> 已认证
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <span className="mr-1">⏳</span> 待验证
                  </Badge>
                )}
              </div>

              <p className="text-sm text-gray-500 mb-3">
                {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
              </p>

              <p className="text-gray-700 mb-4">{exp.description}</p>

              {exp.verified && exp.verifier !== '0x0000000000000000000000000000000000000000' && (
                <div className="text-xs text-gray-500 border-t pt-3">
                  <span className="font-medium">认证方：</span>
                  <span className="font-mono ml-2">
                    {exp.verifier.slice(0, 6)}...{exp.verifier.slice(-4)}
                  </span>
                </div>
              )}

              {exp.proofCID && (
                <div className="text-xs text-gray-500 mt-2">
                  <span className="font-medium">证明文件：</span>
                  <a
                    href={`https://ipfs.io/ipfs/${exp.proofCID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-500 hover:underline"
                  >
                    查看 IPFS
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

