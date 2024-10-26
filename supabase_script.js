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

// distance calculation based on how many transforms needed fro string a = string b
// returns a word similarity score - this ingredient might equal other ingredients -> refined and alias of different ingredients
// unique data asset - seperate from the main function, recognise more things and provide more information to the model


// Function to filter ingredients based on dietary requirements
// LangGraph - automated governance, automated responses
export async function highlightIngredientsAI(ingredients, dietaryRequirements) {
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const initialResponse = await openai.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            response_format: zodResponseFormat(
                z.object({
                    no: z.array(z.string()).optional(),
                    maybe: z.array(z.string()).optional(),
                }),
                "dietary_exclusion"
            ),
            messages: [
                { role: "system", content: `Categorize ingredients into 'no' or 'maybe' for the user's dietary needs.` },
                { role: "user", content: `Evaluate if the ingredient list "${ingredients}" complies with the dietary requirements: ${dietaryRequirements}. Provide valid JSON output in the format { "no": [], "maybe": [] } with ingredients categorized accordingly.` }
            ],
            temperature: 0.2,
            max_tokens: 1024,
        });
        
        const refinedResponse = await openai.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            response_format: zodResponseFormat(
                z.object({
                    no: z.array(z.string()).optional(),
                    maybe: z.array(z.string()).optional(),
                }),
                "dietary_exclusion"
            ),
            messages: [
                { role: "system", content: `You are an assistant helping to verify dietary compliance categorization. Items in "no" should be highlighted in red, and items in "maybe" in yellow.` },
                { role: "user", content: `Given the following initial categorization: ${JSON.stringify(initialResponse.choices[0]?.message?.parsed)}, refine this result based on these dietary requirements: ${dietaryRequirements}. Clearly exclude ingredients that are obviously compliant, like "water" in a vegan diet. Ensure all ingredients are correctly categorized as 'no' or 'maybe' with the specified highlighting format.` }
            ],
            temperature: 0.2,
            max_tokens: 256,
        });
        
        return refinedResponse.choices[0]?.message?.parsed || { no: [], maybe: [] };
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
