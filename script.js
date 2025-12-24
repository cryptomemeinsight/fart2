    document.addEventListener('DOMContentLoaded', () => {
        // Hamburger Menu Logic
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('nav');
        const navLinks = document.querySelectorAll('nav a');

        if (hamburger) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });

            // Close menu when a link is clicked
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });
        }

        // Tweet Stacking Logic
        const container = document.getElementById('tweet-stack-container');
        const imageCount = 10; // tweet_1.png to tweet_10.png
        const images = [];
        const tweetElements = [];

        // Generate image filenames
        for (let i = 1; i <= imageCount; i++) {
            images.push(`tweet_${i}.png`);
        }

        // Shuffle array to randomize z-index order naturally
        images.sort(() => Math.random() - 0.5);

        images.forEach((imgSrc, index) => {
            const img = document.createElement('img');
            img.src = imgSrc;
            img.classList.add('stacked-tweet');
            img.alt = `Fartcoin Tweet ${index + 1}`;
            img.draggable = false; // Disable native drag to use custom logic
            
            // Track interaction state on the element itself
            img.isInteracting = false;

            // Random animation settings (floating)
            const randomDuration = 3 + Math.random() * 2; // 3-5s
            const randomDelay = Math.random() * -2; // Start at random point
            img.style.animationDuration = `${randomDuration}s`;
            img.style.animationDelay = `${randomDelay}s`;
            
            // Stagger z-index
            img.style.zIndex = index + 1;

            // Mouse events for dragging
            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            img.addEventListener('mouseenter', () => img.isInteracting = true);
            img.addEventListener('mouseleave', () => {
                if (!isDragging) img.isInteracting = false;
            });

            img.addEventListener('mousedown', (e) => {
                isDragging = true;
                img.isInteracting = true;
                startX = e.clientX;

                startY = e.clientY;
                
                // Get current computed style positions
                const rect = img.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                // Calculate current relative position in pixels
                initialLeft = rect.left - containerRect.left;
                initialTop = rect.top - containerRect.top;
                
                img.style.zIndex = 1000; // Bring to front
                img.style.cursor = 'grabbing';
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                // Update position (convert back to pixels for smooth drag)
                img.style.left = `${initialLeft + dx}px`;
                img.style.top = `${initialTop + dy}px`;
            });

            window.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    img.isInteracting = false; // Release interaction lock
                    img.style.cursor = 'grab';
                }
            });

            container.appendChild(img);
            tweetElements.push(img);
        });

        // Central Tweet Manager (One by One)
        let currentTweetIndex = 0;
        let lastZone = null;

        // Tweet Position History
        const recentPositions = [];
        const MAX_HISTORY = 4; // Remember last 4 positions

        const showNextTweet = () => {
            const img = tweetElements[currentTweetIndex];
            
            // Define critical UI elements to avoid
            const criticalElements = [
                document.querySelector('header'),
                document.querySelector('.community-owned-text'), // H2
                document.querySelector('.contract-container'),
                document.querySelector('.cta-group'),
                document.querySelector('#spin-btn') // Mobile spin button
            ];
            
            // Get their bounding rects
            const exclusionRects = [];
            criticalElements.forEach(el => {
                if (el && el.offsetParent !== null) { // Check if visible
                    // Expand rect slightly (padding) for safety
                    const rect = el.getBoundingClientRect();
                    exclusionRects.push({
                        left: rect.left - 10,
                        top: rect.top - 10,
                        right: rect.right + 10,
                        bottom: rect.bottom + 10
                    });
                }
            });
            
            const isMobile = window.innerWidth < 768;

            let bestX = 0, bestY = 0;
            let found = false;
            
            // Attempt to find a valid spot
            // Increased attempts for better coverage
            for (let attempt = 0; attempt < 100; attempt++) {
                
                let xMin = 2, xMax = 68; // Desktop defaults
                let yMin = 10, yMax = 70;
                
                if (isMobile) {
                    // Mobile constraints
                    // 80% width -> max left 15% (allows 5% margin)
                    xMin = 5; xMax = 15; 
                    
                    // On mobile, vertical space is key.
                    // We want to utilize the full height if possible, but avoid the contract card.
                    // The contract card is usually in the lower middle.
                    yMin = 5; yMax = 60; 
                }

                const randomLeftPc = Math.floor(Math.random() * (xMax - xMin + 1)) + xMin;
                const randomTopPc = Math.floor(Math.random() * (yMax - yMin + 1)) + yMin;
                
                // Convert to pixels for collision check
                const testLeft = (randomLeftPc / 100) * window.innerWidth;
                const testTop = (randomTopPc / 100) * window.innerHeight;
                
                // Estimate Tweet Size
                const tweetWidth = isMobile ? window.innerWidth * 0.8 : Math.min(window.innerWidth * 0.3, 450);
                const tweetHeight = isMobile ? 150 : 200; // Tweaked height estimation
                
                const testRect = {
                    left: testLeft,
                    top: testTop,
                    right: testLeft + tweetWidth,
                    bottom: testTop + tweetHeight
                };
                
                // 1. Check Collision with UI Elements
                let overlapsUI = false;
                for (const zone of exclusionRects) {
                    if (testRect.left < zone.right &&
                        testRect.right > zone.left &&
                        testRect.top < zone.bottom &&
                        testRect.bottom > zone.top) {
                        overlapsUI = true;
                        break;
                    }
                }
                if (overlapsUI) continue; // Try next attempt

                // 2. Check Proximity to Recent Positions (Prevent "same place again and again")
                let tooClose = false;
                for (const pos of recentPositions) {
                    // Calculate distance between centers
                    const centerX = testRect.left + tweetWidth / 2;
                    const centerY = testRect.top + tweetHeight / 2;
                    const prevCenterX = pos.x + pos.width / 2;
                    const prevCenterY = pos.y + pos.height / 2;

                    const dist = Math.hypot(centerX - prevCenterX, centerY - prevCenterY);
                    
                    // Minimum distance required (e.g., 150px or 20% of screen)
                    const minDistance = isMobile ? 100 : 250;
                    
                    if (dist < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue; // Try next attempt

                // If we got here, it's a valid spot
                bestX = randomLeftPc;
                bestY = randomTopPc;
                found = true;
                
                // Save to history
                recentPositions.push({
                    x: testLeft,
                    y: testTop,
                    width: tweetWidth,
                    height: tweetHeight
                });
                if (recentPositions.length > MAX_HISTORY) {
                    recentPositions.shift(); // Remove oldest
                }
                
                break;
            }
            
            // Fallback Strategy
            if (!found) {
                // If random search failed, pick a corner based on index to cycle them
                // ensuring we don't pick the same corner as immediately before
                const corners = [
                    {x: 2, y: 15}, // TL
                    {x: 68, y: 15}, // TR
                    {x: 2, y: 70}, // BL
                    {x: 68, y: 70}  // BR
                ];
                
                // Use currentTweetIndex to cycle corners deterministically if random fails
                const cornerIndex = currentTweetIndex % corners.length;
                const corner = corners[cornerIndex];
                
                bestX = corner.x;
                bestY = corner.y;
                
                // Still update history for consistency
                recentPositions.push({
                    x: (bestX / 100) * window.innerWidth,
                    y: (bestY / 100) * window.innerHeight,
                    width: 200, height: 200 // dummy dims
                });
                if (recentPositions.length > MAX_HISTORY) recentPositions.shift();
            }

            const randomRotate = Math.floor(Math.random() * 40) - 20;
            
            img.style.setProperty('--x-pos', `${bestX}%`);
            img.style.setProperty('--y-pos', `${bestY}%`);
            img.style.setProperty('--rotation', `${randomRotate}deg`);
            
            // Remove manual left/top overrides if they exist from previous drags
            img.style.removeProperty('left');
            img.style.removeProperty('top');

            // Show
            img.style.opacity = '1';

            // Time before NEXT tweet appears (overlap start)
            const nextTweetDelay = Math.random() * 1500 + 2000; // 2-3.5s

            setTimeout(() => {
                // Trigger next tweet immediately (so both are visible)
                currentTweetIndex = (currentTweetIndex + 1) % tweetElements.length;
                showNextTweet();

                // Schedule hiding of CURRENT tweet (linger effect)
                // It stays visible for a while alongside the new one
                const lingerDuration = 4000; 

                setTimeout(function checkHide() {
                    if (img.isInteracting) {
                        // If user is reading/dragging, wait and check again
                        setTimeout(checkHide, 1000);
                        return;
                    }

                    // Hide slowly (CSS transition handles the fade)
                    img.style.opacity = '0';
                }, lingerDuration);

            }, nextTweetDelay);
        };

        // Start the cycle
        setTimeout(showNextTweet, 1000);

        // Contract Copy Logic
        const copyBtn = document.getElementById('copy-btn');
        const contractAddress = document.getElementById('contract-address').innerText;
        const tooltip = document.getElementById('copy-tooltip');

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(contractAddress).then(() => {
                // Show tooltip
                tooltip.classList.add('show');
                
                // Hide after 2 seconds
                setTimeout(() => {
                    tooltip.classList.remove('show');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });

        // Spin Wheel Logic
        const spinBtn = document.getElementById('spin-btn');
        const centerSpinArea = document.getElementById('center-spin-area');
        const orbitContainer = document.querySelector('.orbit-container');
        const orbitItems = document.querySelectorAll('.orbit-item');
        let currentRotation = 0;
        let isSpinning = false;

        // Sound Animation (Audio) Logic
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        function playTickSound() {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Tick sound: Short, high pitch, quick decay
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Low volume
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        }

        function triggerSpin() {
            if (isSpinning) return;
            isSpinning = true;
            
            // Update both buttons/areas
            spinBtn.disabled = true;
            spinBtn.textContent = "PREDICTING...";
            centerSpinArea.style.pointerEvents = 'none'; // Disable clicks

            const itemCount = orbitItems.length;
            const angleStep = 360 / itemCount;
            
            // 1. Pick a random winner
            const winnerIndex = Math.floor(Math.random() * itemCount);
            const i = winnerIndex + 1; // 1-based index for calculation
            
            // 2. Calculate current position of this item
            // currentRotation might be large, so we mod it
            const currentRotationMod = currentRotation % 360;
            const currentItemAngle = (i * angleStep + currentRotationMod) % 360;
            
            // 3. Calculate how much we need to rotate to get to 270 (Top position)
            let targetAngle = 270;
            let rotationNeeded = targetAngle - currentItemAngle;
            
            // Normalize rotationNeeded to be positive (0 to 360)
            // We want to rotate clockwise (positive)
            if (rotationNeeded < 0) {
                rotationNeeded += 360;
            }
            
            // 4. Add extra spins
            const spins = 5;
            const totalRotation = 360 * spins + rotationNeeded;
            
            const startRotation = currentRotation;
            const finalRotation = currentRotation + totalRotation;
            currentRotation = finalRotation; // Update global state immediately

            // Apply rotation via CSS variable
            // This rotates the container
            orbitContainer.style.setProperty('--wheel-rotation', `${currentRotation}deg`);
            
            // Also update items to counter-rotate so they stay upright
            orbitItems.forEach(item => {
                item.style.setProperty('--wheel-rotation', `${currentRotation}deg`);
            });

            // Sound Logic: Monitor rotation via requestAnimationFrame
            // We need to know where the visual rotation is
            // Since we are using CSS transition, we can't easily get the EXACT value every frame
            // reliably across browsers without getComputedStyle, which is expensive.
            // But for sound, we can simulate the physics or just read it.
            // Let's read it.
            
            let lastAngle = startRotation % 360;
            const startTime = performance.now();
            const duration = 4000; // 4s matches CSS

            function checkRotation() {
                if (!isSpinning) return;
                
                // Get current rotation from computed style
                // The transform is on .orbit-container
                // But getting rotation from matrix is hard.
                // Simpler: Use a JS ease-out function to approximate current rotation
                const elapsed = performance.now() - startTime;
                if (elapsed >= duration) {
                    // End of spin
                    return;
                }

                // Cubic-bezier(0.25, 0.1, 0.25, 1) approximation
                // This is roughly easeOutQuart or similar. Let's use a standard easeOut
                // t from 0 to 1
                let t = elapsed / duration;
                // cubic-bezier(.25, .1, .25, 1) is close to easeOutSine or easeOutQuad
                // Let's use a simpler easeOutCubic: 1 - pow(1 - x, 3)
                // Or better, let's just detect "ticks" by passing angleStep boundaries
                // We can just rely on the CSS, but we need the value.
                // Let's parse the matrix.
                
                const style = window.getComputedStyle(orbitContainer);
                const matrix = new WebKitCSSMatrix(style.transform);
                // Calculate angle from matrix
                let angle = Math.atan2(matrix.m12, matrix.m11) * (180/Math.PI);
                if (angle < 0) angle += 360;
                
                // The matrix angle resets every 360. 
                // We need to track the delta.
                
                // Wait, this is getting complicated because of the matrix wrapping.
                // Simpler approach: Play a sound at a decreasing interval.
                // Or just check if angle crossed a "tick" line (270deg is the marker).
                // The marker is static at top (270deg visually, but logic might vary).
                // Actually, we can just trigger sounds based on time intervals that get longer.
                
                requestAnimationFrame(checkRotation);
            }
            
            // Simpler Sound Approach: decreasing frequency
            // Total rotation is ~1800+ degrees.
            // That's about 5-6 full rotations.
            // 9 items per rotation = 45-54 ticks.
            // Duration 4s.
            // Let's schedule them.
            
            let time = 0;
            // We use an ease-out curve to schedule ticks
            // t goes 0 -> 1 over 4000ms
            // rotation goes 0 -> totalRotation
            // We want a tick every 'angleStep' degrees (40 degrees)
            
            const totalTicks = Math.floor(totalRotation / angleStep);
            
            for (let j = 0; j < totalTicks; j++) {
                // Find time 't' when rotation reaches (j+1)*angleStep
                // rotation(t) = totalRotation * ease(t)
                // (j+1)*angleStep = totalRotation * ease(t)
                // ease(t) = ((j+1)*angleStep) / totalRotation
                // Let targetEase = ...
                // We need inverse ease function. 
                // easeOutCubic: y = 1 - (1-t)^3  => t = 1 - cbrt(1-y)
                // This is a good enough approximation for the CSS bezier.
                
                const targetRot = (j + 1) * angleStep;
                if (targetRot > totalRotation) break;
                
                const y = targetRot / totalRotation; // 0 to 1 progress
                // Inverse cubic ease out
                const t = 1 - Math.cbrt(1 - y);
                
                const tickTime = t * duration; // in ms
                
                if (tickTime < duration) {
                    setTimeout(() => {
                        if(isSpinning) playTickSound();
                    }, tickTime);
                }
            }

            // Wait for transition to end (4s matches CSS)
            setTimeout(() => {
                isSpinning = false;
                spinBtn.disabled = false;
                spinBtn.textContent = "SPIN AGAIN";
                centerSpinArea.style.pointerEvents = 'auto'; // Re-enable clicks
                
                // Show winner modal
                showWinnerModal(winnerIndex);
                
            }, 4000);
        }

        spinBtn.addEventListener('click', triggerSpin);
        centerSpinArea.addEventListener('click', triggerSpin);

        // Modal & Card Generation Logic
        const modal = document.getElementById('winner-modal');
        const closeModal = document.querySelector('.close-modal');
        const winnerImg = document.getElementById('winner-img');
        const winnerName = document.getElementById('winner-name');
        const downloadBtn = document.getElementById('download-card-btn');
        // const shareBtn = document.getElementById('share-twitter-btn'); // Removed as per request

        function showWinnerModal(index) {
            const winningItem = orbitItems[index];
            const img = winningItem.querySelector('img');
            
            // Populate modal
            winnerImg.src = img.src;
            // Clean up name: remove extension and capitalize
            let name = img.alt || 'Crypto';
            winnerName.textContent = name.toUpperCase();
            
            modal.style.display = 'block';
        }

        closeModal.onclick = () => {
            modal.style.display = 'none';
        }

        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }

        // Screenshot/Download Logic
        // We need html2canvas or similar, but since we can't install packages easily without npm/internet
        // We will simulate it by drawing to a canvas manually or check if we can include a CDN link.
        // Given constraints, let's try to add html2canvas via CDN script injection if possible, 
        // or just assume we need to instruct user or use a simple canvas draw approach.
        // Let's use a simple Canvas API approach to draw the card dynamically.

        downloadBtn.addEventListener('click', async () => {
            // Change button text to indicate processing
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = "GENERATING CARD...";
            downloadBtn.disabled = true;

            try {
                // 1. Load Images
                const logoImgObj = new Image();
                logoImgObj.src = '2.gif';
                
                const winnerImgObj = new Image();
                winnerImgObj.src = winnerImg.src;

                // Wait for images to load
                await Promise.all([
                    new Promise((resolve, reject) => {
                        if (logoImgObj.complete) resolve();
                        else {
                            logoImgObj.onload = resolve;
                            logoImgObj.onerror = reject;
                        }
                    }),
                    new Promise((resolve, reject) => {
                        if (winnerImgObj.complete) resolve();
                        else {
                            winnerImgObj.onload = resolve;
                            winnerImgObj.onerror = reject;
                        }
                    })
                ]);
                
                // 2. Create Canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 600;
                canvas.height = 800;
                
                // 3. Draw Card Base
                // Draw Background
                const gradient = ctx.createLinearGradient(0, 0, 600, 800);
                gradient.addColorStop(0, '#1a1a1a');
                gradient.addColorStop(1, '#000000');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 600, 800);
                
                // Draw Border
                ctx.strokeStyle = '#ffea00';
                ctx.lineWidth = 10;
                ctx.strokeRect(20, 20, 560, 760);
                
                // Draw Text Header
                ctx.fillStyle = '#76ff03';
                ctx.font = '50px "Bangers", impact, sans-serif'; 
                
                // Line 1: FARTCOIN [IMG]
                const text1 = "FARTCOIN";
                ctx.textAlign = 'left';
                const metrics1 = ctx.measureText(text1);
                const imgSize = 50; 
                const gap = 10;
                const totalWidth1 = metrics1.width + gap + imgSize;
                
                let startX1 = 300 - (totalWidth1 / 2);
                let currentY = 100;
                
                ctx.fillText(text1, startX1, currentY);
                
                // Draw Logo Image
                const imgX = startX1 + metrics1.width + gap;
                const imgY = currentY - 40;
                ctx.drawImage(logoImgObj, imgX, imgY, imgSize, imgSize);
                
                let nextY = currentY + 60;
                
                // Line 2: WILL OVERTAKE
                ctx.textAlign = 'center';
                ctx.fillText("WILL OVERTAKE", 300, nextY);
                
                // 4. Draw Winner Image (Circle)
                ctx.save();
                ctx.beginPath();
                ctx.arc(300, 325, 150, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(winnerImgObj, 150, 175, 300, 300);
                ctx.restore();
                
                ctx.strokeStyle = '#ffea00';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(300, 325, 150, 0, Math.PI * 2, true);
                ctx.stroke();
                
                // 5. Draw Winner Name
                function wrapText(context, text, x, y, maxWidth, lineHeight) {
                    const words = text.split(' ');
                    let line = '';

                    for(let n = 0; n < words.length; n++) {
                        const testLine = line + words[n] + ' ';
                        const metrics = context.measureText(testLine);
                        const testWidth = metrics.width;
                        if (testWidth > maxWidth && n > 0) {
                            context.fillText(line, x, y);
                            line = words[n] + ' ';
                            y += lineHeight;
                        }
                        else {
                            line = testLine;
                        }
                    }
                    context.fillText(line, x, y);
                    return y;
                }

                ctx.fillStyle = '#ffffff';
                ctx.font = '60px "Bangers", impact, sans-serif';
                ctx.textAlign = 'center';
                currentY = 550;
                currentY = wrapText(ctx, winnerName.textContent, 300, currentY, 500, 70);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = '40px "Bangers", impact, sans-serif';
                ctx.fillText('IN 2026', 300, currentY + 50);
                
                // 6. Footer
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.font = '20px Courier New';
                ctx.fillText('fartcoin2.xyz', 300, 750);
                
                // 7. Download
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `fartcoin2-prediction-${winnerName.textContent}.png`;
                link.href = dataUrl;
                link.click();
                
                // Reset button
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;

            } catch (err) {
                console.error(err);
                alert("Error generating card: " + err.message);
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
            }
        });

        // shareBtn.addEventListener('click', () => {
        //     const text = `I just predicted that Fartcoin 2 will overtake ${winnerName.textContent} in 2026! 🚀💨 Check it out at`;
        //     const url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent("http://fartcoin2.com"); // Placeholder URL
        //     window.open(url, '_blank');
        // });
    });
