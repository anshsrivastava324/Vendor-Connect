// Smooth scrolling and animations
document.addEventListener('DOMContentLoaded', function() {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Scroll animations
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // Add scroll animation classes to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.classList.add('animate-on-scroll');
        card.style.animationDelay = `${index * 0.1}s`;
    });

    // Add scroll animation classes to step elements
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        step.classList.add('animate-on-scroll');
        step.style.animationDelay = `${index * 0.2}s`;
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Button click effects
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Form input animations
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });

    // Password strength checker
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        if (input.name === 'password') {
            const strengthBar = createPasswordStrengthBar();
            input.parentElement.appendChild(strengthBar);
            
            input.addEventListener('input', function() {
                updatePasswordStrength(this.value, strengthBar);
            });
        }
    });

    function createPasswordStrengthBar() {
        const container = document.createElement('div');
        container.className = 'password-strength';
        
        const bar = document.createElement('div');
        bar.className = 'password-strength-bar';
        
        container.appendChild(bar);
        return container;
    }

    function updatePasswordStrength(password, strengthBar) {
        const bar = strengthBar.querySelector('.password-strength-bar');
        let strength = 0;
        
        if (password.length >= 6) strength++;
        if (password.match(/[a-z]/)) strength++;
        if (password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^A-Za-z0-9]/)) strength++;
        
        bar.className = 'password-strength-bar';
        
        if (strength < 3) {
            bar.classList.add('password-strength-weak');
        } else if (strength < 5) {
            bar.classList.add('password-strength-medium');
        } else {
            bar.classList.add('password-strength-strong');
        }
    }

    // Auto-hide messages
    const messages = document.querySelectorAll('.error-message, .success-message');
    messages.forEach(message => {
        if (!message.classList.contains('persistent')) {
            setTimeout(() => {
                message.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    message.remove();
                }, 300);
            }, 5000);
        }
    });
});

// Add ripple effect CSS
const style = document.createElement('style');
style.textContent = `
.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
}

@keyframes ripple-animation {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

.focused {
    transform: scale(1.02);
}
`;
document.head.appendChild(style);
