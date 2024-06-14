// public/script.js

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

        if (vegan && dietary.vegan.avoid.some(item => ingredient.toLowerCase().includes(item))) {
            style = 'color: red;';
        } else if (vegetarian && dietary.vegetarian.avoid.some(item => ingredient.toLowerCase().includes(item))) {
            style = 'color: yellow;';
        } else if (glutenFree && dietary['gluten-free'].avoid.some(item => ingredient.toLowerCase().includes(item))) {
            style = 'color: yellow;';
        }

        return `<span style="${style}">${ingredient}</span>`;
    }).join(', ');
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
