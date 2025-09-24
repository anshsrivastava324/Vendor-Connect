class SupplierDashboard {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.inventory = [];
        this.orders = [];
        
        this.init();
    }

    async init() {
        this.currentUser = supabase.auth.getCurrentUser();
        this.userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');

        if (!this.currentUser || this.userProfile.user_type !== 'supplier') {
            window.location.href = 'supplier-login.html';
            return;
        }

        this.setupEventListeners();
        this.updateUserDisplay();
        await this.loadData();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Add item form
        document.getElementById('addItemForm').addEventListener('submit', (e) => this.addItem(e));

        // Profile form
        document.getElementById('profileForm').addEventListener('submit', (e) => this.updateProfile(e));

        // Inventory search
        document.getElementById('inventorySearch').addEventListener('input', (e) => this.filterInventory());
        document.getElementById('categoryFilter').addEventListener('change', (e) => this.filterInventory());

        // Order status filter
        document.getElementById('orderStatusFilter').addEventListener('change', (e) => this.filterOrders());

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }

    updateUserDisplay() {
        document.getElementById('userName').textContent = 
            this.userProfile.business_name || this.userProfile.name || 'Supplier';
    }

    switchTab(tabName) {
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');

        // Load tab-specific data
        if (tabName === 'profile') {
            this.loadProfileData();
        }
    }

    async loadData() {
        await Promise.all([
            this.loadInventory(),
            this.loadOrders(),
            this.updateStats()
        ]);
    }

    async loadInventory() {
        try {
            this.inventory = await supabase.database
                .from('items')
                .select()
                .eq('supplier_id', this.currentUser.id)
                .execute();

            this.displayInventory();
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    }

    displayInventory() {
        const inventoryGrid = document.getElementById('inventoryGrid');
        
        if (this.inventory.length === 0) {
            inventoryGrid.innerHTML = '<div class="empty-inventory">No items in inventory. Add your first item!</div>';
            return;
        }

        inventoryGrid.innerHTML = this.inventory.map(item => `
            <div class="inventory-item">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p class="item-category">${item.category}</p>
                    <p class="item-price">₹${item.price}/${item.unit}</p>
                    <p class="item-stock">Stock: ${item.stock_quantity}</p>
                    <p class="item-status ${item.in_stock ? 'in-stock' : 'out-of-stock'}">
                        ${item.in_stock ? 'In Stock' : 'Out of Stock'}
                    </p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-primary" onclick="supplierDashboard.editItem('${item.id}')">
                        Edit
                    </button>
                    <button class="btn btn-small ${item.in_stock ? 'btn-danger' : 'btn-success'}" 
                            onclick="supplierDashboard.toggleStock('${item.id}', ${!item.in_stock})">
                        ${item.in_stock ? 'Mark Out of Stock' : 'Mark In Stock'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadOrders() {
        try {
            this.orders = await supabase.database
                .from('orders')
                .select(`
                    *,
                    user_profiles!vendor_id (name, phone),
                    order_items (*)
                `)
                .eq('supplier_id', this.currentUser.id)
                .execute();

            this.displayOrders();
            this.updateOrdersCount();
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    displayOrders() {
        const ordersList = document.getElementById('ordersList');
        
        if (this.orders.length === 0) {
            ordersList.innerHTML = '<div class="empty-orders">No orders received yet</div>';
            return;
        }

        ordersList.innerHTML = this.orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <h4>Order #${order.order_number || order.id.substring(0, 8)}</h4>
                        <p>From: ${order.user_profiles?.name}</p>
                        <p>Phone: ${order.user_profiles?.phone}</p>
                    </div>
                    <div class="order-status">
                        <select class="status-select" data-order-id="${order.id}" onchange="supplierDashboard.updateOrderStatus('${order.id}', this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                            <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </div>
                </div>
                <div class="order-details">
                    <p><strong>Total: ₹${order.total_amount}</strong></p>
                    <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
                    <p>Items: ${order.order_items?.length || 0}</p>
                    ${order.notes ? `<p>Notes: ${order.notes}</p>` : ''}
                </div>
                <div class="order-items">
                    <h5>Items:</h5>
                    ${order.order_items?.map(item => `
                        <div class="order-item">
                            <span>${item.item_name}</span>
                            <span>${item.quantity} ${item.unit}</span>
                            <span>₹${item.price}</span>
                            ${item.from_ingredients ? `<span class="ingredient-tag">From: ${item.dish_name}</span>` : ''}
                        </div>
                    `).join('') || ''}
                </div>
            </div>
        `).join('');
    }

    updateOrdersCount() {
        const pendingCount = this.orders.filter(order => order.status === 'pending').length;
        document.getElementById('ordersCount').textContent = pendingCount;
    }

    async updateStats() {
        try {
            const totalItems = this.inventory.length;
            const pendingOrders = this.orders.filter(order => order.status === 'pending').length;
            const completedOrders = this.orders.filter(order => order.status === 'delivered').length;
            const totalRevenue = this.orders
                .filter(order => order.status === 'delivered')
                .reduce((sum, order) => sum + order.total_amount, 0);

            document.getElementById('totalItems').textContent = totalItems;
            document.getElementById('pendingOrders').textContent = pendingOrders;
            document.getElementById('completedOrders').textContent = completedOrders;
            document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;

            // Display recent orders
            const recentOrders = this.orders.slice(0, 3);
            document.getElementById('recentOrders').innerHTML = recentOrders.map(order => `
                <div class="recent-order">
                    <span>Order #${order.order_number || order.id.substring(0, 8)}</span>
                    <span>₹${order.total_amount}</span>
                    <span class="status-${order.status}">${order.status}</span>
                </div>
            `).join('') || '<p>No recent orders</p>';
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async addItem(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const addItemText = document.getElementById('addItemText');
        const addItemSpinner = document.getElementById('addItemSpinner');

        // Show loading state
        addItemText.classList.add('hidden');
        addItemSpinner.classList.remove('hidden');

        try {
            const itemData = {
                name: formData.get('name'),
                category: formData.get('category'),
                price: parseFloat(formData.get('price')),
                unit: formData.get('unit'),
                description: formData.get('description'),
                stock_quantity: parseInt(formData.get('stock_quantity')) || 0,
                minimum_order: parseInt(formData.get('minimum_order')) || 1,
                supplier_id: this.currentUser.id,
                in_stock: true
            };

            await supabase.database.from('items').insert(itemData);
            
            alert('Item added successfully!');
            e.target.reset();
            await this.loadInventory();
            this.switchTab('inventory');
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Failed to add item');
        } finally {
            addItemText.classList.remove('hidden');
            addItemSpinner.classList.add('hidden');
        }
    }

    async toggleStock(itemId, inStock) {
        try {
            await supabase.database
                .from('items')
                .update({ in_stock: inStock })
                .eq('id', itemId)
                .execute();

            await this.loadInventory();
        } catch (error) {
            console.error('Error updating stock status:', error);
        }
    }

    async updateOrderStatus(orderId, status) {
        try {
            await supabase.database
                .from('orders')
                .update({ status })
                .eq('id', orderId)
                .execute();

            await this.loadOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    }

    filterInventory() {
        const search = document.getElementById('inventorySearch').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;

        let filtered = this.inventory;

        if (search) {
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(search) ||
                item.description?.toLowerCase().includes(search)
            );
        }

        if (category) {
            filtered = filtered.filter(item => item.category === category);
        }

        const inventoryGrid = document.getElementById('inventoryGrid');
        inventoryGrid.innerHTML = filtered.map(item => `
            <div class="inventory-item">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p class="item-category">${item.category}</p>
                    <p class="item-price">₹${item.price}/${item.unit}</p>
                    <p class="item-stock">Stock: ${item.stock_quantity}</p>
                    <p class="item-status ${item.in_stock ? 'in-stock' : 'out-of-stock'}">
                        ${item.in_stock ? 'In Stock' : 'Out of Stock'}
                    </p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-primary" onclick="supplierDashboard.editItem('${item.id}')">
                        Edit
                    </button>
                    <button class="btn btn-small ${item.in_stock ? 'btn-danger' : 'btn-success'}" 
                            onclick="supplierDashboard.toggleStock('${item.id}', ${!item.in_stock})">
                        ${item.in_stock ? 'Mark Out of Stock' : 'Mark In Stock'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    filterOrders() {
        const status = document.getElementById('orderStatusFilter').value;
        
        let filtered = this.orders;
        if (status) {
            filtered = filtered.filter(order => order.status === status);
        }

        // Re-display filtered orders (similar to displayOrders but with filtered array)
        const ordersList = document.getElementById('ordersList');
        ordersList.innerHTML = filtered.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <h4>Order #${order.order_number || order.id.substring(0, 8)}</h4>
                        <p>From: ${order.user_profiles?.name}</p>
                        <p>Phone: ${order.user_profiles?.phone}</p>
                    </div>
                    <div class="order-status">
                        <select class="status-select" data-order-id="${order.id}" onchange="supplierDashboard.updateOrderStatus('${order.id}', this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                            <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </div>
                </div>
                <div class="order-details">
                    <p><strong>Total: ₹${order.total_amount}</strong></p>
                    <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
                    <p>Items: ${order.order_items?.length || 0}</p>
                    ${order.notes ? `<p>Notes: ${order.notes}</p>` : ''}
                </div>
                <div class="order-items">
                    <h5>Items:</h5>
                    ${order.order_items?.map(item => `
                        <div class="order-item">
                            <span>${item.item_name}</span>
                            <span>${item.quantity} ${item.unit}</span>
                            <span>₹${item.price}</span>
                            ${item.from_ingredients ? `<span class="ingredient-tag">From: ${item.dish_name}</span>` : ''}
                        </div>
                    `).join('') || ''}
                </div>
            </div>
        `).join('');
    }

    loadProfileData() {
        document.getElementById('profileName').value = this.userProfile.name || '';
        document.getElementById('profilePhone').value = this.userProfile.phone || '';
        document.getElementById('profileBusinessName').value = this.userProfile.business_name || '';
        document.getElementById('profileStreet').value = this.userProfile.address_street || '';
        document.getElementById('profileCity').value = this.userProfile.address_city || '';
        document.getElementById('profileState').value = this.userProfile.address_state || '';
        document.getElementById('profilePincode').value = this.userProfile.address_pincode || '';
    }

    async updateProfile(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);

        try {
            const updateData = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                business_name: formData.get('business_name'),
                address_street: formData.get('address_street'),
                address_city: formData.get('address_city'),
                address_state: formData.get('address_state'),
                address_pincode: formData.get('address_pincode')
            };

            await supabase.database
                .from('user_profiles')
                .update(updateData)
                .eq('id', this.currentUser.id)
                .execute();

            // Update local profile
            this.userProfile = { ...this.userProfile, ...updateData };
            localStorage.setItem('user_profile', JSON.stringify(this.userProfile));
            
            alert('Profile updated successfully!');
            this.updateUserDisplay();
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        }
    }

    editItem(itemId) {
        // Simple implementation - in a full app, you'd show a modal or navigate to edit page
        const item = this.inventory.find(i => i.id === itemId);
        if (item) {
            const newPrice = prompt(`Update price for ${item.name} (current: ₹${item.price}):`);
            if (newPrice && !isNaN(newPrice)) {
                this.updateItemPrice(itemId, parseFloat(newPrice));
            }
        }
    }

    async updateItemPrice(itemId, newPrice) {
        try {
            await supabase.database
                .from('items')
                .update({ price: newPrice })
                .eq('id', itemId)
                .execute();

            await this.loadInventory();
        } catch (error) {
            console.error('Error updating item price:', error);
        }
    }

    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        }
    }
}

// Initialize dashboard when page loads
let supplierDashboard;
document.addEventListener('DOMContentLoaded', () => {
    supplierDashboard = new SupplierDashboard();
});
