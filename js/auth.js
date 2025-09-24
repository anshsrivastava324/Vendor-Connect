// Authentication handler for Vendor Connect application
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.authListeners = [];
        
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const token = localStorage.getItem('sb_access_token');
        const user = localStorage.getItem('sb_user');
        
        if (token && user) {
            try {
                this.currentUser = JSON.parse(user);
                this.userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
                this.notifyAuthListeners('signed_in');
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                this.signOut();
            }
        }
    }

    // Sign up new user
    async signUp(email, password, userData = {}) {
        try {
            const response = await fetch(`${supabase.url}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabase.key
                },
                body: JSON.stringify({
                    email,
                    password,
                    data: userData
                })
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message || 'Signup failed');
            }

            if (result.user) {
                this.currentUser = result.user;
                
                if (result.access_token) {
                    localStorage.setItem('sb_access_token', result.access_token);
                    localStorage.setItem('sb_user', JSON.stringify(result.user));
                    this.notifyAuthListeners('signed_up');
                }
            }

            return result;
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
    }

    // Sign in existing user
    async signIn(email, password) {
        try {
            const response = await fetch(`${supabase.url}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabase.key
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message || 'Sign in failed');
            }

            if (result.access_token && result.user) {
                this.currentUser = result.user;
                localStorage.setItem('sb_access_token', result.access_token);
                localStorage.setItem('sb_user', JSON.stringify(result.user));
                
                // Fetch user profile
                await this.fetchUserProfile(result.user.id);
                
                this.notifyAuthListeners('signed_in');
            }

            return result;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    // Sign out user
    async signOut() {
        try {
            const token = localStorage.getItem('sb_access_token');
            
            if (token) {
                await fetch(`${supabase.url}/auth/v1/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': supabase.key
                    }
                });
            }
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            // Clear local storage regardless of API call result
            localStorage.removeItem('sb_access_token');
            localStorage.removeItem('sb_user');
            localStorage.removeItem('user_profile');
            
            this.currentUser = null;
            this.userProfile = null;
            
            this.notifyAuthListeners('signed_out');
        }
    }

    // Fetch user profile from database
    async fetchUserProfile(userId) {
        try {
            const token = localStorage.getItem('sb_access_token');
            
            const response = await fetch(`${supabase.url}/rest/v1/user_profiles?id=eq.${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': supabase.key,
                    'Content-Type': 'application/json'
                }
            });

            const profiles = await response.json();
            
            if (profiles && profiles.length > 0) {
                this.userProfile = profiles[0];
                localStorage.setItem('user_profile', JSON.stringify(this.userProfile));
            }

            return this.userProfile;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    // Create user profile in database
    async createUserProfile(profileData) {
        try {
            const token = localStorage.getItem('sb_access_token');
            
            const response = await fetch(`${supabase.url}/rest/v1/user_profiles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': supabase.key,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(profileData)
            });

            const result = await response.json();
            
            if (response.ok && result.length > 0) {
                this.userProfile = result[0];
                localStorage.setItem('user_profile', JSON.stringify(this.userProfile));
            }

            return result;
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }

    // Update user profile
    async updateUserProfile(updates) {
        try {
            const token = localStorage.getItem('sb_access_token');
            
            const response = await fetch(`${supabase.url}/rest/v1/user_profiles?id=eq.${this.currentUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': supabase.key,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();
            
            if (response.ok && result.length > 0) {
                this.userProfile = { ...this.userProfile, ...result[0] };
                localStorage.setItem('user_profile', JSON.stringify(this.userProfile));
            }

            return result;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            const response = await fetch(`${supabase.url}/auth/v1/recover`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabase.key
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message || 'Password reset failed');
            }

            return result;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    // Update password
    async updatePassword(newPassword) {
        try {
            const token = localStorage.getItem('sb_access_token');
            
            const response = await fetch(`${supabase.url}/auth/v1/user`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'apikey': supabase.key
                },
                body: JSON.stringify({ password: newPassword })
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message || 'Password update failed');
            }

            return result;
        } catch (error) {
            console.error('Password update error:', error);
            throw error;
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get user profile
    getUserProfile() {
        return this.userProfile;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null && localStorage.getItem('sb_access_token') !== null;
    }

    // Check if user is vendor
    isVendor() {
        return this.userProfile && this.userProfile.user_type === 'vendor';
    }

    // Check if user is supplier
    isSupplier() {
        return this.userProfile && this.userProfile.user_type === 'supplier';
    }

    // Get access token
    getAccessToken() {
        return localStorage.getItem('sb_access_token');
    }

    // Verify token validity
    async verifyToken() {
        try {
            const token = localStorage.getItem('sb_access_token');
            
            if (!token) {
                return false;
            }

            const response = await fetch(`${supabase.url}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': supabase.key
                }
            });

            if (response.ok) {
                const user = await response.json();
                this.currentUser = user;
                localStorage.setItem('sb_user', JSON.stringify(user));
                return true;
            } else {
                this.signOut();
                return false;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            this.signOut();
            return false;
        }
    }

    // Add authentication state listener
    onAuthStateChange(callback) {
        this.authListeners.push(callback);
        
        // Call immediately with current state
        if (this.isAuthenticated()) {
            callback('signed_in', this.currentUser, this.userProfile);
        } else {
            callback('signed_out', null, null);
        }
        
        // Return unsubscribe function
        return () => {
            this.authListeners = this.authListeners.filter(listener => listener !== callback);
        };
    }

    // Notify auth listeners
    notifyAuthListeners(event) {
        this.authListeners.forEach(callback => {
            callback(event, this.currentUser, this.userProfile);
        });
    }

    // Refresh session
    async refreshSession() {
        try {
            const refreshToken = localStorage.getItem('sb_refresh_token');
            
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(`${supabase.url}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabase.key
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message);
            }

            if (result.access_token) {
                localStorage.setItem('sb_access_token', result.access_token);
                if (result.refresh_token) {
                    localStorage.setItem('sb_refresh_token', result.refresh_token);
                }
            }

            return result;
        } catch (error) {
            console.error('Session refresh error:', error);
            this.signOut();
            throw error;
        }
    }

    // Validate user input
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password) {
        return password && password.length >= 6;
    }

    validatePhone(phone) {
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone);
    }

    // Route guards
    requireAuth(redirectPath = '/index.html') {
        if (!this.isAuthenticated()) {
            window.location.href = redirectPath;
            return false;
        }
        return true;
    }

    requireVendor(redirectPath = '/vendor-login.html') {
        if (!this.requireAuth(redirectPath)) {
            return false;
        }
        
        if (!this.isVendor()) {
            window.location.href = redirectPath;
            return false;
        }
        return true;
    }

    requireSupplier(redirectPath = '/supplier-login.html') {
        if (!this.requireAuth(redirectPath)) {
            return false;
        }
        
        if (!this.isSupplier()) {
            window.location.href = redirectPath;
            return false;
        }
        return true;
    }

    // Clear all auth data
    clearAuthData() {
        localStorage.removeItem('sb_access_token');
        localStorage.removeItem('sb_refresh_token');
        localStorage.removeItem('sb_user');
        localStorage.removeItem('user_profile');
        
        this.currentUser = null;
        this.userProfile = null;
    }
}

// Auth event handlers for forms
class AuthFormHandlers {
    constructor(authManager) {
        this.auth = authManager;
    }

    // Handle vendor login form
    handleVendorLogin(formElement) {
        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(formElement);
            const email = formData.get('email');
            const password = formData.get('password');
            
            const submitButton = formElement.querySelector('button[type="submit"]');
            const buttonText = submitButton.querySelector('span:not(.spinner)');
            const spinner = submitButton.querySelector('.spinner');
            
            try {
                // Show loading state
                buttonText.classList.add('hidden');
                spinner.classList.remove('hidden');
                submitButton.disabled = true;
                
                // Validate input
                if (!this.auth.validateEmail(email)) {
                    throw new Error('Please enter a valid email address');
                }
                
                if (!this.auth.validatePassword(password)) {
                    throw new Error('Password must be at least 6 characters');
                }
                
                // Sign in
                await this.auth.signIn(email, password);
                
                // Check if user is vendor
                if (!this.auth.isVendor()) {
                    throw new Error('Invalid vendor account. Please check your credentials.');
                }
                
                // Redirect to vendor dashboard
                window.location.href = 'vendor-dashboard.html';
                
            } catch (error) {
                this.showError(error.message);
            } finally {
                // Reset loading state
                buttonText.classList.remove('hidden');
                spinner.classList.add('hidden');
                submitButton.disabled = false;
            }
        });
    }

    // Handle supplier login form
    handleSupplierLogin(formElement) {
        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(formElement);
            const email = formData.get('email');
            const password = formData.get('password');
            
            const submitButton = formElement.querySelector('button[type="submit"]');
            const buttonText = submitButton.querySelector('span:not(.spinner)');
            const spinner = submitButton.querySelector('.spinner');
            
            try {
                // Show loading state
                buttonText.classList.add('hidden');
                spinner.classList.remove('hidden');
                submitButton.disabled = true;
                
                // Validate input
                if (!this.auth.validateEmail(email)) {
                    throw new Error('Please enter a valid email address');
                }
                
                if (!this.auth.validatePassword(password)) {
                    throw new Error('Password must be at least 6 characters');
                }
                
                // Sign in
                await this.auth.signIn(email, password);
                
                // Check if user is supplier
                if (!this.auth.isSupplier()) {
                    throw new Error('Invalid supplier account. Please check your credentials.');
                }
                
                // Redirect to supplier dashboard
                window.location.href = 'supplier-dashboard.html';
                
            } catch (error) {
                this.showError(error.message);
            } finally {
                // Reset loading state
                buttonText.classList.remove('hidden');
                spinner.classList.add('hidden');
                submitButton.disabled = false;
            }
        });
    }

    // Handle registration form
    handleRegistration(formElement) {
        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(formElement);
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            
            const submitButton = formElement.querySelector('button[type="submit"]');
            const buttonText = submitButton.querySelector('span:not(.spinner)');
            const spinner = submitButton.querySelector('.spinner');
            
            try {
                // Show loading state
                buttonText.classList.add('hidden');
                spinner.classList.remove('hidden');
                submitButton.disabled = true;
                
                // Validate passwords match
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                
                // Validate email
                const email = formData.get('email');
                if (!this.auth.validateEmail(email)) {
                    throw new Error('Please enter a valid email address');
                }
                
                // Validate password
                if (!this.auth.validatePassword(password)) {
                    throw new Error('Password must be at least 6 characters');
                }
                
                // Validate phone
                const phone = formData.get('phone');
                if (!this.auth.validatePhone(phone)) {
                    throw new Error('Please enter a valid 10-digit phone number');
                }
                
                // Sign up user
                const userData = {
                    name: formData.get('name'),
                    user_type: formData.get('userType')
                };
                
                const result = await this.auth.signUp(email, password, userData);
                
                // Create user profile
                if (result.user) {
                    const profileData = {
                        id: result.user.id,
                        name: formData.get('name'),
                        user_type: formData.get('userType'),
                        phone: phone,
                        business_name: formData.get('businessName') || null,
                        address_street: formData.get('street'),
                        address_city: formData.get('city'),
                        address_state: formData.get('state'),
                        address_pincode: formData.get('pincode')
                    };
                    
                    await this.auth.createUserProfile(profileData);
                }
                
                this.showSuccess('Registration successful! Please check your email to verify your account.');
                
                // Redirect after delay
                setTimeout(() => {
                    const userType = formData.get('userType');
                    if (userType === 'vendor') {
                        window.location.href = 'vendor-login.html';
                    } else {
                        window.location.href = 'supplier-login.html';
                    }
                }, 2000);
                
            } catch (error) {
                this.showError(error.message);
            } finally {
                // Reset loading state
                buttonText.classList.remove('hidden');
                spinner.classList.add('hidden');
                submitButton.disabled = false;
            }
        });
    }

    // Show error message
    showError(message) {
        let errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorMessage';
            errorDiv.className = 'error-message';
            document.body.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }

    // Show success message
    showSuccess(message) {
        let successDiv = document.getElementById('successMessage');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'successMessage';
            successDiv.className = 'success-message';
            document.body.appendChild(successDiv);
        }
        
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
    }
}

// Initialize auth manager
const authManager = new AuthManager();
const authFormHandlers = new AuthFormHandlers(authManager);

// Make auth available globally
window.authManager = authManager;
window.authFormHandlers = authFormHandlers;

// Auto-initialize form handlers on page load
document.addEventListener('DOMContentLoaded', () => {
    // Handle vendor login form
    const vendorLoginForm = document.getElementById('vendorLoginForm');
    if (vendorLoginForm) {
        authFormHandlers.handleVendorLogin(vendorLoginForm);
    }
    
    // Handle supplier login form
    const supplierLoginForm = document.getElementById('supplierLoginForm');
    if (supplierLoginForm) {
        authFormHandlers.handleSupplierLogin(supplierLoginForm);
    }
    
    // Handle registration form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        authFormHandlers.handleRegistration(registerForm);
    }
});
