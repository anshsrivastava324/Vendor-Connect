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

    // Sign up new user with improved error handling
    async signUp(email, password, userData = {}) {
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
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

    // Sign in existing user with better profile handling
    async signIn(email, password) {
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
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
                await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': SUPABASE_ANON_KEY
                    }
                });
            }
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            // Clear local storage regardless of API call result
            this.clearAuthData();
            this.notifyAuthListeners('signed_out');
        }
    }

    // Fetch user profile from database with better error handling
    async fetchUserProfile(userId) {
        try {
            const token = localStorage.getItem('sb_access_token');
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const profiles = await response.json();
            
            if (profiles && profiles.length > 0) {
                this.userProfile = profiles[0];
                localStorage.setItem('user_profile', JSON.stringify(this.userProfile));
            } else {
                // Profile doesn't exist, create a basic one
                console.warn('User profile not found, creating basic profile');
                const basicProfile = {
                    id: userId,
                    name: this.currentUser.user_metadata?.name || 'User',
                    user_type: this.currentUser.user_metadata?.user_type || 'vendor',
                    phone: '',
                    is_active: true
                };
                await this.createUserProfile(basicProfile);
            }

            return this.userProfile;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    // Create user profile in database with better error handling
    async createUserProfile(profileData) {
        try {
            const token = localStorage.getItem('sb_access_token');
            
            console.log('Creating user profile:', profileData);
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Profile creation failed:', response.status, errorData);
                throw new Error(`Profile creation failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Profile creation result:', result);
            
            if (result && result.length > 0) {
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
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${this.currentUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY,
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

    // Clear all auth data
    clearAuthData() {
        localStorage.removeItem('sb_access_token');
        localStorage.removeItem('sb_refresh_token');
        localStorage.removeItem('sb_user');
        localStorage.removeItem('user_profile');
        
        this.currentUser = null;
        this.userProfile = null;
    }

    // Validation methods
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
                if (buttonText) buttonText.classList.add('hidden');
                if (spinner) spinner.classList.remove('hidden');
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
                
                // Check if user profile exists and is vendor
                if (!this.auth.getUserProfile()) {
                    throw new Error('User profile not found. Please contact support.');
                }
                
                if (!this.auth.isVendor()) {
                    throw new Error('Invalid vendor account. Please check your credentials.');
                }
                
                // Redirect to vendor dashboard
                window.location.href = 'vendor-dashboard.html';
                
            } catch (error) {
                this.showError(error.message);
            } finally {
                // Reset loading state
                if (buttonText) buttonText.classList.remove('hidden');
                if (spinner) spinner.classList.add('hidden');
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
                if (buttonText) buttonText.classList.add('hidden');
                if (spinner) spinner.classList.remove('hidden');
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
                
                // Check if user profile exists and is supplier
                if (!this.auth.getUserProfile()) {
                    throw new Error('User profile not found. Please contact support.');
                }
                
                if (!this.auth.isSupplier()) {
                    throw new Error('Invalid supplier account. Please check your credentials.');
                }
                
                // Redirect to supplier dashboard
                window.location.href = 'supplier-dashboard.html';
                
            } catch (error) {
                this.showError(error.message);
            } finally {
                // Reset loading state
                if (buttonText) buttonText.classList.remove('hidden');
                if (spinner) spinner.classList.add('hidden');
                submitButton.disabled = false;
            }
        });
    }

    // Handle registration form with improved profile creation
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
                if (buttonText) buttonText.classList.add('hidden');
                if (spinner) spinner.classList.remove('hidden');
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
                if (phone && !this.auth.validatePhone(phone)) {
                    throw new Error('Please enter a valid 10-digit phone number starting with 6-9');
                }
                
                // Sign up user
                const userData = {
                    name: formData.get('name'),
                    user_type: formData.get('userType')
                };
                
                console.log('Signing up user with data:', userData);
                const result = await this.auth.signUp(email, password, userData);
                
                // Create user profile immediately after signup
                if (result.user) {
                    const profileData = {
                        id: result.user.id,
                        name: formData.get('name') || 'User',
                        user_type: formData.get('userType') || 'vendor',
                        phone: formData.get('phone') || '',
                        business_name: formData.get('businessName') || null,
                        address_street: formData.get('street') || null,
                        address_city: formData.get('city') || null,
                        address_state: formData.get('state') || null,
                        address_pincode: formData.get('pincode') || null,
                        is_active: true
                    };
                    
                    console.log('Creating profile with data:', profileData);
                    await this.auth.createUserProfile(profileData);
                }
                
                this.showSuccess('Registration successful! You can now log in to your account.');
                
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
                console.error('Registration error:', error);
                this.showError(error.message);
            } finally {
                // Reset loading state
                if (buttonText) buttonText.classList.remove('hidden');
                if (spinner) spinner.classList.add('hidden');
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
