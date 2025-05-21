const solanaWeb3 = require("@solana/web3.js");

async function verifySolanaPayment(signature, expectedRecipient) {
<<<<<<< HEAD
  const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');

  try {
    const tx = await connection.getParsedTransaction(signature, 'confirmed');
=======
  const connection = new solanaWeb3.Connection(
    solanaWeb3.clusterApiUrl("mainnet-beta"),
    "confirmed"
  );

  try {
    const tx = await connection.getParsedTransaction(signature, "confirmed");
>>>>>>> 0047023 (Update bot logic and add new files)
    if (!tx) return null;

    // Check all instructions for native SOL transfer
    for (const instr of tx.transaction.message.instructions) {
<<<<<<< HEAD
      if (instr.program === 'system' && instr.parsed?.type === 'transfer') {
=======
      if (instr.program === "system" && instr.parsed?.type === "transfer") {
>>>>>>> 0047023 (Update bot logic and add new files)
        const info = instr.parsed.info;
        if (info.destination === expectedRecipient) {
          const lamports = parseInt(info.lamports, 10);
          const sol = lamports / solanaWeb3.LAMPORTS_PER_SOL;
          return sol;
        }
      }
    }

    return null; // No valid payment found to expected recipient
  } catch (error) {
    console.error("Verification error:", error);
    return null;
  }
}

module.exports = { verifySolanaPayment };
