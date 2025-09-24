// Utility functions for the application

class Utils {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    static formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static generateOrderNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const timestamp = now.getTime().toString().slice(-6);
        
        return `VC${year}${month}${day}${timestamp}`;
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        const re = /^[6-9]\d{9}$/;
        return re.test(phone);
    }

    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Add toast styles if not already added
        if (!document.querySelector('#toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'toast-styles';
            styles.innerHTML = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 6px;
                    color: white;
                    font-weight: 500;
                    z-index: 1001;
                    animation: slideIn 0.3s ease;
                }
                
                .toast-info { background: #3b82f6; }
                .toast-success { background: #10b981; }
                .toast-error { background: #ef4444; }
                .toast-warning { background: #f59e0b; }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Utils.showToast('Copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy: ', err);
            Utils.showToast('Failed to copy', 'error');
        }
    }

    static downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static sanitizeInput(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getStatusColor(status) {
        const colors = {
            pending: '#f59e0b',
            confirmed: '#3b82f6',
            preparing: '#8b5cf6',
            ready: '#10b981',
            delivered: '#059669',
            cancelled: '#ef4444'
        };
        return colors[status] || '#6b7280';
    }

    static groupBy(array, key) {
        return array.reduce((result, currentValue) => {
            (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
            return result;
        }, {});
    }

    static sortBy(array, key, order = 'asc') {
        return array.sort((a, b) => {
            if (order === 'asc') {
                return a[key] > b[key] ? 1 : -1;
            } else {
                return a[key] < b[key] ? 1 : -1;
            }
        });
    }
}

// Make Utils available globally
window.Utils = Utils;
