// Supabase client configuration
const SUPABASE_URL = 'https://cjkyfulfzakirgrrugli.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqa3lmdWxmemFraXJncnJ1Z2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2OTQ0OTAsImV4cCI6MjA3NDI3MDQ5MH0.lDB0ERZ11TwArDMbYos6H2TsceUdgQmUstAuyGOj4Qo';
const SPOONACULAR_API_KEY = 'cb6be20153b34915b1fcfb4f16d824b4';

class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.auth = new SupabaseAuth(this);
        this.database = new SupabaseDatabase(this);
    }

    async request(endpoint, options = {}) {
        const url = `${this.url}/rest/v1${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'apikey': this.key,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }
}

class SupabaseAuth {
    constructor(client) {
        this.client = client;
    }

    async signUp(email, password, userData = {}) {
        const response = await fetch(`${this.client.url}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.client.key
            },
            body: JSON.stringify({
                email,
                password,
                data: userData
            })
        });

        return response.json();
    }

    async signIn(email, password) {
        const response = await fetch(`${this.client.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.client.key
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();
        if (data.access_token) {
            localStorage.setItem('sb_access_token', data.access_token);
            localStorage.setItem('sb_user', JSON.stringify(data.user));
        }
        return data;
    }

    async signOut() {
        localStorage.removeItem('sb_access_token');
        localStorage.removeItem('sb_user');
        localStorage.removeItem('user_profile');
    }

    getCurrentUser() {
        const user = localStorage.getItem('sb_user');
        return user ? JSON.parse(user) : null;
    }

    getAccessToken() {
        return localStorage.getItem('sb_access_token');
    }
}

class SupabaseDatabase {
    constructor(client) {
        this.client = client;
    }

    from(table) {
        return new SupabaseTable(this.client, table);
    }
}

class SupabaseTable {
    constructor(client, table) {
        this.client = client;
        this.table = table;
        this.queryParams = [];
    }

    select(columns = '*') {
        this.queryParams.push(`select=${columns}`);
        return this;
    }

    eq(column, value) {
        this.queryParams.push(`${column}=eq.${value}`);
        return this;
    }

    async execute() {
        const queryString = this.queryParams.length > 0 ? `?${this.queryParams.join('&')}` : '';
        const token = localStorage.getItem('sb_access_token');
        
        return this.client.request(`/${this.table}${queryString}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    async insert(data) {
        const token = localStorage.getItem('sb_access_token');
        
        return this.client.request(`/${this.table}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });
    }

    async update(data) {
        const token = localStorage.getItem('sb_access_token');
        const queryString = this.queryParams.length > 0 ? `?${this.queryParams.join('&')}` : '';
        
        return this.client.request(`/${this.table}${queryString}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
    }

    async delete() {
        const token = localStorage.getItem('sb_access_token');
        const queryString = this.queryParams.length > 0 ? `?${this.queryParams.join('&')}` : '';
        
        return this.client.request(`/${this.table}${queryString}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }
}

// Initialize Supabase client with quoted strings
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
