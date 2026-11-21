"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

const onchainItems = [
  "cipherHash：加密胶囊的 Keccak-256 承诺",
  "心跳次数与最后心跳时间",
  "种植 / 封存时间戳",
  "单向状态：NONE → GROWING → ETERNAL",
];
const offchainItems = [
  "明文内容（永不触链）",
  "AES-256-GCM 密钥（加密后即丢弃）",
  "文件名、MIME 等可泄露语义的元数据",
  "任何可解密的信息",
];

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 max-w-3xl">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">永恒花园</span>
            <span className="block text-4xl font-bold">秘密不交给链，存在交给时间。</span>
          </h1>
          <p className="text-center mt-4 text-lg">
            内容只在你的设备上加密。链上只有承诺、心跳与封存状态——超时之后，任何人都能见证花开，
            协议也始终没有读取秘密所需的密钥。
          </p>
          <div className="flex justify-center items-center space-x-2 flex-col">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} chain={targetNetwork} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
            <div className="card bg-base-100 border border-success/40 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-success">链上有什么（公开但无害）</h2>
                <ul className="list-disc list-inside space-y-1">
                  {onchainItems.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="card bg-base-100 border border-error/40 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-error">链上没有什么（永不上链）</h2>
                <ul className="list-disc list-inside space-y-1">
                  {offchainItems.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-10">
            <Link href="/plant" passHref className="btn btn-primary">
              种下一株秘密 🌱
            </Link>
            <Link href="/verify" passHref className="btn btn-outline">
              验证胶囊完整性
            </Link>
          </div>

          <p className="text-center mt-10 text-sm opacity-70">
            目标网络：Monad Testnet（Chain ID 10143）。协议从未持有内容或解密密钥——这是合约与客户端的边界。
          </p>
        </div>
      </div>
    </>
  );
};

export default Home;
