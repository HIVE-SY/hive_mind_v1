/* equalizer.js - Reusable Teal Equalizer Animation Component */

class EqualizerAnimation {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            container: null,         // Container element or ID
            barCount: 40,            // Number of bars
            minHeight: 5,            // Minimum bar height (px)
            maxHeight: 50,           // Maximum bar height (px)
            barWidth: 3,             // Width of each bar (px)
            barSpacing: 2,           // Space between bars (px)
            color: '#00bfa5',        // Bar color
            animationDuration: 20,   // Duration of animation cycle (seconds)
            responsive: true,        // Whether to adjust bar count based on width
            ...options
        };
        
        this.bars = [];
        this.animationId = null;
        this.container = null;
        
        // Initialize if container is provided
        if (this.config.container) {
            this.init(this.config.container);
        }
    }
    
    init(container) {
        // Get container element
        if (typeof container === 'string') {
            this.container = document.getElementById(container);
        } else {
            this.container = container;
        }
        
        if (!this.container) {
            console.error('Equalizer container not found');
            return;
        }
        
        // Create equalizer container if it doesn't exist
        this.equalizerContainer = document.createElement('div');
        this.equalizerContainer.className = 'equalizer-container';
        this.equalizerContainer.style.display = 'flex';
        this.equalizerContainer.style.alignItems = 'flex-end';
        this.equalizerContainer.style.justifyContent = 'space-between';
        this.equalizerContainer.style.width = '100%';
        this.equalizerContainer.style.height = `${this.config.maxHeight}px`;
        this.container.appendChild(this.equalizerContainer);
        
        // Calculate actual bar count if responsive
        if (this.config.responsive) {
            const containerWidth = this.equalizerContainer.offsetWidth;
            const possibleBars = Math.floor(containerWidth / (this.config.barWidth + this.config.barSpacing));
            this.config.barCount = Math.min(this.config.barCount, possibleBars);
        }
        
        // Create bars
        this.createBars();
        
        // Start animation
        this.start();
        
        return this;
    }
    
    createBars() {
        // Clear existing bars
        this.equalizerContainer.innerHTML = '';
        this.bars = [];
        
        // Create new bars
        for (let i = 0; i < this.config.barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'equalizer-bar';
            bar.style.width = `${this.config.barWidth}px`;
            bar.style.height = `${this.config.minHeight}px`;
            bar.style.backgroundColor = this.config.color;
            bar.style.borderRadius = '1px';
            bar.style.transition = 'height 0.2s ease';
            
            this.equalizerContainer.appendChild(bar);
            this.bars.push(bar);
        }
    }
    
    animateBars() {
        const now = Date.now() / 1000;
        const cyclePosition = (now % this.config.animationDuration) / this.config.animationDuration;
        
        this.bars.forEach((bar, index) => {
            // Calculate height based on position in the animation cycle and bar index
            const phase = (index / this.config.barCount) * Math.PI * 2;
            const wavePosition = cyclePosition * Math.PI * 2 + phase;
            
            // Add wave and progressive effects
            const waveEffect = (Math.sin(wavePosition) + 1) / 2;
            const progressiveEffect = index / this.config.barCount;
            
            // Combine effects with more weight to progressive (matching the image shown)
            const combinedFactor = (waveEffect * 0.3) + (progressiveEffect * 0.7);
            
            // Calculate final height
            const height = this.config.minHeight + (combinedFactor * (this.config.maxHeight - this.config.minHeight));
            
            // Apply height to the bar
            bar.style.height = `${height}px`;
        });
        
        this.animationId = requestAnimationFrame(() => this.animateBars());
    }
    
    start() {
        if (!this.animationId) {
            this.animateBars();
        }
        return this;
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        return this;
    }
    
    resize() {
        if (this.config.responsive && this.container) {
            // Recalculate bar count based on new width
            const containerWidth = this.equalizerContainer.offsetWidth;
            const possibleBars = Math.floor(containerWidth / (this.config.barWidth + this.config.barSpacing));
            this.config.barCount = Math.min(this.config.barCount, possibleBars);
            
            // Recreate bars
            this.createBars();
        }
        return this;
    }
    
    update(options = {}) {
        // Update configuration
        this.config = {...this.config, ...options};
        
        // Recreate bars with new config
        if (this.container) {
            this.createBars();
        }
        
        return this;
    }
}
