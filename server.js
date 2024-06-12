const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve dietary requirements JSON
app.get('/dietary', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dietary.json'));
});

app.get('/search', async (req, res) => {
    const product = req.query.product;
    try {
        const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
            params: {
                search_terms: product,
                search_simple: 1,
                action: 'process',
                json: 1,
                countries: 'New Zealand'
            }
        });

        const products = response.data.products.map(product => ({
            name: product.product_name,
            image: product.image_url,
            ingredients: product.ingredients_text
        }));

        res.json(products);
    } catch (error) {
        console.error('Error fetching product data:', error);
        res.status(500).send('Error occurred while fetching product data.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
