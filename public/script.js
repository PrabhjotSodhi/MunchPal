

console.log('Script loaded successfully');  // Add this line to verify the script is running

function highlightIngredients(ingredients, vegan, vegetarian, glutenFree) {
    console.log('highlightIngredients called');  // Add logging here to verify the function is called
    const ingredientList = ingredients.split(', ');

    return ingredientList.map(ingredient => {
        let style = '';

        for (let diet of Object.keys(dietary)) {
            if (dietary[diet].avoid.some(item => ingredient.toLowerCase().includes(item))) {
                style = 'color: #e84c3d;';
                break;
            } else if (dietary[diet].maybe.some(item => ingredient.toLowerCase().includes(item))) {
                style = 'color: #f39c11;';
                break;
            }
        }

        return `<span style="${style}; margin: 0; padding: 0;">${ingredient}</span>`;
    }).join(', ');
}

async function searchProductOnSupabase() {
    console.log('searchProductOnSupabase called');
    const productSearch = document.getElementById('product-search').value;
    const dietary = document.getElementById('dietary').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    try {
        const response = await fetch(`/supabase?query=${encodeURIComponent(productSearch)}`);
        const contentType = response.headers.get('content-type');

        // Check if response is OK and of expected content type
        if (!response.ok) {
            const errorMessage = await response.json();
            throw new Error(errorMessage.message || 'Unknown error occurred');
        }
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format');
        }

        const products = await response.json();

        await Promise.all(products.map(async (product) => {
            const highlightResponse = await fetch(`/highlight?ingredients=${encodeURIComponent(product.ingredients.join(', '))}&dietary=${encodeURIComponent(dietary)}`);
            const highlightContentType = highlightResponse.headers.get('content-type');

            const highlightedIngredients = (highlightContentType && highlightContentType.includes('application/json')) 
                ? await highlightResponse.json() 
                : { no: [], maybe: [] };

            const ingredientsHTML = product.ingredients.map(ingredient => {
                const style = highlightedIngredients.no.includes(ingredient) ? 'color: #e84c3d;' : 
                              highlightedIngredients.maybe.includes(ingredient) ? 'color: #f39c11;' : '';
                return `<span style="${style}">${ingredient}</span>`;
            }).join(', ');

            resultsDiv.innerHTML += `
                <div class="product">
                    <img src="${product.image}" alt="${product.name}">
                    <div>
                        <h2>${product.name}</h2>
                        <p><strong>Ingredients:</strong> ${ingredientsHTML}</p>
                    </div>
                </div>
            `;
        }));
    } catch (error) {
        console.error('Error fetching or processing products:', error);
        resultsDiv.innerHTML = `<p>${error.message}</p>`;
    }
}


window.onload = () => {
    console.log('Window loaded, setting up event listeners...');
    const searchButtonSupabase = document.getElementById('search-button-supabase');
    const searchButton = document.getElementById('search-button');
    
    if (searchButtonSupabase) {
        searchButtonSupabase.addEventListener('click', searchProductOnSupabase);
    } else {
        console.error('Element with ID "search-button-supabase" not found.');
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', searchProduct);
    } else {
        console.error('Element with ID "search-button" not found.');
    }
};
