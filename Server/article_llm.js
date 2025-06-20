const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

async function generateArticle({ prompt, language, level, length }) {
    const fullPrompt = `
        Write an article in ${language} at CEFR level ${level} with a ${length.toLowerCase()} length.
        Topic: ${prompt}
        Return only the article text.
    `;

    const modelId = process.env.BEDROCK_MODEL_ID || "mistral.mixtral-8x7b-instruct-v0:1";
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

    const body = JSON.stringify({
        prompt: fullPrompt,
        max_tokens: 1024,
        temperature: 0.7,
        top_k: 200,
        top_p: 0.9,
        stop: ["\n\nHuman:"]
    });

    const command = new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body
    });

    try {
        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return responseBody.outputs[0].text || "";
    } catch (err) {
        console.error("AWS Bedrock LLM error:", err);
        throw new Error("Failed to generate article from LLM.");
    }
}

module.exports = { generateArticle };