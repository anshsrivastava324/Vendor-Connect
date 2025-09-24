class VendorDashboard {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.cart = [];
        this.selectedIngredients = new Set();
        this.currentIngredients = [];
        
        this.init();
    }

    async init() {
        this.currentUser = supabase.auth.getCurrentUser();
        this.userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');

        if (!this.currentUser || this.userProfile.user_type !== 'vendor') {
            window.location.href = 'vendor-login.html';
            return;
        }

        this.setupEventListeners();
        this.updateUserDisplay();
        await this.loadCart();
        await this.loadSupplierItems();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.searchIngredients());
        document.getElementById('dishInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchIngredients();
        });

        // Add all selected ingredients
        document.getElementById('addAllBtn').addEventListener('click', () => this.addSelectedIngredients());

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Checkout
        document.getElementById('checkoutBtn').addEventListener('click', () => this.checkout());
    }

    updateUserDisplay() {
        document.getElementById('userName').textContent = this.userProfile.name || 'Vendor';
    }

    switchTab(tabName) {
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');

        // Load tab-specific data
        if (tabName === 'orders') {
            this.loadOrders();
        }
    }

    async searchIngredients() {
        const dishName = document.getElementById('dishInput').value.trim();
        if (!dishName) return;

        const searchBtn = document.getElementById('searchBtn');
        const spinner = document.getElementById('searchSpinner');
        const resultsDiv = document.getElementById('ingredientsResult');

        // Show loading
        searchBtn.disabled = true;
        spinner.classList.remove('hidden');
        resultsDiv.classList.add('hidden');

        try {
            const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(dishName)}&apiKey=${SPOONACULAR_API_KEY}&addRecipeInformation=true&fillIngredients=true&number=1`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch ingredients');
            }

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                this.currentIngredients = data.results[0].extendedIngredients.map(ingredient => ({
                    id: ingredient.id,
                    name: ingredient.name,
                    amount: ingredient.amount || 1,
                    unit: ingredient.unit || 'piece',
                    image: ingredient.image
                }));

                this.displayIngredients(dishName);
                this.selectedIngredients.clear();
                this.updateSelectedCount();
            } else {
                this.showNoResults();
            }
        } catch (error) {
            console.error('Error fetching ingredients:', error);
            alert('Failed to fetch ingredients. Please try again.');
        } finally {
            searchBtn.disabled = false;
            spinner.classList.add('hidden');
        }
    }

    displayIngredients(dishName) {
        document.getElementById('dishName').textContent = dishName;
        const ingredientsList = document.getElementById('ingredientsList');
        
        ingredientsList.innerHTML = this.currentIngredients.map(ingredient => `
            <div class="ingredient-card">
                <label class="ingredient-checkbox">
                    <input type="checkbox" data-ingredient-id="${ingredient.id}">
                    <div class="ingredient-content">
                        ${ingredient.image ? `
                            <img src="https://spoonacular.com/cdn/ingredients_100x100/${ingredient.image}" 
                                 alt="${ingredient.name}" class="ingredient-image">
                        ` : ''}
                        <div class="ingredient-info">
                            <span class="ingredient-name">${ingredient.name}</span>
                            <span class="ingredient-amount">${ingredient.amount} ${ingredient.unit}</span>
                        </div>
                    </div>
                </label>
            </div>
        `).join('');

        // Add checkbox event listeners
        ingredientsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const ingredientId = parseInt(e.target.dataset.ingredientId);
                if (e.target.checked) {
                    this.selectedIngredients.add(ingredientId);
                } else {
                    this.selectedIngredients.delete(ingredientId);
                }
                this.updateSelectedCount();
            });
        });

        document.getElementById('ingredientsResult').classList.remove('hidden');
    }

    updateSelectedCount() {
        const count = this.selectedIngredients.size;
        document.getElementById('selectedCount').textContent = count;
        document.getElementById('addAllBtn').disabled = count === 0;
    }

    async addSelectedIngredients() {
        if (this.selectedIngredients.size === 0) return;

        const selectedItems = this.currentIngredients.filter(ing => 
            this.selectedIngredients.has(ing.id)
        );

        for (const ingredient of selectedItems) {
            await this.addToCart({
                name: ingredient.name,
                quantity: ingredient.amount,
                unit: ingredient.unit,
                price: 0, // Price to be set by matching supplier items
                fromIngredients: true,
                dishName: document.getElementById('dishName').textContent
            });
        }

        this.selectedIngredients.clear();
        this.updateSelectedCount();
        document.querySelectorAll('#ingredientsList input[type="checkbox"]').forEach(cb => cb.checked = false);
        
        alert(`Added ${selectedItems.length} ingredients to cart!`);
        this.updateCartCount();
    }

    async addToCart(item) {
        try {
            const cartItem = {
                vendor_id: this.currentUser.id,
                item_name: item.name,
                quantity: item.quantity || 1,
                price: item.price || 0,
                unit: item.unit,
                from_ingredients: item.fromIngredients || false,
                dish_name: item.dishName,
                item_id: item.id
            };

            await supabase.database.from('cart_items').insert(cartItem);
            await this.loadCart();
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    }

    async loadCart() {
        try {
            this.cart = await supabase.database
                .from('cart_items')
                .select()
                .eq('vendor_id', this.currentUser.id)
                .execute();

            this.updateCartCount();
            this.displayCart();
        } catch (error) {
            console.error('Error loading cart:', error);
        }
    }

    updateCartCount() {
        document.getElementById('cartCount').textContent = this.cart.length;
    }

    displayCart() {
        const cartItems = document.getElementById('cartItems');
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (this.cart.length === 0) {
            cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        } else {
            cartItems.innerHTML = this.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.item_name}</h4>
                        <p>Quantity: ${item.quantity} ${item.unit}</p>
                        ${item.from_ingredients ? `<p>From dish: ${item.dish_name}</p>` : ''}
                        <p class="cart-item-price">₹${item.price}</p>
                    </div>
                    <button class="btn btn-danger btn-small" onclick="vendorDashboard.removeFromCart('${item.id}')">
                        Remove
                    </button>
                </div>
            `).join('');
        }

        document.getElementById('cartTotal').textContent = total.toFixed(2);
    }

    async removeFromCart(itemId) {
        try {
            await supabase.database
                .from('cart_items')
                .delete()
                .eq('id', itemId)
                .execute();

            await this.loadCart();
        } catch (error) {
            console.error('Error removing from cart:', error);
        }
    }

    async loadSupplierItems() {
        try {
            const items = await supabase.database
                .from('items')
                .select(`
                    *,
                    user_profiles!supplier_id (name, business_name)
                `)
                .eq('in_stock', true)
                .execute();

            this.displaySupplierItems(items);
        } catch (error) {
            console.error('Error loading supplier items:', error);
        }
    }

    displaySupplierItems(items) {
        const itemsGrid = document.getElementById('itemsGrid');
        
        itemsGrid.innerHTML = items.map(item => `
            <div class="item-card">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p class="item-category">${item.category}</p>
                    <p class="item-supplier">By: ${item.user_profiles?.business_name || item.user_profiles?.name}</p>
                    <p class="item-price">₹${item.price}/${item.unit}</p>
                </div>
                <button class="btn btn-primary" onclick="vendorDashboard.addToCart({
                    id: '${item.id}',
                    name: '${item.name}',
                    price: ${item.price},
                    unit: '${item.unit}'
                })">
                    Add to Cart
                </button>
            </div>
        `).join('');
    }

    async checkout() {
        if (this.cart.length === 0) {
            alert('Your cart is empty');
            return;
        }

        if (confirm('Place order for all items in cart?')) {
            try {
                // Group cart items by supplier
                const itemsBySupplier = {};
                this.cart.forEach(item => {
                    if (!itemsBySupplier[item.supplier_id || 'unknown']) {
                        itemsBySupplier[item.supplier_id || 'unknown'] = [];
                    }
                    itemsBySupplier[item.supplier_id || 'unknown'].push(item);
                });

                // Create orders for each supplier
                for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
                    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                    const order = await supabase.database.from('orders').insert({
                        vendor_id: this.currentUser.id,
                        supplier_id: supplierId !== 'unknown' ? supplierId : null,
                        total_amount: totalAmount,
                        status: 'pending'
                    });

                    // Add order items
                    for (const item of items) {
                        await supabase.database.from('order_items').insert({
                            order_id: order[0].id,
                            item_name: item.item_name,
                            quantity: item.quantity,
                            price: item.price,
                            unit: item.unit,
                            from_ingredients: item.from_ingredients,
                            dish_name: item.dish_name
                        });
                    }
                }

                // Clear cart
                await supabase.database
                    .from('cart_items')
                    .delete()
                    .eq('vendor_id', this.currentUser.id)
                    .execute();

                await this.loadCart();
                alert('Order placed successfully!');
                this.switchTab('orders');
            } catch (error) {
                console.error('Error placing order:', error);
                alert('Failed to place order');
            }
        }
    }

    async loadOrders() {
        try {
            const orders = await supabase.database
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .eq('vendor_id', this.currentUser.id)
                .execute();

            this.displayOrders(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    displayOrders(orders) {
        const ordersList = document.getElementById('ordersList');
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<div class="empty-orders">No orders found</div>';
            return;
        }

        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <h4>Order #${order.id.substring(0, 8)}</h4>
                    <span class="order-status status-${order.status}">${order.status}</span>
                </div>
                <div class="order-details">
                    <p>Total: ₹${order.total_amount}</p>
                    <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
                    <p>Items: ${order.order_items?.length || 0}</p>
                </div>
            </div>
        `).join('');
    }

    showNoResults() {
        document.getElementById('ingredientsList').innerHTML = 
            '<div class="no-results">No ingredients found for this dish. Try a different search term.</div>';
        document.getElementById('ingredientsResult').classList.remove('hidden');
    }

    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        }
    }
}

// Initialize dashboard when page loads
let vendorDashboard;
document.addEventListener('DOMContentLoaded', () => {
    vendorDashboard = new VendorDashboard();
});
