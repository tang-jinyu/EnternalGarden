"use client";

import { useState } from "react";
import { type CipherHash, encryptTextCapsule } from "@eternal-garden/capsule";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const ZERO_META_HASH = `0x${"00".repeat(32)}` as const;

const Plant: NextPage = () => {
  const { address: connectedAddress, chain, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { data: deployedContract, isLoading: isContractLoading } = useDeployedContractInfo({
    contractName: "EternalGarden",
  });
  const [secret, setSecret] = useState("");
  const [capsule, setCapsule] = useState<Uint8Array | null>(null);
  const [cipherHash, setCipherHash] = useState<CipherHash | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const { writeContractAsync, isPending, isMining } = useScaffoldWriteContract({ contractName: "EternalGarden" });
  const isWrongNetwork = isConnected && chain?.id !== targetNetwork.id;
  const isTransactionBusy = isPending || isMining;

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
    if (!cipherHash || !deployedContract || isWrongNetwork) return;
    try {
      const transactionHash = await writeContractAsync({
        functionName: "plant",
        args: [cipherHash, ZERO_META_HASH],
      });
      if (!transactionHash) return;

      notification.success("🌱 种花交易已确认，花园开始生长");
      setSecret("");
      setCapsule(null);
      setCipherHash(null);
    } catch (error) {
      notification.error(getParsedError(error));
    }
  };

  return (
    <div className="flex items-center flex-col grow pt-10 px-5">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center">种花 Plant</h1>
        <p className="text-center mt-2 opacity-80">
          加密完全在你的浏览器内完成。明文与密钥不会发送给协议，链上只记录密文胶囊的哈希承诺。
        </p>

        <div className="alert alert-warning mt-6 text-sm">
          协议从未持有或提供解密密钥。请保存 .garden 密文文件，以便日后验证它与链上承诺一致。
        </div>

        <div className={`alert mt-3 text-sm ${deployedContract ? "alert-success" : "alert-info"}`}>
          <span>
            当前目标网络：{targetNetwork.name}。{isContractLoading && "正在检查合约…"}
            {!isContractLoading && deployedContract && `合约可用：${deployedContract.address}`}
            {!isContractLoading && !deployedContract && "该网络尚未部署 EternalGarden 合约。"}
          </span>
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
          <button
            className="btn btn-primary"
            onClick={handlePlant}
            disabled={!cipherHash || !isConnected || !deployedContract || isWrongNetwork || isTransactionBusy}
          >
            {isTransactionBusy ? "等待链上确认…" : !deployedContract ? "合约未部署" : "3. 种花"}
          </button>
        </div>

        {!isConnected && <p className="text-sm text-error mt-3">请先连接钱包再种花。</p>}
        {isWrongNetwork && (
          <p className="text-sm text-error mt-3">
            当前钱包网络为 {chain?.name ?? "未知网络"}，请切换到 {targetNetwork.name}。
          </p>
        )}

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
