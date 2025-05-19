const solanaWeb3 = require('@solana/web3.js');

async function verifySolanaPayment(signature, expectedRecipient) {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');
    try {
        const tx = await connection.getParsedTransaction(signature, 'confirmed');
        if (!tx) return null;

        const amount = tx.meta.postBalances[1] - tx.meta.preBalances[1];
        const sol = amount / solanaWeb3.LAMPORTS_PER_SOL;
        const recipient = tx.transaction.message.accountKeys[1].pubkey.toString();

        return recipient === expectedRecipient ? sol : null;
    } catch (error) {
        console.error("Verification error:", error);
        return null;
    }
}

module.exports = { verifySolanaPayment };