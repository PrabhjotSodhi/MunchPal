// public/script.js
const { searchProductByName, highlightIngredientsAI } = require('./supabase_script.js');
let dietary = {};

async function fetchDietary() {
    const response = await fetch('/dietary');
    dietary = await response.json();
}

function highlightIngredients(ingredients, vegan, vegetarian, glutenFree) {
    if (!ingredients) {
        return "No ingredients listed";
    }

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
    const productSearch = document.getElementById('product-search').value;
    const dietary = document.getElementById('dietary').value;
    const products = await searchProductByName(productSearch);

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    await Promise.all(products.map(async (product) => {
        const productDiv = document.createElement('div');
        productDiv.classList.add('product');
        const highlightedIngredients = await highlightIngredientsAI(product.ingredients, dietary);

        productDiv.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <div>
                <h2>${product.name}</h2>
                <p><strong>Ingredients:</strong> ${highlightedIngredients}</p>
            </div>
        `;

        resultsDiv.appendChild(productDiv);
    }));
}

async function searchProduct() {
    const productSearch = document.getElementById('product-search').value;
    const vegan = document.getElementById('vegan').checked;
    const vegetarian = document.getElementById('vegetarian').checked;
    const glutenFree = document.getElementById('gluten-free').checked;

    const response = await fetch(`/search?product=${productSearch}`);
    const products = await response.json();

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    products.forEach(product => {
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
    });
}

window.onload = () => {
    fetchDietary();
}
