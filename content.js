console.log('Content script loaded');

// Handle messages from the background script
browser.runtime.onMessage.addListener((message) => {
  console.log('Message received:', message);
  
  if (message.type === 'showQAModal') {
    console.log('Showing QA modal with data:', message.data);
    const { question, answer } = message.data;
    
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
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Question:</h3>
          <p style="margin: 0; color: #666;">${question}</p>
        </div>
        <div>
          <h3 style="margin: 0 0 10px 0; color: #333;">Answer:</h3>
          <p style="margin: 0; color: #666;">${answer}</p>
        </div>
        <button id="saveToAnki" style="
          margin-top: 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 20px;
          cursor: pointer;
        ">Save to Anki</button>
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
      console.log('Save to Anki button clicked');
      
      const ankiRequest = {
        action: 'addNote',
        version: 6,
        params: {
          note: {
            deckName: 'Default',
            modelName: 'Basic',
            fields: {
              Front: question,
              Back: answer
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

        alert('Card successfully saved to Anki!');
        closeModal();

      } catch (error) {
        console.error('Failed to save to Anki:', error);
        alert(`Failed to save to Anki: ${error.message}. Make sure AnkiConnect is running and accepting connections.`);
      }
    });

    // Add to page
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }
});
