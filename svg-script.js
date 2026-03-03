document.addEventListener("DOMContentLoaded", () => {
    // 1. The exact graph data from the original code (Triple Island Relay)
    const graphData = {
        nodes:[
            {id:"a0", size:4.5, tier:0, pos:[-.46,-.2]}, {id:"a1", size:3.4, tier:1, pos:[-.67,-.37]},
            {id:"a2", size:3.3, tier:1, pos:[-.68,-.03]}, {id:"b0", size:4.9, tier:0, pos:[.03,0]},
            {id:"b1", size:3.5, tier:1, pos:[-.12,-.28]}, {id:"b2", size:3.4, tier:1, pos:[.17,.25]},
            {id:"c0", size:4.6, tier:0, pos:[.52,.18]}, {id:"c1", size:3.4, tier:1, pos:[.75,0]},
            {id:"c2", size:3.4, tier:1, pos:[.67,.43]}, {id:"r0", size:2.7, tier:2, pos:[-.33,-.62]},
            {id:"r1", size:2.6, tier:2, pos:[.3,-.52]}, {id:"r2", size:2.7, tier:2, pos:[.82,-.3]},
            {id:"r3", size:2.6, tier:2, pos:[.79,.64]}, {id:"r4", size:2.6, tier:2, pos:[.13,.72]},
            {id:"r5", size:2.6, tier:2, pos:[-.79,.21]}
        ],
        links:[
            {source:"a0", target:"a1"}, {source:"a0", target:"a2"}, {source:"b0", target:"b1"},
            {source:"b0", target:"b2"}, {source:"c0", target:"c1"}, {source:"c0", target:"c2"},
            {source:"a0", target:"b0"}, {source:"b0", target:"c0"}, {source:"a2", target:"b1"},
            {source:"b2", target:"c2"}, {source:"a1", target:"r0"}, {source:"b1", target:"r1"},
            {source:"c1", target:"r2"}, {source:"c2", target:"r3"}, {source:"b2", target:"r4"},
            {source:"a2", target:"r5"}
        ]
    };

    // 2. Setup Dimensions based on the viewBox
    const width = 680;
    const height = 360;
    const centerX = width / 2;
    const centerY = height / 2;
    const spreadX = width * 0.43;
    const spreadY = height * 0.43;

    // 3. Prepare Nodes and Links
    const nodes = graphData.nodes.map(n => {
        const targetX = centerX + n.pos[0] * spreadX;
        const targetY = centerY + n.pos[1] * spreadY;
        return {
            id: n.id,
            r: n.size,
            depth: n.tier,
            targetX: targetX,
            targetY: targetY,
            driftPhase: Math.random() * Math.PI * 2,
            driftRadius: n.tier === 0 ? 2.2 : (n.tier === 1 ? 3.4 : 4.8),
            // Start slightly randomized to create the initial "snap" effect
            x: targetX + (Math.random() - 0.5) * 30,
            y: targetY + (Math.random() - 0.5) * 30,
            vx: 0,
            vy: 0
        };
    });
    const links = graphData.links.map(l => ({ source: l.source, target: l.target }));

    // 4. Initialize the Physics Simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(d => {
            const sDepth = d.source.depth || 0;
            const tDepth = d.target.depth || 0;
            return 26 + (sDepth + tDepth) * 24 + Math.random() * 10;
        }).strength(0.35))
        .force("charge", d3.forceManyBody().strength(-84))
        .force("center", d3.forceCenter(centerX, centerY))
        .force("x", d3.forceX(d => d.targetX).strength(d => d.depth === 0 ? 0.22 : 0.095))
        .force("y", d3.forceY(d => d.targetY).strength(d => d.depth === 0 ? 0.22 : 0.095))
        .force("collision", d3.forceCollide().radius(d => d.r + 3.5));

    // 5. Select the SVG and draw the elements
    const svg = d3.select("#signal-graphic");
    
    // Note: I added fallback colors (#444 and #888) in case your Webflow CSS variables aren't setup yet.
    const linkGroup = svg.append("g")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("class", "signal-link")
        .attr("stroke", "var(--color-border, #444)") 
        .attr("stroke-opacity", 0.33)
        .attr("stroke-width", 1);

    const nodeGroup = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("class", "signal-node")
        .attr("fill", "var(--color-text-muted, #888)") 
        .attr("r", d => d.r);

    // 6. Update positions on every physics "tick"
    simulation.on("tick", () => {
        nodeGroup
            .attr("cx", d => d.x || centerX)
            .attr("cy", d => d.y || centerY)
            .attr("opacity", (d, i) => i % 4 === 0 ? 1 : 0.75);

        linkGroup
            .attr("x1", d => d.source.x || centerX)
            .attr("y1", d => d.source.y || centerY)
            .attr("x2", d => d.target.x || centerX)
            .attr("y2", d => d.target.y || centerY);
    });

    // 7. The Custom Drift Animation Loop
    // This feeds constant, gentle energy into the nodes so they never stop moving
    d3.timer((elapsed) => {
        const time = elapsed / 1000;
        
        nodes.forEach((node, i) => {
            const phase = node.driftPhase + i * 0.07;
            const targetDriftX = node.targetX + Math.sin(time * 0.18 + phase) * node.driftRadius;
            const targetDriftY = node.targetY + Math.cos(time * 0.16 + phase * 1.1) * node.driftRadius;
            
            const currentX = node.x || node.targetX;
            const currentY = node.y || node.targetY;
            
            const strengthTarget = node.depth === 0 ? 0.0009 : (node.depth === 1 ? 0.0012 : 0.0015);
            const strengthAmbient = node.depth === 0 ? 0.0017 : (node.depth === 1 ? 0.0112 : 0.0118);

            node.vx = (node.vx || 0) + (targetDriftX - currentX) * strengthTarget;
            node.vy = (node.vy || 0) + (targetDriftY - currentY) * strengthTarget;
            
            node.vx += Math.sin(time * 0.42 + phase) * strengthAmbient;
            node.vy += Math.cos(time * 0.39 + phase * 0.93) * strengthAmbient;
        });
        
        // Keep the simulation "warm" so it continues rendering
        simulation.alphaTarget(0.025).restart();
    });
});