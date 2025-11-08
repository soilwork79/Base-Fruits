const { ethers } = require('ethers');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { playerAddress, farcasterUsername, fid, score } = req.body;

    // Validate input
    if (!playerAddress || !farcasterUsername || fid === undefined || score === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Generate nonce
    const nonce = Date.now();

    // Create message hash
    const messageHash = ethers.utils.solidityKeccak256(
      ['string', 'uint256', 'uint256', 'uint256', 'address'],
      [farcasterUsername, fid, score, nonce, playerAddress]
    );

    // Sign with backend private key (KEEP THIS SECRET!)
    const privateKey = process.env.BACKEND_PRIVATE_KEY; // Set this in Vercel env vars
    if (!privateKey) {
      throw new Error('Backend private key not configured');
    }

    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));

    return res.status(200).json({
      success: true,
      data: {
        params: {
          farcasterUsername,
          fid,
          score
        },
        nonce,
        signature
      }
    });

  } catch (error) {
    console.error('Sign score error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
};
