import { deployScript, artifacts } from "../rocketh/deploy.js";

/**
 * Deploys EternalGarden with the short demo inactivity window (90 seconds).
 * The UI must read inactivityWindow() from the deployed contract instead of
 * assuming a duration; a production deployment uses a 30-day window.
 */
export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    const eternalGarden = await env.deploy("EternalGarden", {
      account: deployer,
      artifact: artifacts.EternalGarden,
      args: [90n],
    });

    const inactivityWindow = await env.read(eternalGarden, { functionName: "inactivityWindow" });
    console.log("🌱 EternalGarden inactivity window (seconds):", inactivityWindow);
  },
  {
    tags: ["EternalGarden"],
  },
);
