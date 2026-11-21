"use client";

import { useState } from "react";
import { hashCapsule, parseCapsule } from "@eternal-garden/capsule";
import type { NextPage } from "next";
import { isAddress } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

function OnchainHash({ address }: { address: `0x${string}` }) {
  const { data: garden } = useScaffoldReadContract({
    contractName: "EternalGarden",
    functionName: "gardenOf",
    args: [address],
  });

  if (!garden) return <p className="text-sm opacity-60 mt-4">读取链上承诺中…（需先完成测试网部署）</p>;
  if (garden.cipherHash === `0x${"00".repeat(32)}`)
    return <p className="text-sm text-warning mt-4">该地址还没有花园。</p>;
  return (
    <div className="mt-4">
      <p className="text-sm font-medium">链上承诺 cipherHash：</p>
      <code className="block break-all bg-base-300 p-3 rounded mt-1 text-xs">{garden.cipherHash}</code>
    </div>
  );
}

const Verify: NextPage = () => {
  const [address, setAddress] = useState("");
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const validAddress = isAddress(address);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileHash(null);
    setFileError(null);
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      parseCapsule(bytes);
      setFileHash(hashCapsule(bytes));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "胶囊文件解析失败");
    }
  };

  return (
    <div className="flex items-center flex-col grow pt-10 px-5">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center">验证 Verify</h1>
        <p className="text-center mt-2 opacity-80">
          上传本地 .garden 胶囊文件，重新计算 Keccak-256 承诺并与链上记录比对，证明胶囊自种下起未被篡改。
        </p>

        <div className="mt-8">
          <p className="text-sm font-medium mb-2">1. 花园地址</p>
          <input
            className="input input-bordered w-full"
            placeholder="0x…"
            value={address}
            onChange={event => setAddress(event.target.value)}
          />
          {validAddress && <OnchainHash address={address as `0x${string}`} />}
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium mb-2">2. 本地 .garden 胶囊文件</p>
          <input type="file" accept=".garden" className="file-input file-input-bordered w-full" onChange={handleFile} />
          {fileError && <p className="text-sm text-error mt-2">{fileError}</p>}
          {fileHash && (
            <div className="mt-2">
              <p className="text-sm font-medium">本地重算承诺：</p>
              <code className="block break-all bg-base-300 p-3 rounded mt-1 text-xs">{fileHash}</code>
            </div>
          )}
        </div>

        {validAddress && fileHash && <Comparison address={address as `0x${string}`} fileHash={fileHash} />}

        <p className="text-xs opacity-60 mt-8">
          协议没有解密能力：验证只证明“这份密文与当初上链的承诺一致”，无法也永远不会展示明文。
        </p>
      </div>
    </div>
  );
};

function Comparison({ address, fileHash }: { address: `0x${string}`; fileHash: string }) {
  const { data: garden } = useScaffoldReadContract({
    contractName: "EternalGarden",
    functionName: "gardenOf",
    args: [address],
  });

  if (!garden || garden.cipherHash === `0x${"00".repeat(32)}`) return null;

  const match = garden.cipherHash.toLowerCase() === fileHash.toLowerCase();

  return (
    <div className={`alert mt-8 ${match ? "alert-success" : "alert-error"}`}>
      {match
        ? "✅ 哈希一致：这份胶囊就是当初种下的那一份，内容未被篡改。"
        : "❌ 哈希不一致：文件被修改过，或这不是对应花园的胶囊。"}
    </div>
  );
}

export default Verify;
