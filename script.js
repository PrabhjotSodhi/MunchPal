function searchProduct() {
    const searchInput = document.getElementById('product-search').value;
    const dietaryOptions = document.getElementsByName('diet');
    let selectedDiet = '';

    for (let i = 0; i < dietaryOptions.length; i++) {
        if (dietaryOptions[i].checked) {
            selectedDiet = dietaryOptions[i].value;
            break;
        }
    }

    // Sample static data (In a real scenario, this data would be fetched from a database)
    const products = {
        "bread": {
            "ingredients": ["wheat flour", "water", "yeast", "salt"],
            "gluten-free": false,
            "vegan": true,
            "nut-free": true
        },
        "peanut butter": {
            "ingredients": ["peanuts", "salt", "sugar"],
            "gluten-free": true,
            "vegan": true,
            "nut-free": false
        }
    };

    let resultHTML = '<ul>';

    if (products[searchInput.toLowerCase()]) {
        const product = products[searchInput.toLowerCase()];
        resultHTML += `<li><strong>Ingredients:</strong> ${product.ingredients.join(', ')}</li>`;

        if (!product[selectedDiet]) {
            resultHTML += `<li style="color: red;">This product is not ${selectedDiet.replace('-', ' ')}.</li>`;
        } else {
            resultHTML += `<li style="color: green;">This product is ${selectedDiet.replace('-', ' ')}.</li>`;
        }
    } else {
        resultHTML += '<li>No results found.</li>';
    }

    resultHTML += '</ul>';
    document.getElementById('results').innerHTML = resultHTML;
}
