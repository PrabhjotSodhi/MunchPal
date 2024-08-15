import express from 'express';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { highlightIngredientsAI, searchProductByName } from './supabase_script.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    try {
        const products = await searchProductByName(req.query.query);

        if (!products || products.length === 0) {
            return res.status(404).json({ message: 'No products found :(' });
        }

        res.json(products);
    } catch (error) {
        console.error('Error in /supabase endpoint:', error);
        res.status(500).json({ message: 'Error occurred while processing your request.' });
    }
});

app.get('/highlight', async (req, res) => {
    try {
        const highlightedProducts = await highlightIngredientsAI(req.query.ingredients, req.query.dietary);
        if (!highlightedProducts.no.length && !highlightedProducts.maybe.length) {
            return res.status(404).json({ message: 'No highlighted products found.' });
        }
        res.json(highlightedProducts);
    } catch (error) {
        console.error('Error in /highlight endpoint:', error);
        res.status(500).json({ message: 'Error occurred while processing your request.' });
    }
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
