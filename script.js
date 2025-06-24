document.addEventListener('DOMContentLoaded', () => {
    // Open Food Facts API base URL
    const API_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
    
    // Element to display cart item count in the navbar
    const cartCountSpan = document.getElementById('cart-item-count');
    
    // Load cart data from LocalStorage, or initialize as an empty array
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // --- Helper Functions ---

    /**
     * Updates the total item count displayed in the navbar cart icon.
     */
    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCountSpan) {
            cartCountSpan.textContent = totalItems;
        }
    }

    /**
     * Saves the current cart array to LocalStorage.
     * Also calls updateCartCount to refresh the display.
     */
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
    }

    /**
     * Generates a random price for a product.
     * Prices are purely for demonstration as the API doesn't provide them.
     * @returns {string} Formatted price string (e.g., "15.75")
     */
    function getRandomPrice() {
        const min = 1.99;
        const max = 29.99;
        return (Math.random() * (max - min) + min).toFixed(2);
    }

    /**
     * Creates an HTML product card element for a given product object.
     * @param {object} product - The product object from the Open Food Facts API.
     * @returns {HTMLElement} The created product card div.
     */
    function createProductCard(product) {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');

        // Basic validation and fallback for product data
        const productName = product.product_name || 'Unknown Product';
        const brand = product.brands || 'Unknown Brand';
        // Use an appropriate image if available, otherwise a placeholder
        const imageUrl = product.image_url || product.image_small_url || 'https://placehold.co/150x150/e9ecef/495057?text=No+Image';

        // Use the product 'code' as a unique ID, or generate a random one if not available
        // This is important for consistency when adding to cart.
        const productId = product.code || `prod-${Math.random().toString(36).substring(2, 11)}`;

        const price = getRandomPrice(); // Generate random price for display

        productCard.innerHTML = `
            <img src="${imageUrl}" alt="${productName}" onerror="this.onerror=null;this.src='https://placehold.co/150x150/e9ecef/495057?text=No+Image';">
            <h3>${productName}</h3>
            <p class="brand">${brand}</p>
            <p class="price">$${price}</p>
            <button class="btn add-to-cart-btn"
                    data-id="${productId}"
                    data-name="${productName}"
                    data-price="${price}"
                    data-image="${imageUrl}">Add to Cart</button>
        `;
        return productCard;
    }

    /**
     * Adds a product to the shopping cart or increases its quantity if already present.
     * @param {string} productId - Unique ID of the product.
     * @param {string} name - Name of the product.
     * @param {string} price - Price of the product (as string, will be parsed to float).
     * @param {string} image - URL of the product image.
     */
    function addToCart(productId, name, price, image) {
        const existingItemIndex = cart.findIndex(item => item.id === productId);

        if (existingItemIndex > -1) {
            // Product already in cart, increment quantity
            cart[existingItemIndex].quantity++;
        } else {
            // Add new product to cart
            cart.push({ id: productId, name, price: parseFloat(price), image, quantity: 1 });
        }
        saveCart(); // Save updated cart to LocalStorage
        // Using a custom message instead of alert()
        showMessage(`${name} added to cart!`, 'success');
    }

    /**
     * Displays a temporary message to the user.
     * @param {string} message - The message to display.
     * @param {string} type - 'success' or 'error' to style the message.
     */
    function showMessage(message, type) {
        const messageBox = document.createElement('div');
        messageBox.classList.add('app-message', type);
        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        // Animate in
        setTimeout(() => {
            messageBox.style.opacity = '1';
            messageBox.style.transform = 'translateX(-50%) translateY(-10px)';
        }, 10); // Small delay to allow CSS transition

        // Animate out and remove
        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.style.transform = 'translateX(-50%) translateY(20px)';
            messageBox.addEventListener('transitionend', () => {
                messageBox.remove();
            });
        }, 3000); // Message visible for 3 seconds
    }

    // Hamburger menu toggle for mobile navigation
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.navbar nav');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // --- Homepage Logic (index.html) ---
    if (document.querySelector('.hero-section')) {
        const featuredProductsGrid = document.getElementById('featured-products-grid');

        /**
         * Fetches and displays featured products on the homepage.
         */
        async function fetchFeaturedProducts() {
            try {
                // Fetching 'snacks' for featured products, requesting 15 items to ensure at least 4 valid ones
                const response = await fetch(`${API_URL}?search_terms=snacks&search_simple=1&action=process&json=1&page_size=15`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                // Filter out products that don't have a name, image, or brand
                const products = data.products.filter(p => p.product_name && p.image_url && p.brands);

                // Display only the first 4 valid featured products
                if (products.length === 0) {
                    featuredProductsGrid.innerHTML = '<p style="text-align: center; color: var(--text-color);">No featured products found.</p>';
                    return;
                }

                products.slice(0, 4).forEach(product => {
                    const productCard = createProductCard(product);
                    featuredProductsGrid.appendChild(productCard);
                });

                // Add event listeners for "Add to Cart" buttons
                document.querySelectorAll('.add-to-cart-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const { id, name, price, image } = e.target.dataset;
                        addToCart(id, name, price, image);
                    });
                });

            } catch (error) {
                console.error("Error fetching featured products:", error);
                featuredProductsGrid.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Failed to load featured products. Please check your internet connection or try again later.</p>';
            }
        }
        fetchFeaturedProducts();
    }

    // --- Products Page Logic (products.html) ---
    if (document.querySelector('.products-page-main')) {
        const allProductsGrid = document.getElementById('all-products-grid');
        const productsSection = document.querySelector('.products-page-main .container');

        /**
         * Displays or hides a loading spinner.
         * @param {boolean} show - True to show the spinner, false to hide.
         */
        function toggleLoadingSpinner(show) {
            let spinnerContainer = document.getElementById('loading-spinner-container');
            if (!spinnerContainer) {
                spinnerContainer = document.createElement('div');
                spinnerContainer.id = 'loading-spinner-container';
                spinnerContainer.classList.add('loading-spinner');
                spinnerContainer.innerHTML = '<div class="spinner"></div><p style="margin-left: 10px; font-weight: bold; color: var(--text-color);">Loading products...</p>';
                productsSection.insertBefore(spinnerContainer, allProductsGrid); // Insert before the grid
            }
            spinnerContainer.style.display = show ? 'flex' : 'none';
        }

        /**
         * Fetches and displays a larger set of products on the products page.
         */
        async function fetchAllProducts() {
            toggleLoadingSpinner(true); // Show loading spinner

            try {
                // Fetch 'groceries' with a large page size to maximize results
                const response = await fetch(`${API_URL}?search_terms=groceries&search_simple=1&action=process&json=1&page_size=100`); // Increased page size
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                // Filter out products that don't have essential information
                // Relaxing filtering slightly: allow products without 'brands' if product_name and image_url exist
                const products = data.products.filter(p => p.product_name && p.image_url);

                // Display up to 20 products
                const productsToDisplay = products.slice(0, Math.min(products.length, 20));

                if (productsToDisplay.length === 0) {
                    allProductsGrid.innerHTML = '<p style="text-align: center; color: var(--text-color);">No products found. Please try a different search term or check API status.</p>';
                } else {
                    allProductsGrid.innerHTML = ''; // Clear previous content
                    productsToDisplay.forEach(product => {
                        const productCard = createProductCard(product);
                        allProductsGrid.appendChild(productCard);
                    });
                }

                // Add event listeners for "Add to Cart" buttons
                document.querySelectorAll('.add-to-cart-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const { id, name, price, image } = e.target.dataset;
                        addToCart(id, name, price, image);
                    });
                });

            } catch (error) {
                console.error("Error fetching all products:", error);
                allProductsGrid.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Failed to load products. Please check your internet connection or try again later.</p>';
            } finally {
                toggleLoadingSpinner(false); // Hide loading spinner regardless of success or failure
            }
        }
        fetchAllProducts();
    }

    // --- Shopping Cart Page Logic (cart.html) ---
    if (document.querySelector('.cart-page-main')) {
        const cartItemsContainer = document.getElementById('cart-items-container');
        const cartTotalSpan = document.getElementById('cart-total');
        const cartTotalSubtotalSpan = document.getElementById('cart-total-subtotal'); // New element for subtotal
        const emptyCartMessage = document.getElementById('empty-cart-message');
        const checkoutButton = document.querySelector('.btn-checkout'); // Get the checkout button

        /**
         * Renders all items currently in the shopping cart.
         */
        function renderCart() {
            cartItemsContainer.innerHTML = ''; // Clear existing items
            const SHIPPING_COST = 5.00; // Define a fixed shipping cost

            if (cart.length === 0) {
                emptyCartMessage.style.display = 'block'; // Show "Your cart is empty" message
                cartTotalSubtotalSpan.textContent = '0.00';
                cartTotalSpan.textContent = '0.00'; // Reset total price
                checkoutButton.disabled = true; // Disable checkout button
                return;
            } else {
                emptyCartMessage.style.display = 'none'; // Hide empty cart message
                checkoutButton.disabled = false; // Enable checkout button
            }

            let subtotal = 0;
            cart.forEach(item => {
                const cartItemDiv = document.createElement('div');
                cartItemDiv.classList.add('cart-item');
                const itemTotalPrice = (item.price * item.quantity).toFixed(2);
                subtotal += parseFloat(itemTotalPrice);

                cartItemDiv.innerHTML = `
                    <div class="cart-item-details">
                        <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null;this.src='https://placehold.co/80x80/e9ecef/495057?text=No+Image';">
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <p>$${item.price.toFixed(2)} x ${item.quantity} = <strong>$${itemTotalPrice}</strong></p>
                        </div>
                    </div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                        <input type="number" class="quantity-input" data-id="${item.id}" value="${item.quantity}" min="1" readonly>
                        <button class="quantity-btn increase" data-id="${item.id}">+</button>
                        <button class="remove-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i> Remove</button>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItemDiv);
            });

            const total = (subtotal + SHIPPING_COST).toFixed(2);
            cartTotalSubtotalSpan.textContent = subtotal.toFixed(2);
            cartTotalSpan.textContent = total;

            // Add event listeners for cart item controls after rendering
            cartItemsContainer.querySelectorAll('.remove-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const idToRemove = e.target.dataset.id;
                    cart = cart.filter(item => item.id !== idToRemove); // Remove item from cart array
                    saveCart(); // Save updated cart
                    renderCart(); // Re-render cart
                });
            });

            cartItemsContainer.querySelectorAll('.quantity-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const idToUpdate = e.target.dataset.id;
                    const item = cart.find(item => item.id === idToUpdate);
                    if (item) {
                        if (e.target.classList.contains('increase')) {
                            item.quantity++;
                        } else if (e.target.classList.contains('decrease')) {
                            if (item.quantity > 1) {
                                item.quantity--;
                            } else {
                                // If quantity becomes 0, remove the item entirely
                                cart = cart.filter(i => i.id !== idToUpdate);
                            }
                        }
                        saveCart(); // Save updated cart
                        renderCart(); // Re-render cart
                    }
                });
            });
        }
        renderCart(); // Initial render of cart when page loads

        // Add event listener for the "Proceed to Checkout" button
        if (checkoutButton) {
            checkoutButton.addEventListener('click', () => {
                if (cart.length > 0) {
                    // Simulate checkout success
                    showMessage('Checkout successful! Your order has been placed.', 'success');
                    cart = []; // Clear the cart
                    saveCart(); // Save the empty cart to LocalStorage
                    renderCart(); // Re-render the cart to show it's empty
                    // In a real application, you would typically redirect to an order confirmation page or similar.
                } else {
                    showMessage('Your cart is empty. Please add items before checking out.', 'error');
                }
            });
        }
    }

    // --- Contact Page Logic (contact.html) ---
    if (document.getElementById('contact-form')) {
        const contactForm = document.getElementById('contact-form');
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const messageInput = document.getElementById('message');
        const nameError = document.getElementById('name-error');
        const emailError = document.getElementById('email-error');
        const messageError = document.getElementById('message-error');
        const formSuccessMessage = document.getElementById('form-success-message');

        /**
         * Validates the contact form fields.
         * @returns {boolean} True if all fields are valid, false otherwise.
         */
        function validateForm() {
            let isValid = true;

            // Name validation
            if (nameInput.value.trim() === '') {
                nameError.textContent = 'Name is required.';
                isValid = false;
            } else {
                nameError.textContent = '';
            }

            // Email validation using a regex pattern
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailInput.value.trim() === '') {
                emailError.textContent = 'Email is required.';
                isValid = false;
            } else if (!emailPattern.test(emailInput.value.trim())) {
                emailError.textContent = 'Please enter a valid email address.';
                isValid = false;
            } else {
                emailError.textContent = '';
            }

            // Message validation
            if (messageInput.value.trim() === '') {
                messageError.textContent = 'Message is required.';
                isValid = false;
            } else {
                messageError.textContent = '';
            }

            return isValid;
        }

        // Add submit event listener to the form
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent default browser form submission

            if (validateForm()) {
                // In a real application, this is where you would send the form data
                // to a backend server (e.g., using fetch() or XMLHttpRequest).
                // For this client-side only example, we just simulate success.
                console.log('Form submitted successfully!');
                console.log('Name:', nameInput.value);
                console.log('Email:', emailInput.value);
                console.log('Message:', messageInput.value);

                // Show success message and clear form fields
                formSuccessMessage.style.display = 'block';
                contactForm.reset(); // Clears all form fields
                
                // Hide the success message after 5 seconds
                setTimeout(() => {
                    formSuccessMessage.style.display = 'none';
                }, 5000);
            }
        });

        // Add real-time validation feedback as user types
        nameInput.addEventListener('input', validateForm);
        emailInput.addEventListener('input', validateForm);
        messageInput.addEventListener('input', validateForm);
    }

    // Initial update of cart count on all pages when the DOM is ready
    updateCartCount();
});
