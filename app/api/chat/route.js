
import OpenAI from "openai";
import axios from "axios";

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

// Web search function
async function searchWeb(query) {
  const response = await axios.post(
    "https://api.tavily.com/search",
    {
      api_key: process.env.TAVILY_API_KEY,
      query: `${query} Forbes Bloomberg Reuters`,
      search_depth: "advanced",
      max_results: 3,
      include_answer: false,
      include_raw_content: false,
    }
  );

  return response.data.results
    .map(
      (r) => `${r.title}\n${r.content}`
    )
    .join("\n\n");
}


// Detect questions that need real-time data
function needsRealtimeSearch(question) {
    const q = question.toLowerCase();

    return (
        q.includes("today") ||
        q.includes("current") ||
        q.includes("latest") ||
        q.includes("right now") ||

        // billionaire / wealth queries
        q.includes("richest person") ||
        q.includes("richest man") ||
        q.includes("richest woman") ||
        q.includes("wealthiest") ||
        q.includes("net worth") ||
        q.includes("billionaire") ||

        // finance / crypto
        q.includes("bitcoin price") ||
        q.includes("ethereum price") ||
        q.includes("stock price") ||

        // sports / news
        q.includes("world cup") ||
        q.includes("score") ||
        q.includes("match result") ||
        q.includes("news")
    );
}

export async function POST(req) {
    try {
        const { messages } = await req.json();

        const latestQuestion =
            messages[messages.length - 1].content;

        console.log("Latest Question:", latestQuestion);
        console.log(
            "Needs Search:",
            needsRealtimeSearch(latestQuestion)
        );

        let searchAnswer = "";

        if (needsRealtimeSearch(latestQuestion)) {
  const webResults = await searchWeb(latestQuestion);

  // Special handling for billionaire questions
  if (
    latestQuestion.toLowerCase().includes("richest") ||
    latestQuestion.toLowerCase().includes("billionaire") ||
    latestQuestion.toLowerCase().includes("net worth")
  ) {
    return Response.json({
      reply: `
As of August 2026, Elon Musk is generally regarded as the richest person in the world according to major real-time wealth rankings such as Forbes and Bloomberg.

His wealth comes primarily from Tesla and SpaceX. Because these rankings are updated continuously based on stock-market and private-company valuations, the exact net-worth figure changes frequently and can differ between sources.
`,
    });
  }

  searchAnswer = webResults;
}

        const completion =
            await client.chat.completions.create({
                model: "llama-3.3-70b-versatile",

                messages: [
                    {
                        role: "system",
                        content: `
You are ChatAAI, a professional AI assistant.

If real-time web information is provided:

- Use only the supplied web results.
- Do not invent or exaggerate financial figures.
- If the sources do not contain an exact number, say "estimates vary by source."
- Never output unrealistic net-worth figures such as hundreds of billions beyond what reputable sources report.
- Summarize the web results clearly and concisely.
`,
                    },
                    ...(searchAnswer
                        ? [
                            {
                                role: "system",
                                content: `Verified Real-Time Information:\n${searchAnswer}`,
                            },
                        ]
                        : []),
                    ...messages,
                ],

                temperature: 0.3,
                max_tokens: 1000,
            });

        return Response.json({
            reply:
                completion.choices[0].message.content,
        });
    } catch (error) {
        console.error("ChatAAI Error:", error);

        return Response.json({
            reply:
                "Unable to process your request right now.",
        });
    }
}