// Configuration file for API keys and settings
const CONFIG = {
    // Replace these with your actual API keys
    SUPABASE_URL: 'https://cjkyfulfzakirgrrugli.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqa3lmdWxmemFraXJncnJ1Z2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2OTQ0OTAsImV4cCI6MjA3NDI3MDQ5MH0.lDB0ERZ11TwArDMbYos6H2TsceUdgQmUstAuyGOj4Qo',
    SPOONACULAR_API_KEY: 'cb6be20153b34915b1fcfb4f16d824b4',
    
    // App settings
    APP_NAME: 'Vendor Connect',
    VERSION: '1.0.0',
    DEFAULT_PAGE_SIZE: 20,
    
    // Spoonacular API settings
    SPOONACULAR_BASE_URL: 'https://api.spoonacular.com',
    MAX_INGREDIENTS_PER_SEARCH: 50,
    
    // UI settings
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 300,
    
    // Validation rules
    MIN_PASSWORD_LENGTH: 6,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    
    // Categories
    ITEM_CATEGORIES: [
        'vegetables',
        'fruits', 
        'grains',
        'spices',
        'dairy',
        'meat',
        'seafood',
        'beverages',
        'other'
    ],
    
    // Units
    UNITS: [
        'kg',
        'g',
        'piece',
        'liter',
        'ml',
        'dozen',
        'packet',
        'box'
    ],
    
    // Order statuses
    ORDER_STATUSES: [
        'pending',
        'confirmed',
        'preparing', 
        'ready',
        'out_for_delivery',
        'delivered',
        'cancelled'
    ]
};

// Make config available globally
window.CONFIG = CONFIG;
