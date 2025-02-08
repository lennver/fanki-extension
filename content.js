console.log('Content script loaded');

// Handle messages from the background script
browser.runtime.onMessage.addListener((message) => {
  console.log('Message received:', message);
  
  if (message.type === 'showQAModal') {
    console.log('Showing QA modal with data:', message.data);
    const qaItems = message.data;
    
    // Create modal elements
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 10000;
      width: 80%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    `;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;

    // Generate HTML for each Q&A pair
    const qaHtml = qaItems.map((item, index) => `
      <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #eee; border-radius: 4px;">
        <label style="display: block; margin-bottom: 10px;">
          <input type="checkbox" class="qa-checkbox" data-index="${index}" checked style="margin-right: 10px;">
          Select this card
        </label>
        <div style="margin-bottom: 10px;">
          <h3 style="margin: 0 0 5px 0; color: #333;">Question:</h3>
          <textarea class="qa-question" data-index="${index}" style="width: 100%; min-height: 60px; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">${item.Question}</textarea>
        </div>
        <div>
          <h3 style="margin: 0 0 5px 0; color: #333;">Answer:</h3>
          <textarea class="qa-answer" data-index="${index}" style="width: 100%; min-height: 60px; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;">${item.Answer}</textarea>
        </div>
      </div>
    `).join('');

    // Add content
    modal.innerHTML = `
      <div style="position: relative;">
        <button id="closeModal" style="
          position: absolute;
          top: -10px;
          right: -10px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        ">×</button>
        <h2 style="margin: 0 0 20px 0;">Generated Anki Cards</h2>
        ${qaHtml}
        <div style="margin-top: 20px; text-align: right;">
          <button id="saveToAnki" style="
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            cursor: pointer;
          ">Save Selected to Anki</button>
        </div>
      </div>
    `;

    // Add close functionality
    const closeModal = () => {
      document.body.removeChild(modal);
      document.body.removeChild(overlay);
    };

    overlay.addEventListener('click', closeModal);
    modal.querySelector('#closeModal').addEventListener('click', closeModal);

    // Add save to Anki functionality
    modal.querySelector('#saveToAnki').addEventListener('click', async () => {
      const selectedIndexes = Array.from(modal.querySelectorAll('.qa-checkbox:checked'))
        .map(cb => parseInt(cb.dataset.index));
      
      const selectedItems = selectedIndexes.map(index => {
        const question = modal.querySelector(`.qa-question[data-index="${index}"]`).value;
        const answer = modal.querySelector(`.qa-answer[data-index="${index}"]`).value;
        return { Question: question, Answer: answer };
      });
      
      for (const item of selectedItems) {
        const ankiRequest = {
          action: 'addNote',
          version: 6,
          params: {
            note: {
              deckName: 'Default',
              modelName: 'Basic',
              fields: {
                Front: item.Question,
                Back: item.Answer
              }
            }
          }
        };
        
        try {
          console.log('Sending request to Anki Connect...', JSON.stringify(ankiRequest));
          const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Origin': window.location.origin
            },
            body: JSON.stringify(ankiRequest)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('AnkiConnect result:', result);

          if (result.error) {
            throw new Error(result.error);
          }
        } catch (error) {
          console.error('Failed to save to Anki:', error);
          alert(`Failed to save to Anki: ${error.message}. Make sure AnkiConnect is running and accepting connections.`);
          return;
        }
      }
      
      alert(`Successfully saved ${selectedItems.length} cards to Anki!`);
      closeModal();
    });

    // Add to page
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }
});
