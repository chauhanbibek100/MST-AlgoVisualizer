// ==============================
// MST Visualizer — Kruskal's & Prim's
// Canvas-based interactive graph editor
// ==============================

(function () {
  'use strict';

  // --- DOM References ---
  const canvas = document.getElementById('mst-canvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('canvas-wrapper');

  const algoSelect = document.getElementById('algo-select');
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');
  const btnRun = document.getElementById('btn-run');
  const btnStep = document.getElementById('btn-step');
  const btnPause = document.getElementById('btn-pause');
  const btnRandom = document.getElementById('btn-random');
  const btnClear = document.getElementById('btn-clear');
  const randomNodesInput = document.getElementById('random-nodes');

  const infoNodes = document.getElementById('info-nodes');
  const infoEdges = document.getElementById('info-edges');
  const infoMstEdges = document.getElementById('info-mst-edges');
  const infoMstWeight = document.getElementById('info-mst-weight');
  const infoStep = document.getElementById('info-step');
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const toast = document.getElementById('toast');

  // --- State ---
  let nodes = [];
  let edges = [];
  let selectedNode = null;
  let hoveredNode = null;
  let draggingNode = null;
  let isDragging = false;

  // Algorithm state
  let mstEdges = [];
  let consideredEdge = null;
  let rejectedEdges = [];
  let algorithmSteps = [];
  let currentStepIndex = -1;
  let isRunning = false;
  let isPaused = false;
  let animationTimer = null;

  const NODE_RADIUS = 20;
  const COLORS = {
    nodeFill: '#1e1e3f',
    nodeStroke: '#6c63ff',
    nodeGlow: 'rgba(108, 99, 255, 0.5)',
    nodeHover: '#8b7dff',
    nodeSelected: '#00d4ff',
    nodeSelectedGlow: 'rgba(0, 212, 255, 0.5)',
    nodeText: '#e8e8f0',
    edge: 'rgba(144, 144, 176, 0.4)',
    edgeWeight: '#9090b0',
    mstEdge: '#00ff88',
    mstEdgeGlow: 'rgba(0, 255, 136, 0.4)',
    considered: '#ffa502',
    consideredGlow: 'rgba(255, 165, 2, 0.4)',
    rejected: 'rgba(255, 71, 87, 0.3)',
    canvasBg: '#0e0e22',
    gridLine: 'rgba(255, 255, 255, 0.02)'
  };

  // --- Canvas Setup ---
  function resizeCanvas() {
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 560 * window.devicePixelRatio;
    canvas.style.height = '560px';
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    draw();
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // --- Drawing ---
  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    // Background
    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, w, h);

    // Grid dots
    ctx.fillStyle = COLORS.gridLine;
    for (let x = 40; x < w; x += 40) {
      for (let y = 40; y < h; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw edges
    edges.forEach((e, i) => {
      const isMst = mstEdges.includes(i);
      const isConsidered = consideredEdge === i;
      const isRejected = rejectedEdges.includes(i);

      drawEdge(e, isMst, isConsidered, isRejected);
    });

    // Draw nodes
    nodes.forEach((node, i) => {
      const isSelected = selectedNode === i;
      const isHovered = hoveredNode === i;
      drawNode(node, i, isSelected, isHovered);
    });

    // Draw edge creation line
    if (selectedNode !== null && !isDragging) {
      const sn = nodes[selectedNode];
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sn.x, sn.y);
      if (hoveredNode !== null && hoveredNode !== selectedNode) {
        const hn = nodes[hoveredNode];
        ctx.lineTo(hn.x, hn.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawNode(node, index, isSelected, isHovered) {
    const x = node.x;
    const y = node.y;

    // Glow
    if (isSelected || isHovered) {
      ctx.shadowColor = isSelected ? COLORS.nodeSelectedGlow : COLORS.nodeGlow;
      ctx.shadowBlur = 25;
    }

    // Circle
    ctx.beginPath();
    ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.nodeFill;
    ctx.fill();
    ctx.strokeStyle = isSelected ? COLORS.nodeSelected : isHovered ? COLORS.nodeHover : COLORS.nodeStroke;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = COLORS.nodeText;
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index, x, y);
  }

  function drawEdge(edge, isMst, isConsidered, isRejected) {
    const a = nodes[edge.from];
    const b = nodes[edge.to];

    if (!a || !b) return;

    let color = COLORS.edge;
    let width = 2;
    let glowColor = null;

    if (isMst) {
      color = COLORS.mstEdge;
      width = 3.5;
      glowColor = COLORS.mstEdgeGlow;
    } else if (isConsidered) {
      color = COLORS.considered;
      width = 3;
      glowColor = COLORS.consideredGlow;
    } else if (isRejected) {
      color = COLORS.rejected;
      width = 1.5;
    }

    if (glowColor) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
    }

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Weight label
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;

    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const offsetX = Math.sin(angle) * 14;
    const offsetY = -Math.cos(angle) * 14;

    ctx.fillStyle = isMst ? COLORS.mstEdge : isConsidered ? COLORS.considered : COLORS.edgeWeight;
    ctx.font = `600 12px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Background pill for weight
    const text = String(edge.weight);
    const tw = ctx.measureText(text).width + 10;
    ctx.fillStyle = COLORS.canvasBg;
    ctx.beginPath();
    roundRect(ctx, mx + offsetX - tw / 2, my + offsetY - 10, tw, 20, 6);
    ctx.fill();

    ctx.fillStyle = isMst ? COLORS.mstEdge : isConsidered ? COLORS.considered : COLORS.edgeWeight;
    ctx.fillText(text, mx + offsetX, my + offsetY);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  // --- Interaction ---
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function findNodeAt(x, y) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const dx = nodes[i].x - x;
      const dy = nodes[i].y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS + 5) return i;
    }
    return -1;
  }

  function edgeExists(from, to) {
    return edges.some(e =>
      (e.from === from && e.to === to) || (e.from === to && e.to === from)
    );
  }

  canvas.addEventListener('mousedown', (e) => {
    if (isRunning) return;
    const pos = getCanvasPos(e);
    const nodeIdx = findNodeAt(pos.x, pos.y);

    if (nodeIdx >= 0) {
      if (selectedNode === null) {
        // Start selecting or drag
        draggingNode = nodeIdx;
        isDragging = false;
        selectedNode = nodeIdx;
      } else if (selectedNode === nodeIdx) {
        // Deselect
        selectedNode = null;
      } else {
        // Create edge
        if (!edgeExists(selectedNode, nodeIdx)) {
          const a = nodes[selectedNode];
          const b = nodes[nodeIdx];
          const dist = Math.round(Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) / 20);
          const weight = Math.max(1, dist);
          edges.push({ from: selectedNode, to: nodeIdx, weight });
          updateInfo();
        }
        selectedNode = null;
      }
    } else {
      // Add new node
      if (selectedNode === null) {
        nodes.push({ x: pos.x, y: pos.y });
        updateInfo();
        showToast(`Node ${nodes.length - 1} added`);
      } else {
        selectedNode = null;
      }
    }
    draw();
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(e);
    hoveredNode = findNodeAt(pos.x, pos.y);

    if (draggingNode !== null && !isRunning) {
      isDragging = true;
      nodes[draggingNode].x = pos.x;
      nodes[draggingNode].y = pos.y;
    }

    canvas.style.cursor = hoveredNode >= 0 ? 'pointer' : 'crosshair';
    draw();
  });

  canvas.addEventListener('mouseup', () => {
    if (isDragging) {
      selectedNode = null;
    }
    draggingNode = null;
    isDragging = false;
    draw();
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredNode = null;
    draw();
  });

  // --- Info Updates ---
  function updateInfo() {
    infoNodes.textContent = nodes.length;
    infoEdges.textContent = edges.length;
    infoMstEdges.textContent = mstEdges.length;

    let totalWeight = 0;
    mstEdges.forEach(i => { totalWeight += edges[i].weight; });
    infoMstWeight.textContent = totalWeight;
  }

  // --- Toast ---
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // --- Status ---
  function setStatus(state, text) {
    statusBadge.className = 'status-badge ' + state;
    statusText.textContent = text;
  }

  // ============================
  // ALGORITHMS
  // ============================

  // --- Union-Find for Kruskal's ---
  class UnionFind {
    constructor(n) {
      this.parent = Array.from({ length: n }, (_, i) => i);
      this.rank = new Array(n).fill(0);
    }
    find(x) {
      if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
      return this.parent[x];
    }
    union(a, b) {
      const ra = this.find(a), rb = this.find(b);
      if (ra === rb) return false;
      if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
      else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
      else { this.parent[rb] = ra; this.rank[ra]++; }
      return true;
    }
  }

  function buildKruskalSteps() {
    const steps = [];
    const sortedEdges = edges.map((e, i) => ({ ...e, idx: i }))
      .sort((a, b) => a.weight - b.weight);

    const uf = new UnionFind(nodes.length);
    let mstCount = 0;

    for (const edge of sortedEdges) {
      steps.push({ type: 'consider', edgeIdx: edge.idx, desc: `Consider edge ${edge.from}—${edge.to} (w=${edge.weight})` });

      if (uf.union(edge.from, edge.to)) {
        steps.push({ type: 'accept', edgeIdx: edge.idx, desc: `✓ Accept edge ${edge.from}—${edge.to}` });
        mstCount++;
        if (mstCount === nodes.length - 1) break;
      } else {
        steps.push({ type: 'reject', edgeIdx: edge.idx, desc: `✗ Reject edge ${edge.from}—${edge.to} (cycle)` });
      }
    }

    steps.push({ type: 'done', desc: 'MST complete!' });
    return steps;
  }

  // --- Prim's ---
  function buildPrimSteps() {
    const steps = [];
    if (nodes.length === 0) return [{ type: 'done', desc: 'No nodes' }];

    const inMST = new Set();
    inMST.add(0);
    steps.push({ type: 'info', desc: `Start from node 0` });

    const adj = Array.from({ length: nodes.length }, () => []);
    edges.forEach((e, i) => {
      adj[e.from].push({ to: e.to, weight: e.weight, idx: i });
      adj[e.to].push({ to: e.from, weight: e.weight, idx: i });
    });

    while (inMST.size < nodes.length) {
      let bestEdge = null;
      let bestWeight = Infinity;

      // Find minimum weight edge crossing the cut
      for (const u of inMST) {
        for (const edge of adj[u]) {
          if (!inMST.has(edge.to) && edge.weight < bestWeight) {
            bestWeight = edge.weight;
            bestEdge = edge;
          }
        }
      }

      if (!bestEdge) break; // Disconnected graph

      steps.push({ type: 'consider', edgeIdx: bestEdge.idx, desc: `Consider cheapest crossing edge (w=${bestEdge.weight})` });
      steps.push({ type: 'accept', edgeIdx: bestEdge.idx, desc: `✓ Add node ${bestEdge.to} via edge (w=${bestEdge.weight})` });
      inMST.add(bestEdge.to);
    }

    steps.push({ type: 'done', desc: 'MST complete!' });
    return steps;
  }

  // --- Execute Steps ---
  function resetAlgorithm() {
    mstEdges = [];
    consideredEdge = null;
    rejectedEdges = [];
    algorithmSteps = [];
    currentStepIndex = -1;
    isRunning = false;
    isPaused = false;
    clearInterval(animationTimer);
    animationTimer = null;
    setStatus('idle', 'Idle');
    updateInfo();
    draw();
  }

  function prepareAlgorithm() {
    if (nodes.length < 2 || edges.length < 1) {
      showToast('Add at least 2 nodes and 1 edge');
      return false;
    }
    resetAlgorithm();
    const algo = algoSelect.value;
    algorithmSteps = algo === 'kruskal' ? buildKruskalSteps() : buildPrimSteps();
    return true;
  }

  function executeStep() {
    currentStepIndex++;
    if (currentStepIndex >= algorithmSteps.length) {
      isRunning = false;
      clearInterval(animationTimer);
      animationTimer = null;
      setStatus('done', 'Complete');
      infoStep.textContent = 'Done';
      return;
    }

    const step = algorithmSteps[currentStepIndex];
    infoStep.textContent = step.desc;

    switch (step.type) {
      case 'consider':
        consideredEdge = step.edgeIdx;
        break;
      case 'accept':
        mstEdges.push(step.edgeIdx);
        consideredEdge = null;
        break;
      case 'reject':
        rejectedEdges.push(step.edgeIdx);
        consideredEdge = null;
        break;
      case 'done':
        consideredEdge = null;
        isRunning = false;
        clearInterval(animationTimer);
        animationTimer = null;
        setStatus('done', 'Complete');
        break;
      case 'info':
        break;
    }

    updateInfo();
    draw();
  }

  function getDelay() {
    const speed = parseInt(speedSlider.value);
    return Math.max(80, 1200 - speed * 110);
  }

  // --- Buttons ---
  btnRun.addEventListener('click', () => {
    if (isRunning && !isPaused) return;

    if (isPaused) {
      isPaused = false;
      setStatus('running', 'Running...');
      animationTimer = setInterval(executeStep, getDelay());
      return;
    }

    if (!prepareAlgorithm()) return;
    isRunning = true;
    setStatus('running', 'Running...');
    animationTimer = setInterval(executeStep, getDelay());
  });

  btnStep.addEventListener('click', () => {
    if (isRunning && !isPaused) {
      isPaused = true;
      clearInterval(animationTimer);
      animationTimer = null;
      setStatus('idle', 'Paused');
    }

    if (currentStepIndex === -1) {
      if (!prepareAlgorithm()) return;
      isRunning = true;
      isPaused = true;
      setStatus('idle', 'Stepping');
    }

    executeStep();
  });

  btnPause.addEventListener('click', () => {
    if (!isRunning) return;
    if (isPaused) {
      isPaused = false;
      setStatus('running', 'Running...');
      animationTimer = setInterval(executeStep, getDelay());
    } else {
      isPaused = true;
      clearInterval(animationTimer);
      animationTimer = null;
      setStatus('idle', 'Paused');
    }
  });

  btnClear.addEventListener('click', () => {
    nodes = [];
    edges = [];
    selectedNode = null;
    hoveredNode = null;
    resetAlgorithm();
    infoStep.textContent = '—';
    showToast('Canvas cleared');
  });

  btnRandom.addEventListener('click', () => {
    const count = parseInt(randomNodesInput.value) || 8;
    generateRandomGraph(count);
    showToast(`Generated graph with ${count} nodes`);
  });

  speedSlider.addEventListener('input', () => {
    speedValue.textContent = speedSlider.value + 'x';
    if (isRunning && !isPaused) {
      clearInterval(animationTimer);
      animationTimer = setInterval(executeStep, getDelay());
    }
  });

  // --- Random Graph Generator ---
  function generateRandomGraph(n) {
    resetAlgorithm();
    nodes = [];
    edges = [];
    selectedNode = null;

    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    const padding = 60;

    // Place nodes with some spacing
    const attempts = 200;
    for (let i = 0; i < n; i++) {
      let placed = false;
      for (let a = 0; a < attempts; a++) {
        const x = padding + Math.random() * (w - 2 * padding);
        const y = padding + Math.random() * (h - 2 * padding);

        let tooClose = false;
        for (const nd of nodes) {
          const dx = nd.x - x;
          const dy = nd.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < 70) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) {
          nodes.push({ x, y });
          placed = true;
          break;
        }
      }
      if (!placed) {
        nodes.push({
          x: padding + Math.random() * (w - 2 * padding),
          y: padding + Math.random() * (h - 2 * padding)
        });
      }
    }

    // Create edges — ensure connected, then add extras
    // Minimum spanning tree via random order to ensure connectivity
    const visited = new Set([0]);
    const unvisited = new Set(nodes.map((_, i) => i).filter(i => i > 0));

    while (unvisited.size > 0) {
      let bestDist = Infinity;
      let bestFrom = -1, bestTo = -1;

      for (const u of visited) {
        for (const v of unvisited) {
          const dx = nodes[u].x - nodes[v].x;
          const dy = nodes[u].y - nodes[v].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestDist) {
            bestDist = d;
            bestFrom = u;
            bestTo = v;
          }
        }
      }

      const weight = Math.max(1, Math.round(bestDist / 20));
      edges.push({ from: bestFrom, to: bestTo, weight });
      visited.add(bestTo);
      unvisited.delete(bestTo);
    }

    // Add extra random edges
    const extraEdges = Math.floor(n * 0.8);
    for (let i = 0; i < extraEdges; i++) {
      const from = Math.floor(Math.random() * n);
      let to = Math.floor(Math.random() * n);
      if (from === to) to = (to + 1) % n;
      if (!edgeExists(from, to)) {
        const dx = nodes[from].x - nodes[to].x;
        const dy = nodes[from].y - nodes[to].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const weight = Math.max(1, Math.round(d / 20));
        edges.push({ from, to, weight });
      }
    }

    updateInfo();
    draw();
  }

  // --- Initial ---
  updateInfo();
  showToast('Click the canvas to add nodes');
})();
