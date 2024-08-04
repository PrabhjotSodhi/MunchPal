require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

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
            .textSearch('name', `%${query}%`)
            .range(0, 9);

        if (error) throw error;

        // Return the search results
        return data;
    } catch (error) {
        console.error('Error searching for products:', error);
        return null;
    }
}

// Function to filter ingredients based on dietary requirements
async function highlightIngredients(ingredients, dietaryRequirements) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    let no = {};
    let maybe = {};
    try {
        const example = {
            "no": [
                {
                    "Worcestershire Sauce": "Contains anchovies, which are not vegetarian."
                },
                {
                "Bacon": "Derived from pork, not suitable for vegetarians."
                }
            ],
            "maybe": [
              {
                "Cheddar Cheese (10%) (Milk Solids, Salt)": "May contain rennet, check the source of rennet used",
                "Pecorino Cheese (4.8%) (From Milk)": "May contain rennet, check the source of rennet used",
                "Cheese (11%) (Milk Solids, Salt)": "May contain rennet, check the source of rennet used",
                "Cheese Powder (Milk)": "May contain rennet, check the source of rennet used",
                "Cheese (2.3%) (From Milk)": "May contain rennet, check the source of rennet used"
              }
            ]
          }
        const prompt = `Evaluate if the ingredient list "${ingredients}" is compliant with the following dietary requirements: ${dietaryRequirements}. Consider common exceptions and ambiguities. Provide valid JSON output of column 'no' or 'maybe' with a list of JSON objects containing the ingredient as key and one-sentence explanation as value.`;
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125", // Use an appropriate model
            response_format: { type: "json_object" },
            messages: [
                {role: "system", content: `Provide output in valid JSON. the data schema should be like this: ${example}`},
                {role: "user", content: prompt}
            ],
            temperature: 0.2,
            max_tokens: 1024,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        });
        console.log(response.choices[0].finish_reason);
        const textResponse = response.choices[0].message.content;
        return textResponse;
    } catch (error) {
        console.error('Error querying OpenAI:', error);
    }
    return {};
}

// Example usage