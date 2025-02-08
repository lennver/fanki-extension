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
          { role: "system", content: "Act as a subject matter teacher for grown ups. You help out by creating ANKI flash cards that your students use for spaced repetition to learn their subjects better and more long term. Always format the answer in JSON format with the [{ \"Question\":\"\", \"Answer\":\"\" }] structure." },
          { role: "user", content: `Create three question and answer pair for an Anki card. Make the question touch on concepts if possible. The following is what the user need help creating flashcards for: ${userText}` }
        ],
        temperature: 1.0,
        top_p: 1.0,
        max_tokens: 2000,
        model: "gpt-4o"
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
      
      // Send message to content script to show modal with all Q&A pairs
      await browser.tabs.sendMessage(tab.id, {
        type: 'showQAModal',
        data: qaContent
      });
    } catch (error) {
      console.error('Failed to handle response:', error);
    }
  }
});

async function handleResponse(response) {
  try {
    // Clean up the response and parse the array of Q&A pairs
    const cleanResponse = response.choices[0].message.content.trim();
    const jsonMatch = cleanResponse.match(/\[[^]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }
    const jsonStr = jsonMatch[0];
    const cardDataArray = JSON.parse(jsonStr);
    
    // Validate the required fields for each card
    if (!Array.isArray(cardDataArray)) {
      throw new Error('Response is not an array of cards');
    }
    
    for (const card of cardDataArray) {
      if (!card.Question || !card.Answer) {
        throw new Error('Missing required fields in one or more cards');
      }
    }
    
    return cardDataArray;
  } catch (error) {
    console.error('Error parsing response:', error);
    throw error;
  }
}
