"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
} from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const STATE_LABEL = ["尚未种植", "生长中 🌱", "已永恒封存 🌼"] as const;

function growthStage(count: number): string {
  if (count >= 10) return "🌳🌸🌼🌷";
  if (count >= 6) return "🌿🌷🌼";
  if (count >= 3) return "🌿🌱";
  return "🌱";
}

const GardenView: NextPage = () => {
  const params = useParams<{ address: string }>();
  const gardenAddress = params?.address as `0x${string}` | undefined;
  const { address: connectedAddress, chain, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { data: deployedContract, isLoading: isContractLoading } = useDeployedContractInfo({
    contractName: "EternalGarden",
  });
  const [now, setNow] = useState(0);

  const { data: garden, refetch } = useScaffoldReadContract({
    contractName: "EternalGarden",
    functionName: "gardenOf",
    args: [gardenAddress],
  });
  const { data: deadline } = useScaffoldReadContract({
    contractName: "EternalGarden",
    functionName: "deadlineOf",
    args: [gardenAddress],
  });
  const { data: canSeal } = useScaffoldReadContract({
    contractName: "EternalGarden",
    functionName: "canSeal",
    args: [gardenAddress],
  });

  const { writeContractAsync, isPending, isMining } = useScaffoldWriteContract({ contractName: "EternalGarden" });
  const isWrongNetwork = isConnected && chain?.id !== targetNetwork.id;
  const isTransactionBusy = isPending || isMining;

  useEffect(() => {
    const update = () => setNow(Math.floor(Date.now() / 1000));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!gardenAddress) return <div className="grow" />;

  const state = garden ? Number(garden.state) : 0;
  const isOwner = connectedAddress?.toLowerCase() === gardenAddress.toLowerCase();
  const remaining = deadline ? Number(deadline) - now : 0;

  const handleHeartbeat = async () => {
    if (!deployedContract || isWrongNetwork) return;
    try {
      const transactionHash = await writeContractAsync({ functionName: "heartbeat" });
      if (!transactionHash) return;

      notification.success("💧 心跳已上链，花园继续生长");
      await refetch();
    } catch (error) {
      notification.error(getParsedError(error));
    }
  };

  const handleSeal = async () => {
    if (!deployedContract || isWrongNetwork) return;
    try {
      const transactionHash = await writeContractAsync({ functionName: "sealEternally", args: [gardenAddress] });
      if (!transactionHash) return;

      notification.success("🌼 花园已被见证，进入永恒封存");
      await refetch();
    } catch (error) {
      notification.error(getParsedError(error));
    }
  };

  return (
    <div className="flex items-center flex-col grow pt-10 px-5">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center">花园</h1>
        <div className="flex justify-center mt-2">
          <Address address={gardenAddress} />
        </div>

        <div className={`alert mt-5 text-sm ${deployedContract ? "alert-success" : "alert-info"}`}>
          <span>
            当前目标网络：{targetNetwork.name}。{isContractLoading && "正在检查合约…"}
            {!isContractLoading && deployedContract && `合约可用：${deployedContract.address}`}
            {!isContractLoading && !deployedContract && "该网络尚未部署 EternalGarden 合约。"}
          </span>
        </div>

        <div className="text-center text-7xl my-8">
          {state === 2 ? "🌼🌼🌼" : growthStage(garden?.heartbeatCount ?? 0)}
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">状态：{STATE_LABEL[state]}</h2>
            {garden && garden.plantedAt > 0n && (
              <ul className="text-sm space-y-1 mt-2">
                <li>种植时间：{new Date(Number(garden.plantedAt) * 1000).toLocaleString()}</li>
                <li>心跳次数：{garden.heartbeatCount.toString()}</li>
                <li>最后心跳：{new Date(Number(garden.lastHeartbeat) * 1000).toLocaleString()}</li>
                {state === 1 && <li>距封存倒计时：{remaining > 0 ? `${remaining} 秒` : "已到期"}</li>}
                {state === 2 && <li>封存时间：{new Date(Number(garden.sealedAt) * 1000).toLocaleString()}</li>}
              </ul>
            )}
            {state === 0 && <p className="text-sm opacity-70 mt-2">这座花园还没有被种植。</p>}
          </div>
        </div>

        {state === 1 && (
          <div className="flex flex-col items-center gap-3 mt-8">
            {isOwner ? (
              <button
                className="btn btn-primary"
                onClick={handleHeartbeat}
                disabled={!deployedContract || isWrongNetwork || isTransactionBusy}
              >
                {isTransactionBusy ? "等待链上确认…" : "💧 我还在（心跳）"}
              </button>
            ) : (
              <p className="text-sm opacity-70">只有花园主人可以浇水心跳。</p>
            )}
            {canSeal ? (
              <button
                className="btn btn-secondary"
                onClick={handleSeal}
                disabled={!deployedContract || isWrongNetwork || isTransactionBusy}
              >
                🌼 见证花开（任何人可调用）
              </button>
            ) : (
              <p className="text-xs opacity-60">窗口期结束后，任何人都能见证花开并永久封存。</p>
            )}
          </div>
        )}

        {state === 2 && (
          <p className="text-center mt-8 text-lg">这座花园已进入不可逆的永恒封存。秘密存在过——这已被永远证明。</p>
        )}

        {isWrongNetwork && (
          <p className="text-sm text-error text-center mt-4">
            当前钱包网络为 {chain?.name ?? "未知网络"}，请切换到 {targetNetwork.name} 后再提交交易。
          </p>
        )}
      </div>
    </div>
  );
};

export default GardenView;
