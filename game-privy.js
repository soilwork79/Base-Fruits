// SAVE SCORE TO BLOCKCHAIN WITH PRIVY
async function saveScoreWithPrivy() {
    const btn = document.getElementById('save-leaderboard-button');
    btn.disabled = true;
    btn.textContent = '⏳ Connecting...';

    try {
        let walletAddress = null;
        let signer = null;
        let rawProvider = null;
        let userInfo = { username: '', fid: 0 };

        // ============================================
        // 1) PRIVY WALLET CONNECTION
        // ============================================
        if (window.privyClient) {
            console.log('🔐 Using Privy for wallet connection');
            
            // Check if user is already authenticated
            const isAuthenticated = window.privyClient.authenticated;
            
            if (!isAuthenticated) {
                console.log('User not authenticated, logging in with Privy...');
                btn.textContent = '🔐 Login with Wallet...';
                
                try {
                    // Login with Privy (will show wallet selection modal)
                    await window.privyClient.login();
                    console.log('✅ Privy login successful');
                } catch (loginError) {
                    console.error('❌ Privy login failed:', loginError);
                    throw new Error('Login cancelled or failed');
                }
            }
            
            // Get the connected wallet
            const wallets = await window.privyClient.getWallets();
            if (!wallets || wallets.length === 0) {
                throw new Error('No wallet connected');
            }
            
            const wallet = wallets[0];
            walletAddress = wallet.address;
            console.log('Connected wallet address:', walletAddress);
            
            // Get Farcaster user info if available
            const user = window.privyClient.user;
            if (user?.farcaster) {
                userInfo = {
                    username: user.farcaster.username || '',
                    fid: user.farcaster.fid || 0
                };
                console.log('Farcaster user info:', userInfo);
            } else {
                // Use wallet address as username if no Farcaster info
                userInfo.username = `User${walletAddress.slice(2, 8)}`;
            }
            
            // Switch to Base network
            btn.textContent = '🔄 Switching to Base...';
            try {
                await wallet.switchChain(8453); // Base mainnet chain ID
                console.log('✅ Switched to Base network');
            } catch (switchError) {
                console.error('Failed to switch network:', switchError);
                // Continue anyway, user might already be on Base
            }
            
            // Get ethers provider and signer
            const provider = await wallet.getEthersProvider();
            signer = provider.getSigner();
            rawProvider = provider.provider; // Get the raw provider for fallback
            
        } else if (typeof window.ethereum !== 'undefined') {
            // ============================================
            // 2) METAMASK/WALLET FALLBACK
            // ============================================
            console.log('Privy not available, using MetaMask/Browser wallet');
            
            let provider = window.ethereum;
            
            if (window.ethereum.providers?.length > 0) {
                console.log('Multiple wallets detected');
                const metamaskProvider = window.ethereum.providers.find(
                    (p) => p.isMetaMask
                );
                if (metamaskProvider) {
                    provider = metamaskProvider;
                    console.log('Using MetaMask');
                }
            }
            
            rawProvider = provider;

            const accounts = await rawProvider.request({
                method: 'eth_requestAccounts'
            });
            walletAddress = accounts[0];
            console.log('Wallet connected:', walletAddress);
            
            userInfo.username = `User${walletAddress.slice(2, 8)}`;
            userInfo.fid = 0;

            // Check and switch to Base network
            btn.textContent = '⏳ Checking network...';
            const chainId = await rawProvider.request({ method: 'eth_chainId' });
            console.log('Current chain:', chainId);

            if (chainId !== '0x2105') {
                try {
                    await rawProvider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x2105' }]
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        await rawProvider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x2105',
                                chainName: 'Base Mainnet',
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org']
                            }]
                        });
                    } else {
                        throw switchError;
                    }
                }
            }

            // Create signer with ethers
            if (window.ethers) {
                const ethers = window.ethers;
                const ethersProvider = new ethers.providers.Web3Provider(rawProvider);
                signer = ethersProvider.getSigner();
                console.log('Ethers.js signer created');
            }
        }

        // ============================================
        // 3) NO WALLET AVAILABLE
        // ============================================
        if (!walletAddress) {
            throw new Error('No wallet connected. Please install MetaMask or use a Web3 wallet!');
        }

        // ============================================
        // 4) GET BACKEND SIGNATURE (Optional - for now we'll skip this)
        // ============================================
        // For testing, we'll submit directly without backend signature
        // In production, you should get a signature from your backend API
        
        btn.textContent = '⏳ Preparing transaction...';
        
        // ============================================
        // 5) SUBMIT TO CONTRACT
        // ============================================
        const CONTRACT_ADDRESS = '0xa4f109Eb679970C0b30C21812C99318837A81c73'; // Your contract address
        const currentScore = window.currentScore || 0;
        
        console.log('📦 Preparing contract call:');
        console.log('  - Contract:', CONTRACT_ADDRESS);
        console.log('  - Username:', userInfo.username);
        console.log('  - FID:', userInfo.fid);
        console.log('  - Score:', currentScore);
        console.log('  - Wallet:', walletAddress);
        
        if (signer && window.ethers?.Contract) {
            btn.textContent = '⏳ Submitting score...';
            
            const ethers = window.ethers;
            
            // Try to read contract first to verify it exists
            try {
                const code = await signer.provider.getCode(CONTRACT_ADDRESS);
                if (code === '0x') {
                    throw new Error('Contract not found at this address on Base network!');
                }
                console.log('✅ Contract found on Base network');
            } catch (codeError) {
                console.error('Contract verification failed:', codeError);
                throw new Error('Contract not deployed on Base network or wrong address');
            }
            
            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                [
                    'function submitScore(string memory _farcasterUsername, uint256 _fid, uint256 _score) external'
                ],
                signer
            );
            
            try {
                console.log('📤 Calling submitScore...');
                const tx = await contract.submitScore(
                    userInfo.username,
                    userInfo.fid,
                    currentScore
                );
                
                btn.textContent = '⏳ Waiting for confirmation...';
                await tx.wait();
                
                console.log('✅ Score submitted successfully!');
                alert(`✅ Score saved successfully!\nScore: ${currentScore}\nUser: ${userInfo.username}`);
                btn.textContent = '✅ Saved!';
                
            } catch (contractError) {
                console.error('Contract interaction error:', contractError);
                throw contractError;
            }
            
        } else if (rawProvider) {
            // Fallback: use raw provider
            btn.textContent = '⏳ Submitting score...';
            
            const ethers = window.ethers;
            const iface = new ethers.utils.Interface([
                'function submitScore(string memory _farcasterUsername, uint256 _fid, uint256 _score) external'
            ]);
            
            const data = iface.encodeFunctionData('submitScore', [
                userInfo.username,
                userInfo.fid,
                currentScore
            ]);

            const txParams = {
                to: CONTRACT_ADDRESS,
                from: walletAddress,
                data: data,
                gas: '0x30000'
            };

            const txHash = await rawProvider.request({
                method: 'eth_sendTransaction',
                params: [txParams]
            });

            btn.textContent = '⏳ Waiting for confirmation...';
            
            // Wait for transaction confirmation
            let receipt = null;
            let attempts = 0;
            while (!receipt && attempts < 60) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                receipt = await rawProvider.request({
                    method: 'eth_getTransactionReceipt',
                    params: [txHash]
                });
                attempts++;
            }

            if (!receipt) throw new Error('Transaction timeout');
            if (receipt.status === '0x0') throw new Error('Transaction failed');
            
            console.log('✅ Score submitted successfully!');
            alert(`✅ Score saved successfully!\nScore: ${currentScore}\nUser: ${userInfo.username}`);
            btn.textContent = '✅ Saved!';
            
        } else {
            throw new Error('Unable to interact with contract');
        }

        // Reset button after 3 seconds
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '💾 Save Leaderboard';
        }, 3000);

    } catch (error) {
        console.error('Save score error:', error);
        
        if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
            alert('❌ Transaction cancelled.');
        } else if (error.message?.includes('insufficient funds')) {
            alert('❌ Insufficient ETH for gas fees on Base network!');
        } else {
            alert('❌ Error: ' + (error.message || 'Unknown error'));
        }
        
        btn.disabled = false;
        btn.textContent = '💾 Save Leaderboard';
    }
}

// Export the function to be used in game.js
window.saveScoreWithPrivy = saveScoreWithPrivy;
