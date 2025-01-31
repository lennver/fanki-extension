// This script adds a context menu and handles requests to an LLM
// Replace the placeholders with actual credentials/config for your chosen provider

browser.contextMenus.create({
  id: "anki-card-generator",
  title: "Generate Anki Card",
  contexts: ["selection"]
});

// Listen for clicks on the context menu
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "anki-card-generator" && info.selectionText) {
    const userText = info.selectionText.trim();
    
    let apiKey;
    try {
      const result = await browser.storage.local.get('apiKey');
      apiKey = result.apiKey;
      if (!apiKey) {
        console.error('API Key not found. Please set it in the extension options.');
        return;
      }
    } catch (error) {
      console.error('Failed to access storage:', error);
      return;
    }

    // Call the LLM service (placeholder code for Azure or GitHub model API call)
    // Replace with your actual API endpoint, headers, and request body
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Format the answer in JSON format with the { \"Question\":\"\", \"Answer\":\"\" } structure." },
          { role: "user", content: `Create a question and answer pair for an Anki card. Try to make the question touch on concepts if available possible. Base it on the following text: ${userText}` }
        ],
        temperature: 1.0,
        top_p: 1.0,
        max_tokens: 1000,
        model: "Llama-3.3-70B-Instruct"
      })
    });
    
    if (!response.ok) {
      console.error("LLM request failed");
      return;
    }
    
    const result = await response.json();
    
    console.log("LLM result:", result);

    // Parse the content which contains the question/answer JSON
    try {
      const qaContent = await handleResponse(result);
      
      // Send message to content script to show modal
      await browser.tabs.sendMessage(tab.id, {
        type: 'showQAModal',
        data: {
          question: qaContent.Question,
          answer: qaContent.Answer
        }
      });
    } catch (error) {
      console.error('Failed to handle response:', error);
    }
  }
});

async function handleResponse(response) {
  try {
    // Clean up the response by taking only the first valid JSON object
    const cleanResponse = response.choices[0].message.content.trim();
    const jsonMatch = cleanResponse.match(/\{[^]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    const jsonStr = jsonMatch[0];
    const cardData = JSON.parse(jsonStr);
    
    // Validate the required fields
    if (!cardData.Question || !cardData.Answer) {
      throw new Error('Missing required fields in response');
    }
    
    return cardData;
  } catch (error) {
    console.error('Error parsing response:', error);
    throw error;
  }
}
