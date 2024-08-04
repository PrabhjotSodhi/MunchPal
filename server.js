const express = require('express');
const axios = require('axios');
const path = require('path');
const { searchProductByName } = require('./supabase_script');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(__dirname + "/public/"));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve dietary requirements JSON
app.get('/dietary', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dietary.json'));
});

app.get('/supabase', async (req, res) => {
    const query = req.query.product; // Extract the query parameter from the request
    try {
        // Call searchProductByName to get products based on the query
        const products = await searchProductByName(query);
        if (!products || products.length === 0) {
            return res.status(404).send('No products found.');
        }

        res.json(products); // Send the found products as a JSON response
    } catch (error) {
        console.error('Error in /supabase endpoint:', error);
        res.status(500).send('Error occurred while processing your request.');
    }
})

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
