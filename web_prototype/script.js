document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    const inputView = document.getElementById('input-view');
    const feedbackView = document.getElementById('feedback-view');
    const historyView = document.getElementById('history-view');
    
    const journalInput = document.getElementById('journal-input');
    const submitBtn = document.getElementById('submit-btn');
    const backBtn = document.getElementById('back-btn');
    const historyBtn = document.getElementById('history-btn');
    
    const crisisLink = document.getElementById('crisis-link');
    
    // フィードバックテキスト領域
    const fbEmpathy = document.getElementById('fb-empathy');
    const fbFact = document.getElementById('fb-fact');
    const fbClosing = document.getElementById('fb-closing');
    
    // グラフ用コンテキスト
    const ctx = document.getElementById('waveChart').getContext('2d');
    let chartInstance = null;

    // --- 入力監視 (ボタンの有効無効、危機ワード検知) ---
    journalInput.addEventListener('input', () => {
        const text = journalInput.value.trim();
        submitBtn.disabled = text.length === 0;
        
        // 危機ワードの簡易検知（例）
        const crisisWords = ['死にたい', '消えたい', 'つらすぎる', 'もうむり'];
        const hasCrisis = crisisWords.some(word => text.includes(word));
        
        if(hasCrisis) {
            crisisLink.classList.remove('hidden');
        } else {
            crisisLink.classList.add('hidden');
        }
    });

    // --- ビュー切り替え関数 ---
    function switchView(targetView) {
        [inputView, feedbackView, historyView].forEach(view => {
            view.classList.remove('active');
            setTimeout(() => {
                if(!view.classList.contains('active')) {
                    view.classList.add('hidden');
                }
            }, 400); // CSSのトランジション時間と合わせる
        });
        
        targetView.classList.remove('hidden');
        // 少し遅延させてからactiveクラスを付与し、CSSアニメーションをトリガー
        setTimeout(() => {
            targetView.classList.add('active');
        }, 50);
    }

    // --- 送信処理 (プロトタイプ用のモックデータ) ---
    submitBtn.addEventListener('click', () => {
        const text = journalInput.value;
        
        // ローディング風のボタン表示変化
        submitBtn.textContent = '生成中...';
        submitBtn.disabled = true;
        
        // API通信のモック（1.5秒遅延）
        setTimeout(() => {
            // 解析結果のモック表示
            fbEmpathy.innerHTML = '<p>今日もなにもできなかった、と自分を責めてしまうほど、しんどい日ですね。</p>';
            fbFact.innerHTML = '<p>ただ、記録を見返すと、「今日はここまではできた」と書かれる日が先月より3日増えています。</p>';
            fbClosing.innerHTML = '<p>前より少しずつ、戻ってきていますよ。</p>';
            
            // アニメーションを再発火させるためのリセット処理
            [fbEmpathy, fbFact, fbClosing].forEach(el => {
                el.style.animation = 'none';
                el.offsetHeight; /* trigger reflow */
                el.style.animation = null; 
            });
            const dividers = document.querySelectorAll('.divider');
            dividers.forEach(el => {
                el.style.animation = 'none';
                el.offsetHeight; 
                el.style.animation = null;
            });
            
            switchView(feedbackView);
            
            // ボタンを元に戻す
            submitBtn.textContent = '預ける';
            submitBtn.disabled = false;
            journalInput.value = '';
            crisisLink.classList.add('hidden');
            
        }, 1500);
    });

    // --- 戻るボタン処理 ---
    backBtn.addEventListener('click', () => {
        switchView(inputView);
    });

    // --- 履歴・グラフ画面処理 ---
    historyBtn.addEventListener('click', () => {
        if(historyView.classList.contains('active')){
            switchView(inputView);
        } else {
            switchView(historyView);
            renderChart();
        }
    });

    // --- スプライン曲線（波）の描画 ---
    function renderChart() {
        if(chartInstance) {
            chartInstance.destroy(); // 再描画前に破棄
        }
        
        // 波のようなモックデータ（評価ではないことを強調するため、ラベル等を極力隠す）
        const data = [30, 45, 20, 50, 40, 60, 55, 70, 65, 80];
        const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '波のゆらぎ',
                    data: data,
                    borderColor: '#A3B1C6', // --accent-color相当
                    backgroundColor: 'rgba(163, 177, 198, 0.2)', // 波の下側をうっすら塗る
                    borderWidth: 3,
                    tension: 0.4, // スプライン曲線にするためのなめらかさ（0.4〜0.5程度）
                    pointRadius: 0, // 点を消す（成績っぽさを無くすため）
                    pointHoverRadius: 4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // 凡例を非表示
                    },
                    tooltip: {
                        enabled: false // ツールチップも非表示
                    }
                },
                scales: {
                    x: {
                        display: false, // X軸を隠す
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: false, // Y軸の数字を全て隠す（評価軸を与えないため）
                        min: 0,
                        max: 100,
                        grid: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1500, // ゆっくり描画されるアニメーション
                    easing: 'easeOutQuart'
                }
            }
        });
    }
});
