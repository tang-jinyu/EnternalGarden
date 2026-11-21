"use client";

import { useState } from "react";
import { encryptTextCapsule } from "@eternal-garden/capsule";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const ZERO_META_HASH = `0x${"00".repeat(32)}` as const;

const Plant: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [secret, setSecret] = useState("");
  const [capsule, setCapsule] = useState<Uint8Array | null>(null);
  const [cipherHash, setCipherHash] = useState<string | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "EternalGarden" });

  const handleEncrypt = async () => {
    if (!secret.trim()) {
      notification.error("请输入要种下的秘密");
      return;
    }
    setEncrypting(true);
    try {
      const encrypted = await encryptTextCapsule(secret);
      setCapsule(encrypted.capsule);
      setCipherHash(encrypted.cipherHash);
      notification.success("已在本地完成 AES-256-GCM 加密");
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "本地加密失败");
    } finally {
      setEncrypting(false);
    }
  };

  const handleDownload = () => {
    if (!capsule) return;
    const blob = new Blob([capsule.slice().buffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${cipherHash ?? "garden"}.garden`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePlant = async () => {
    if (!cipherHash) return;
    try {
      await writeContractAsync({
        functionName: "plant",
        args: [cipherHash, ZERO_META_HASH],
      });
      notification.success("🌱 种花交易已确认，花园开始生长");
      setSecret("");
      setCapsule(null);
      setCipherHash(null);
    } catch (error) {
      notification.error(error instanceof Error ? error.message : "种花交易失败");
    }
  };

  return (
    <div className="flex items-center flex-col grow pt-10 px-5">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center">种花 Plant</h1>
        <p className="text-center mt-2 opacity-80">
          加密完全在你的浏览器内完成。明文与密钥绝不离开本机，链上只记录密文胶囊的哈希承诺。
        </p>

        <div className="alert alert-warning mt-6 text-sm">
          种下之后没有任何人能解密这份内容——包括你自己。请先在本地保存好 .garden 胶囊文件。
        </div>

        <textarea
          className="textarea textarea-bordered w-full h-40 mt-6"
          placeholder="写下你想封存的话：一段回忆、一个秘密、一份创作……"
          value={secret}
          onChange={event => setSecret(event.target.value)}
        />

        <div className="flex gap-3 mt-4">
          <button className="btn btn-secondary" onClick={handleEncrypt} disabled={encrypting}>
            {encrypting ? "本地加密中…" : "1. 本地加密"}
          </button>
          <button className="btn btn-outline" onClick={handleDownload} disabled={!capsule}>
            2. 下载 .garden 胶囊
          </button>
          <button className="btn btn-primary" onClick={handlePlant} disabled={!cipherHash || !isConnected || isPending}>
            {isPending ? "上链确认中…" : "3. 种花"}
          </button>
        </div>

        {!isConnected && <p className="text-sm text-error mt-3">请先连接钱包再种花。</p>}

        {cipherHash && (
          <div className="mt-6">
            <p className="text-sm font-medium">链上承诺 cipherHash：</p>
            <code className="block break-all bg-base-300 p-3 rounded mt-1 text-xs">{cipherHash}</code>
            <p className="text-xs opacity-60 mt-2">交易 calldata 中只会出现这个哈希，没有任何明文或密钥。</p>
          </div>
        )}

        {connectedAddress && (
          <p className="text-xs opacity-60 mt-6">你的花园地址：{connectedAddress}（一个地址只能种一株）</p>
        )}
      </div>
    </div>
  );
};

export default Plant;
