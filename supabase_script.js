require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");

// Initialize the Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define the function to search for products by name
async function searchProductByName(query) {
    try {
        // Perform a case-insensitive search on the 'name' column for the query string
        const { data, error } = await supabase
            .from('products')
            .select('id, name, ingredients, category')
            .ilike('name', query, {config: 'english', type: 'plain'})
            .range(0, 9);

        if (error) throw error;

        const productsWithImages = await Promise.all(data.map(async (product) => {
            const imagePath = `${product.id}.jpg`; // Assuming the image name format is "ID.jpg"
            const { publicURL, error: imageError } = supabase
                .storage
                .from('product-images') // Assuming the bucket name is 'product-images'
                .getPublicUrl(imagePath);

            if (imageError) {
                console.error('Error fetching product image:', imageError);
                return { ...product, image: null }; // Return product without image if there's an error
            }

            return { ...product, image: publicURL }; // Append the image URL to the product object
        }));

        return productsWithImages;
    } catch (error) {
        console.error('Error searching for products:', error);
        return null;
    }
}

// Function to filter ingredients based on dietary requirements
async function highlightIngredientsAI(ingredients, dietaryRequirements) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    console.log(ingredients)

    const structure = z.object({
        no: z.array(z.object({
            ingredient: z.string(),
            reason: z.string(),
        })).optional(),
        maybe: z.array(z.object({
            ingredient: z.string(),
            reason: z.string(),
        })).optional(),
    });

    try {
        const example = {
            "no": [
                {
                    "ingredient": "Worcestershire Sauce",
                    "reason": "Contains anchovies, which are not vegetarian."
                },
                {
                    "ingredient": "Bacon",
                    "reason": "Derived from pork, not suitable for vegetarians."
                }
            ],
            "maybe": [
                {
                    "ingredient": "Cheddar Cheese",
                    "reason": "May contain rennet, check the source of rennet used"
                }
            ]
        };

        const prompt = `Evaluate if the ingredient list "${ingredients}" is compliant with the following dietary requirements: ${dietaryRequirements}. Consider common exceptions and ambiguities. Provide valid JSON output of column 'no' or 'maybe' with a list of JSON objects containing the ingredient as key and one-sentence explanation as value.`;
        
        const response = await openai.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06", // Use an appropriate model
            response_format: zodResponseFormat(structure, "dietary_exclusion"),
            messages: [
                { role: "system", content: `Categorize the ingredients into 'no' or 'maybe' based on the user's dietary needs. The data schema should be like this: ${JSON.stringify(example)}` },
                { role: "user", content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 1024,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        });

        const textResponse = response.choices[0].message.parsed;
        return textResponse;
    } catch (error) {
        console.error('Error querying OpenAI:', error);
    }
    return {};
}

async function searchAndHighlight() {
    const products = await searchProductByName("Cadbury Chocolate Caramilk");
    
    if (products && products.length > 0) {
        const result = await highlightIngredientsAI(products[0].ingredients, "vegetarian");
        
        console.log(result); // This should log the result instead of a pending promise
    } else {
        console.log('No products found.');
    }
}

module.exports = { searchProductByName, highlightIngredientsAI };