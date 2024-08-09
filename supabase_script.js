import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

console.log('supabase_script.js is loaded');

// Initialize the Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define the function to search for products by name
export async function searchProductByName(query) {
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
            const { data, error: imageError } = await supabase
                .storage
                .from('product-images') // Assuming the bucket name is 'product-images'
                .getPublicUrl(imagePath);

            if (imageError) {
                console.error('Error fetching product image:', imageError);
                return { ...product, image: null }; // Return product without image if there's an error
            }

            return { ...product, image: data.publicUrl }; // Append the image URL to the product object
        }));

        return productsWithImages;
    } catch (error) {
        console.error('Error searching for products:', error);
        return null;
    }
}

// Function to filter ingredients based on dietary requirements
export async function highlightIngredientsAI(ingredients, dietaryRequirements) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const structure = z.object({
        no: z.array(z.string()).optional(),
        maybe: z.array(z.string()).optional(),
    });

    try {
        const prompt = `Evaluate if the ingredient list "${ingredients}" is compliant with the following dietary requirements: ${dietaryRequirements}. Provide valid JSON output of 'no' and 'maybe' with ingredients categorized accordingly.`;
        
        const response = await openai.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06", 
            response_format: zodResponseFormat(structure, "dietary_exclusion"),
            messages: [
                { role: "system", content: `Categorize the ingredients into 'no' or 'maybe' based on the user's dietary needs.` },
                { role: "user", content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 1024,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        });

        const parsedResponse = response.choices[0].message.parsed;
        console.log('Highlighting Response:', parsedResponse); // Debug log
        return parsedResponse;
    } catch (error) {
        console.error('Error querying OpenAI:', error);
        return { no: [], maybe: [] };
    }
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
