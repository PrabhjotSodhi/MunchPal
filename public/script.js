

console.log('Script loaded successfully');  // Add this line to verify the script is running

let dietary = {};

async function fetchDietary() {
    console.log('fetchDietary called');  // Add logging here to verify the function is called
    const response = await fetch('/dietary');
    dietary = await response.json();
}

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

        return `<span style="${style}">${ingredient}</span>`;
    }).join(', ');
}

async function searchProductOnSupabase() {
    console.log('searchProductOnSupabase called');
    const productSearch = document.getElementById('product-search').value;
    const dietary = document.getElementById('dietary').value;
    
    try {
        const response = await fetch(`/supabase?query=${productSearch}`);
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            const products = await response.json();
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '';

            await Promise.all(products.map(async (product) => {
                const productDiv = document.createElement('div');
                productDiv.classList.add('product');
                
                const highlightedIngredientsResponse = await fetch(`/highlight?ingredients=${encodeURIComponent(product.ingredients.join(', '))}&dietary=${encodeURIComponent(dietary)}`);
                const highlightedIngredientsContentType = highlightedIngredientsResponse.headers.get('content-type');
                
                let highlightedIngredients = { no: [], maybe: [] };
                if (highlightedIngredientsContentType && highlightedIngredientsContentType.includes('application/json')) {
                    const highlightedData = await highlightedIngredientsResponse.json();
                    highlightedIngredients = highlightedData; 
                    console.log('Highlighted Ingredients:', highlightedIngredients); // Debug log
                } else {
                    console.error('Unexpected response format for highlighted ingredients');
                }

                let ingredientsHTML = product.ingredients.map(ingredient => {
                    let style = '';

                    if (highlightedIngredients.no.includes(ingredient)) {
                        style = 'color: #e84c3d;'; // Red for "no"
                    } else if (highlightedIngredients.maybe.includes(ingredient)) {
                        style = 'color: #f39c11;'; // Yellow for "maybe"
                    }

                    return `<span style="${style}">${ingredient}</span>`;
                }).join(', ');

                productDiv.innerHTML = `
                    <img src="${product.image}" alt="${product.name}">
                    <div>
                        <h2>${product.name}</h2>
                        <p><strong>Ingredients:</strong> ${ingredientsHTML}</p>
                    </div>
                `;

                resultsDiv.appendChild(productDiv);
            }));
        } else {
            const text = await response.text();
            console.error('Expected JSON but got:', text);
            document.getElementById('results').innerHTML = `<p>${text}</p>`;
        }
    } catch (error) {
        console.error('Error fetching products from Supabase:', error);
        document.getElementById('results').innerHTML = `<p>Error fetching products.</p>`;
    }
}




async function searchProduct() {
    console.log('searchProduct called');  // Add logging here to verify the function is called
    const productSearch = document.getElementById('product-search').value;
    const vegan = document.getElementById('vegan').checked;
    const vegetarian = document.getElementById('vegetarian').checked;
    const glutenFree = document.getElementById('gluten-free').checked;

    const response = await fetch(`/search?product=${productSearch}`);
    const products = await response.json();

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    products.forEach(product => {
        if (product.ingredients) {
            const productDiv = document.createElement('div');
            productDiv.classList.add('product');

            productDiv.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <div>
                    <h2>${product.name}</h2>
                    <p><strong>Ingredients:</strong> ${highlightIngredients(product.ingredients, vegan, vegetarian, glutenFree)}</p>
                </div>
            `;

            resultsDiv.appendChild(productDiv);
        }
    });
}

window.onload = () => {
    fetchDietary();
    console.log('Window loaded, setting up event listeners...');
    // Check if the element exists before attaching the event listener
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
