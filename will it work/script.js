(function() {
    'use strict';
    
    // Use a global counter to avoid freezing issues
    let blockCount = 0;
    
    class AdvancedScriptBlocker {
        constructor() {
            this.isActive = true;
            
            // Patterns to detect GoGuardian
            this.patterns = [
                /var\s+GG_INJ_CFG\s*=\s*\{\s*"pna"\s*:\s*true\s*\}/gi,
                /goguardian/gi,
                /asset\.goguardian/gi,
                /localstorage\.goguardian/gi,
                /xdLocalStorage/gi,
                /xdLocalStoragePostMessageApi/gi
            ];

            // URLs to block
            this.blockedUrls = [
                'asset.goguardian',
                'localstorage.goguardian',
                'xdLocalStorage.js',
                'xdLocalStoragePostMessageApi.js',
                'asset.js'
            ];

            this.init();
        }

        init() {
            this.setupDOMObserver();
            this.setupScriptInterception();
            this.setupMillisecondScanner();
            this.overrideDangerousFunctions();
            this.setupCSPHeaders();
            this.log('Advanced GoGuardian Blocker initialized');
        }

        log(message) {
            console.log(`🛡️ [BLOCKER] ${message}`);
        }

        incrementBlock() {
            blockCount++;
            console.log(`🚫 BLOCK ${blockCount} - GoGuardian script blocked!`);
        }

        // Method 1: DOM Mutation Observer
        setupDOMObserver() {
            if (typeof MutationObserver === 'undefined') return;
            
            const observer = new MutationObserver((mutations) => {
                try {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node && node.nodeType === Node.ELEMENT_NODE) {
                                this.scanElement(node);
                            }
                        });
                    });
                } catch (e) {
                    // Silently handle errors to prevent breaking
                }
            });

            // Wait for DOM to be ready
            const startObserver = () => {
                const target = document.body || document.documentElement;
                if (target) {
                    observer.observe(target, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['src', 'href']
                    });
                } else {
                    setTimeout(startObserver, 10);
                }
            };
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', startObserver);
            } else {
                startObserver();
            }
        }

        // Method 2: Script interception
        setupScriptInterception() {
            const self = this;
            
            // Override createElement
            const originalCreateElement = document.createElement;
            document.createElement = function(tagName) {
                const element = originalCreateElement.call(this, tagName);
                
                if (tagName.toLowerCase() === 'script') {
                    const originalSetAttribute = element.setAttribute;
                    element.setAttribute = function(name, value) {
                        if (name === 'src' && self.isBlockedUrl(value)) {
                            self.incrementBlock();
                            return;
                        }
                        return originalSetAttribute.call(this, name, value);
                    };

                    // Monitor src property
                    let srcValue = '';
                    Object.defineProperty(element, 'src', {
                        get() { return srcValue; },
                        set(value) {
                            if (self.isBlockedUrl(value)) {
                                self.incrementBlock();
                                return;
                            }
                            srcValue = value;
                        }
                    });
                }
                
                return element;
            };

            // Override appendChild - PREVENT AND REMOVE
            const originalAppendChild = Node.prototype.appendChild;
            Node.prototype.appendChild = function(child) {
                if (self.shouldBlockElement(child)) {
                    // FORCE REMOVAL - prevent addition and destroy
                    try {
                        child.src = '';
                        child.innerHTML = '';
                        child.textContent = '';
                    } catch (e) {}
                    self.incrementBlock();
                    return child; // Return but don't actually append
                }
                return originalAppendChild.call(this, child);
            };

            // Override insertBefore - PREVENT AND REMOVE
            const originalInsertBefore = Node.prototype.insertBefore;
            Node.prototype.insertBefore = function(newNode, referenceNode) {
                if (self.shouldBlockElement(newNode)) {
                    // FORCE REMOVAL - prevent addition and destroy
                    try {
                        newNode.src = '';
                        newNode.innerHTML = '';
                        newNode.textContent = '';
                    } catch (e) {}
                    self.incrementBlock();
                    return newNode; // Return but don't actually insert
                }
                return originalInsertBefore.call(this, newNode, referenceNode);
            };
        }

        // Method 3: Millisecond scanner
        setupMillisecondScanner() {
            const self = this;
            
            // Scan every millisecond
            setInterval(() => {
                if (!this.isActive) return;
                
                // Scan all scripts - MUST REMOVE IMMEDIATELY
                const scripts = document.getElementsByTagName('script');
                for (let i = scripts.length - 1; i >= 0; i--) {
                    const script = scripts[i];
                    if (this.shouldBlockElement(script)) {
                        // FORCE REMOVAL - multiple methods
                        try {
                            script.remove();
                            script.parentNode && script.parentNode.removeChild(script);
                            script.src = '';
                            script.innerHTML = '';
                            script.textContent = '';
                        } catch (e) {}
                        this.incrementBlock();
                    }
                }

                // Scan document content
                this.scanDocumentContent();
                
                // Scan for inline scripts - REMOVE IMMEDIATELY
                this.scanInlineScripts();
                
            }, 1);

            // Additional faster scan every 100 microseconds for critical elements
            const microScan = () => {
                if (!this.isActive) return;
                
                // AGGRESSIVE REMOVAL - target GoGuardian specifically
                const scripts = document.querySelectorAll('script[src*="goguardian"], script[src*="asset.js"], script:not([src])');
                scripts.forEach(script => {
                    if (this.shouldBlockElement(script)) {
                        // FORCE REMOVAL - multiple methods
                        try {
                            script.remove();
                            script.parentNode && script.parentNode.removeChild(script);
                            script.outerHTML = '';
                            script.src = '';
                            script.innerHTML = '';
                            script.textContent = '';
                        } catch (e) {}
                        this.incrementBlock();
                    }
                });
                
                setTimeout(microScan, 0.1);
            };
            microScan();
        }

        // Method 4: Override dangerous functions
        overrideDangerousFunctions() {
            const self = this;

            // Override eval
            const originalEval = window.eval;
            window.eval = function(code) {
                if (self.containsBlockedPatterns(code)) {
                    self.incrementBlock();
                    return;
                }
                return originalEval.call(this, code);
            };

            // Override Function constructor
            const originalFunction = window.Function;
            window.Function = function(...args) {
                const code = args[args.length - 1];
                if (self.containsBlockedPatterns(code)) {
                    self.incrementBlock();
                    return function() {};
                }
                return originalFunction.apply(this, args);
            };

            // Override setTimeout and setInterval
            const originalSetTimeout = window.setTimeout;
            window.setTimeout = function(func, delay, ...args) {
                if (typeof func === 'string' && self.containsBlockedPatterns(func)) {
                    self.incrementBlock();
                    return;
                }
                return originalSetTimeout.call(this, func, delay, ...args);
            };

            const originalSetInterval = window.setInterval;
            window.setInterval = function(func, delay, ...args) {
                if (typeof func === 'string' && self.containsBlockedPatterns(func)) {
                    self.incrementBlock();
                    return;
                }
                return originalSetInterval.call(this, func, delay, ...args);
            };
        }

        // Method 5: CSP-like protection
        setupCSPHeaders() {
            try {
                if (!document.head) return;
                
                const meta = document.createElement('meta');
                meta.httpEquiv = 'Content-Security-Policy';
                meta.content = "script-src 'self' 'unsafe-inline' 'unsafe-eval' * blob: data:; object-src 'none';";
                document.head.appendChild(meta);
            } catch (e) {
                // Silently handle CSP errors
            }
        }

        // Helper methods
        scanElement(element) {
            try {
                if (element && element.tagName === 'SCRIPT') {
                    if (this.shouldBlockElement(element)) {
                        // FORCE REMOVAL - multiple methods
                        try {
                            element.remove();
                            element.parentNode && element.parentNode.removeChild(element);
                            element.src = '';
                            element.innerHTML = '';
                            element.textContent = '';
                            element.outerHTML = '';
                        } catch (e) {}
                        this.incrementBlock();
                        return;
                    }
                }

                // Scan child elements - AGGRESSIVE REMOVAL
                if (element && element.querySelectorAll) {
                    const children = element.querySelectorAll('script');
                    children.forEach(child => {
                        if (this.shouldBlockElement(child)) {
                            // FORCE REMOVAL - multiple methods
                            try {
                                child.remove();
                                child.parentNode && child.parentNode.removeChild(child);
                                child.src = '';
                                child.innerHTML = '';
                                child.textContent = '';
                                child.outerHTML = '';
                            } catch (e) {}
                            this.incrementBlock();
                        }
                    });
                }
            } catch (e) {
                // Silently handle scanning errors
            }
        }

        scanDocumentContent() {
            const content = document.documentElement.outerHTML;
            if (this.containsBlockedPatterns(content)) {
                // Remove any GoGuardian variables from global scope
                if (window.GG_INJ_CFG) {
                    delete window.GG_INJ_CFG;
                    this.incrementBlock();
                }
            }
        }

        scanInlineScripts() {
            const scripts = document.querySelectorAll('script:not([src])');
            scripts.forEach(script => {
                if (this.containsBlockedPatterns(script.innerHTML || script.textContent)) {
                    // FORCE REMOVAL - multiple methods
                    try {
                        script.remove();
                        script.parentNode && script.parentNode.removeChild(script);
                        script.innerHTML = '';
                        script.textContent = '';
                        script.outerHTML = '';
                    } catch (e) {}
                    this.incrementBlock();
                }
            });
        }

        shouldBlockElement(element) {
            if (!element || !element.tagName) return false;
            
            if (element.tagName === 'SCRIPT') {
                const src = element.src || element.getAttribute('src');
                const content = element.innerHTML || element.textContent;
                
                return this.isBlockedUrl(src) || this.containsBlockedPatterns(content);
            }
            
            return false;
        }

        isBlockedUrl(url) {
            if (!url) return false;
            return this.blockedUrls.some(blocked => url.includes(blocked));
        }

        containsBlockedPatterns(text) {
            if (!text) return false;
            return this.patterns.some(pattern => pattern.test(text));
        }
    }

    // Initialize immediately
    const blocker = new AdvancedScriptBlocker();
    
    // Reinitialize on page changes
    if (typeof MutationObserver !== 'undefined') {
        const pageObserver = new MutationObserver(() => {
            try {
                if (!document.querySelector('.advanced-blocker-active')) {
                    const marker = document.createElement('div');
                    marker.className = 'advanced-blocker-active';
                    marker.style.display = 'none';
                    
                    const target = document.body || document.documentElement;
                    if (target) {
                        target.appendChild(marker);
                        new AdvancedScriptBlocker();
                    }
                }
            } catch (e) {
                // Silently handle reinit errors
            }
        });
        
        const startPageObserver = () => {
            const target = document.body || document.documentElement;
            if (target) {
                pageObserver.observe(target, {
                    childList: true,
                    subtree: true
                });
            } else {
                setTimeout(startPageObserver, 10);
            }
        };
        
        startPageObserver();
    }
    
    console.log('🛡️ Advanced GoGuardian Blocker loaded and active');
})();