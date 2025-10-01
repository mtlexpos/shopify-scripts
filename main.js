(function() {
  'use strict';

  /**
   * Game constants
   */
  const CANVAS = document.getElementById('game-canvas');
  const CTX = CANVAS.getContext('2d');
  const OVERLAY = document.getElementById('overlay');
  const SCORE_EL = document.getElementById('score');
  const WIDTH = CANVAS.width;
  const HEIGHT = CANVAS.height;

  // Bird
  const BIRD_RADIUS = 18;
  const GRAVITY = 1200; // px/s^2
  const FLAP_VELOCITY = -360; // px/s upward
  const MAX_FALL_SPEED = 800; // clamp

  // Pipes
  const PIPE_WIDTH = 80;
  const PIPE_GAP_MIN = 140;
  const PIPE_GAP_MAX = 220;
  const PIPE_INTERVAL = 1500; // ms between spawns
  const PIPE_SPEED = 180; // px/s leftwards

  // Ground boundaries
  const FLOOR_Y = HEIGHT - 40; // visual floor
  const CEIL_Y = 0;

  // Input state
  const input = {
    flap: false,
    upPressed: false,
    spacePressed: false,
  };

  // Game state
  let lastTime = 0;
  let spawnTimer = 0;
  let score = 0;
  let gameOver = false;
  let started = false;

  const bird = {
    x: WIDTH * 0.3,
    y: HEIGHT * 0.45,
    vy: 0,
  };

  /**
   * Pipes are stored as objects: { x, topHeight, gapSize }
   */
  const pipes = [];

  function resetGame() {
    pipes.length = 0;
    bird.x = WIDTH * 0.3;
    bird.y = HEIGHT * 0.45;
    bird.vy = 0;
    lastTime = 0;
    spawnTimer = 0;
    score = 0;
    gameOver = false;
    started = false;
    updateScore(0);
    OVERLAY.innerHTML = '';
  }

  function updateScore(value) {
    SCORE_EL.textContent = String(value);
  }

  function rnd(min, max) {
    return Math.random() * (max - min) + min;
  }

  function spawnPipe() {
    const gapSize = rnd(PIPE_GAP_MIN, PIPE_GAP_MAX);
    const minTop = 40;
    const maxTop = FLOOR_Y - gapSize - 60;
    const topHeight = rnd(minTop, Math.max(minTop, maxTop));
    pipes.push({
      x: WIDTH + PIPE_WIDTH,
      topHeight,
      gapSize,
      passed: false,
    });
  }

  function handleInputDown(e) {
    if (e.code === 'Space') {
      input.spacePressed = true;
      e.preventDefault();
    } else if (e.code === 'ArrowUp') {
      input.upPressed = true;
    } else if (e.code === 'KeyR') {
      resetGame();
      return;
    }
    input.flap = true;
  }

  function handleInputUp(e) {
    if (e.code === 'Space') {
      input.spacePressed = false;
    } else if (e.code === 'ArrowUp') {
      input.upPressed = false;
    }
  }

  window.addEventListener('keydown', handleInputDown, { passive: false });
  window.addEventListener('keyup', handleInputUp);

  function update(dt) {
    if (gameOver) return;

    if (!started) {
      if (input.flap) {
        started = true;
        bird.vy = FLAP_VELOCITY;
      }
      input.flap = false;
      return;
    }

    // Physics
    bird.vy += GRAVITY * dt;
    if (bird.vy > MAX_FALL_SPEED) bird.vy = MAX_FALL_SPEED;
    if (input.flap) {
      bird.vy = FLAP_VELOCITY;
    }
    input.flap = false;

    bird.y += bird.vy * dt;

    // Boundaries
    if (bird.y + BIRD_RADIUS >= FLOOR_Y) {
      bird.y = FLOOR_Y - BIRD_RADIUS;
      endGame();
    }
    if (bird.y - BIRD_RADIUS <= CEIL_Y) {
      bird.y = CEIL_Y + BIRD_RADIUS;
      bird.vy = 0;
    }

    // Pipes
    spawnTimer += dt * 1000;
    if (spawnTimer >= PIPE_INTERVAL) {
      spawnTimer = 0;
      spawnPipe();
    }
    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= PIPE_SPEED * dt;
      if (!p.passed && p.x + PIPE_WIDTH < bird.x - BIRD_RADIUS) {
        p.passed = true;
        score += 1;
        updateScore(score);
      }
      if (p.x + PIPE_WIDTH < -10) {
        pipes.splice(i, 1);
      }
    }

    // Collisions
    checkCollisions();
  }

  function checkCollisions() {
    const birdLeft = bird.x - BIRD_RADIUS;
    const birdRight = bird.x + BIRD_RADIUS;
    const birdTop = bird.y - BIRD_RADIUS;
    const birdBottom = bird.y + BIRD_RADIUS;

    for (let i = 0; i < pipes.length; i++) {
      const p = pipes[i];
      const pipeLeft = p.x;
      const pipeRight = p.x + PIPE_WIDTH;
      const gapTop = p.topHeight;
      const gapBottom = p.topHeight + p.gapSize;

      const withinPipeX = birdRight > pipeLeft && birdLeft < pipeRight;
      const hitTop = withinPipeX && birdTop < gapTop;
      const hitBottom = withinPipeX && birdBottom > gapBottom;
      if (hitTop || hitBottom) {
        endGame();
        return;
      }
    }
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    showOverlayMessage("just like ike's");
  }

  function showOverlayMessage(text) {
    OVERLAY.innerHTML = '';
    OVERLAY.style.background = 'var(--overlay)';
    const div = document.createElement('div');
    div.className = 'message';
    div.textContent = text;
    OVERLAY.appendChild(div);
  }

  function draw() {
    // Sky background
    CTX.clearRect(0, 0, WIDTH, HEIGHT);

    // Draw ground
    drawGround();

    // Pipes
    pipes.forEach(p => drawPipe(p));

    // Bird
    drawBird();

    // If not started, show hint
    if (!started && !gameOver) {
      CTX.save();
      CTX.font = '700 24px "Comic Neue"';
      CTX.fillStyle = 'white';
      CTX.textAlign = 'center';
      CTX.fillText('Press Space or Up to start!', WIDTH / 2, HEIGHT * 0.4);
      CTX.restore();
    }
  }

  function drawBird() {
    const x = bird.x;
    const y = bird.y;

    // Body
    CTX.save();
    CTX.translate(x, y);
    CTX.rotate(Math.max(-0.3, Math.min(0.5, bird.vy / 600)));

    // bird body
    CTX.fillStyle = '#ffd166';
    CTX.beginPath();
    CTX.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    CTX.fill();

    // wing
    CTX.fillStyle = '#fca311';
    const wingYOffset = Math.sin(performance.now() / 120) * 6;
    CTX.beginPath();
    CTX.ellipse(-6, wingYOffset, 8, 12, 0, 0, Math.PI * 2);
    CTX.fill();

    // eye
    CTX.fillStyle = '#fff';
    CTX.beginPath();
    CTX.arc(6, -6, 6, 0, Math.PI * 2);
    CTX.fill();
    CTX.fillStyle = '#000';
    CTX.beginPath();
    CTX.arc(8, -6, 2.5, 0, Math.PI * 2);
    CTX.fill();

    // beak
    CTX.fillStyle = '#ff6b6b';
    CTX.beginPath();
    CTX.moveTo(BIRD_RADIUS - 2, -2);
    CTX.lineTo(BIRD_RADIUS + 12, 0);
    CTX.lineTo(BIRD_RADIUS - 2, 2);
    CTX.closePath();
    CTX.fill();

    CTX.restore();
  }

  function drawPipe(p) {
    const x = Math.floor(p.x);
    const topHeight = Math.floor(p.topHeight);
    const gapSize = Math.floor(p.gapSize);
    const bottomY = topHeight + gapSize;

    CTX.save();
    // Top pipe
    CTX.fillStyle = '#4ec04e';
    CTX.fillRect(x, 0, PIPE_WIDTH, topHeight);
    CTX.fillStyle = '#2f8a2f';
    CTX.fillRect(x, topHeight - 16, PIPE_WIDTH, 16);

    // Bottom pipe
    const bottomHeight = FLOOR_Y - bottomY;
    CTX.fillStyle = '#4ec04e';
    CTX.fillRect(x, bottomY, PIPE_WIDTH, bottomHeight);
    CTX.fillStyle = '#2f8a2f';
    CTX.fillRect(x, bottomY, PIPE_WIDTH, 16);
    CTX.restore();
  }

  function drawGround() {
    // A simple ground strip
    CTX.save();
    CTX.fillStyle = '#8d99ae';
    CTX.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
    CTX.restore();
  }

  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min(0.033, (ts - lastTime) / 1000);
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Kickoff
  resetGame();
  requestAnimationFrame(loop);
})();

