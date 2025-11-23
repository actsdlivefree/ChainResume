'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface ResumeCardProps {
  id: number;
  metadataCID: string;
  experienceCount: number;
  verifiedCount: number;
  owner: string;
}

export const ResumeCard: React.FC<ResumeCardProps> = ({
  id,
  metadataCID,
  experienceCount,
  verifiedCount,
  owner,
}) => {
  return (
    <Card hover>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle>简历 #{id}</CardTitle>
          <Badge variant={verifiedCount > 0 ? 'success' : 'info'}>
            {verifiedCount}/{experienceCount} 已认证
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 mb-4">
          <div className="text-sm">
            <span className="text-gray-500">所有者：</span>
            <span className="font-mono text-xs ml-2">
              {owner.slice(0, 6)}...{owner.slice(-4)}
            </span>
          </div>

          <div className="text-sm">
            <span className="text-gray-500">元数据：</span>
            <span className="font-mono text-xs ml-2 break-all">{metadataCID.slice(0, 20)}...</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-500">经历：</span>
              <span className="font-semibold ml-1">{experienceCount}</span>
            </div>
            <div>
              <span className="text-gray-500">认证：</span>
              <span className="font-semibold ml-1 text-green-600">{verifiedCount}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/resume/${id}`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full">
              查看详情
            </Button>
          </Link>
          <Link href={`/edit/${id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              编辑
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

