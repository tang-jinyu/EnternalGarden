"use client";

import { useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { isAddress } from "viem";
import { useAccount } from "wagmi";

const GardenIndex: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [input, setInput] = useState("");

  const valid = isAddress(input);

  return (
    <div className="flex items-center flex-col grow pt-10 px-5">
      <div className="max-w-xl w-full">
        <h1 className="text-3xl font-bold text-center">花园 Garden</h1>
        <p className="text-center mt-2 opacity-80">输入地址查看一座花园的生长状态、倒计时与封存情况。</p>

        <div className="flex gap-2 mt-8">
          <input
            className="input input-bordered w-full"
            placeholder="0x…"
            value={input}
            onChange={event => setInput(event.target.value)}
          />
          <Link href={`/garden/${input}`} passHref className={`btn btn-primary ${valid ? "" : "btn-disabled"}`}>
            查看
          </Link>
        </div>

        {connectedAddress && (
          <div className="mt-8 text-center">
            <Link href={`/garden/${connectedAddress}`} passHref className="btn btn-secondary">
              进入我的花园
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default GardenIndex;
