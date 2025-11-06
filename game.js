// ===== LEADERBOARD FUNCTIONALITY =====

const CONTRACT_ADDRESS = '0xa4f109Eb679970C0b30C21812C99318837A81c73';
const API_URL = ''; // Vercel backend'inizin adresi
let currentScore = 0;

// SAVE SCORE - Farcaster SDK + MetaMask destekli
async function saveScore() {
    const btn = document.getElementById('save-leaderboard-button');
    btn.disabled = true;
    btn.textContent = '⏳ Processing...';

    try {
        let walletAddress = null;
        let rawProvider = null;
        let username = '';
        let fid = 0;

        // 1. Farcaster Mini App Wallet'ı dene (ÖNCELİKLİ)
        try {
            if (window.sdk?.wallet?.getEthereumProvider) {
                console.log('Farcaster SDK detected, trying wallet...');
                rawProvider = await window.sdk.wallet.getEthereumProvider();
                
                if (rawProvider) {
                    const accounts = await rawProvider.request({ method: 'eth_requestAccounts' });
                    walletAddress = accounts?.[0];
                    
                    // Farcaster kullanıcı bilgileri
                    if (window.farcasterContext?.user) {
                        username = window.farcasterContext.user.username || `User${walletAddress?.slice(2, 8)}`;
                        fid = window.farcasterContext.user.fid || 0;
                    }
                    
                    console.log('✅ Farcaster wallet connected:', walletAddress);
                }
            }
        } catch (sdkError) {
            console.log('Farcaster SDK error:', sdkError);
        }

        // 2. Farcaster SDK başarısız olursa, MetaMask/ EIP-1193 provider dene
        if (!walletAddress) {
            console.log('Trying MetaMask/browser wallet...');
            
            if (window.ethereum) {
                rawProvider = window.ethereum;
                const accounts = await rawProvider.request({ method: 'eth_requestAccounts' });
                walletAddress = accounts?.[0];
                username = `User${walletAddress.slice(2, 8)}`;
                fid = 0;
                console.log('✅ MetaMask connected:', walletAddress);
            }
        }

        // 3. Hala wallet bağlanmadıysa hata göster
        if (!walletAddress || !rawProvider) {
            throw new Error('Cüzdan bağlanamadı. Lütfen Farcaster Mini App veya MetaMask kullanın.');
        }

        // 4. Base Mainnet ağını kontrol et ve değiştir
        btn.textContent = '⏳ Checking network...';
        const chainIdHex = await rawProvider.request({ method: 'eth_chainId' });
        if (chainIdHex !== '0x2105') { // Base Mainnet chain ID
            await rawProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x2105' }]
            });
        }

        // 5. Backend'den imza al
        btn.textContent = '⏳ Getting signature...';
        const signResponse = await fetch(`${API_URL}/api/sign-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerAddress: walletAddress,
                farcasterUsername: username,
                fid: fid,
                score: currentScore
            })
        });

        const signData = await signResponse.json();
        if (!signData.success) {
            throw new Error(signData.message);
        }

        // 6. Transaction gönder
        btn.textContent = '⏳ Submitting...';
        
        const ethers = window.ethers;
        const iface = new ethers.utils.Interface([
            'function submitScore(string memory _farcasterUsername, uint256 _fid, uint256 _score, uint256 _nonce, bytes memory _signature) external'
        ]);
        
        const data = iface.encodeFunctionData('submitScore', [
            signData.data.params.farcasterUsername,
            signData.data.params.fid,
            signData.data.params.score,
            signData.data.nonce,
            signData.data.signature
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

        // 7. Transaction confirmation bekle
        btn.textContent = '⏳ Waiting confirmation...';
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

        // 8. Başarı mesajı
        if (!window.sdk) {
            alert('✅ Score saved successfully!');
        }
        btn.textContent = '✅ Saved!';
        console.log('✅ Transaction successful:', txHash);

    } catch (error) {
        console.error('❌ Save score error:', error);
        
        // Kullanıcı reject ettiyse
        if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
            if (!window.sdk) alert('❌ Transaction cancelled by user.');
        } 
        // Yetersiz gas/funds
        else if (error.message?.includes('insufficient funds')) {
            if (!window.sdk) alert('❌ Insufficient ETH for gas fees!');
        }
        // Diğer hatalar
        else {
            const errorMsg = error.message || 'Unknown error';
            if (!window.sdk) alert('❌ Error: ' + errorMsg);
        }
        
        // Butonu tekrar etkinleştir
        btn.disabled = false;
        btn.textContent = '💾 Save to Leaderboard';
    }
}

// VIEW LEADERBOARD - Wallet gerektirmez
async function viewLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    const content = document.getElementById('leaderboard-content');
    
    modal.classList.remove('hidden');
    content.innerHTML = '⏳ Loading...';

    try {
        const response = await fetch(`${API_URL}/api/leaderboard?limit=20`);
        const data = await response.json();

        if (!data.success || data.leaderboard.length === 0) {
            content.innerHTML = '<p>Henüz skor yok. İlk sen ol! 🎯</p>';
            return;
        }

        let html = '';
        data.leaderboard.forEach((item) => {
            html += `
                <div class="leaderboard-item">
                    <span>${item.rank}. ${item.username}</span>
                    <span><strong>${item.score}</strong></span>
                </div>
            `;
        });

        content.innerHTML = html;

    } catch (error) {
        console.error('Leaderboard fetch error:', error);
        content.innerHTML = '<p>❌ Bağlantı hatası!</p>';
    }
}

function closeLeaderboard() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
}

// SHARE ON FARCASTER
function shareOnFarcaster() {
    const message = `🍉 I scored ${currentScore} points in Base Fruits! 🥇\n\nCan you beat me? 🍓🍉`;
    const gameUrl = 'https://base-fruits-farcaster-miniapp.vercel.app/';
    
    // Farcaster SDK ile paylaş
    if (window.sdk?.actions?.composeCast) {
        try {
            window.sdk.actions.composeCast({
                text: message,
                embeds: [gameUrl]
            });
            return;
        } catch (error) {
            console.log('composeCast failed:', error);
        }
    }
    
    // Fallback: Tarayıcıda aç
    const castText = encodeURIComponent(message);
    const embedUrl = encodeURIComponent(gameUrl);
    const farcasterUrl = `https://warpcast.com/~/compose?text=${castText}&embeds[]=${embedUrl}`;
    
    window.open(farcasterUrl, '_blank');
}

// ===== INITIALIZE GAME =====
window.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new FruitSliceGame();
        
        // Event listeners
        document.getElementById('close-leaderboard')?.addEventListener('click', closeLeaderboard);
        document.getElementById('view-leaderboard-button')?.addEventListener('click', viewLeaderboard);
        document.getElementById('share-score-button')?.addEventListener('click', shareOnFarcaster);
        
        // Modal dışına tıklayınca kapat
        document.getElementById('leaderboard-modal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('leaderboard-modal')) {
                closeLeaderboard();
            }
        });
        
    } catch (error) {
        console.error('❌ Game initialization error:', error);
    }
});