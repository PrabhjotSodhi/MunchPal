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
        const { data, error } = await supabase
            .from('products')
            .select('id, name, ingredients, category')
            .textSearch('name', query, { type: 'plain', config: 'english' })
            .range(0, 9);

        if (error) throw error;

        if (!data || data.length === 0) {
            return [];  // Return an empty array if no products found
        }

        return await Promise.all(data.map(async (product) => {
            const { data: imageData, error: imageError } = await supabase
                .storage
                .from('product-images')
                .getPublicUrl(`${product.id}.jpg`);
            
            return { ...product, image: imageError ? null : imageData.publicUrl };
        }));
    } catch (error) {
        console.error('Error searching for products:', error);
        return null;
    }
}

// Function to filter ingredients based on dietary requirements
export async function highlightIngredientsAI(ingredients, dietaryRequirements) {
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            response_format: zodResponseFormat(
                z.object({
                    no: z.array(z.string()).optional(),
                    maybe: z.array(z.string()).optional(),
                }),
                "dietary_exclusion"
            ),
            messages: [
                { role: "system", content: `Categorize the ingredients into 'no' or 'maybe' based on the user's dietary needs.` },
                { role: "user", content: `Evaluate if the ingredient list "${ingredients}" is compliant with the following dietary requirements: ${dietaryRequirements}. Provide valid JSON output of 'no' and 'maybe' with ingredients categorized accordingly.` }
            ],
            temperature: 0.2,
            max_tokens: 1024,
        });
        
        return response.choices[0]?.message?.parsed || { no: [], maybe: [] };
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
