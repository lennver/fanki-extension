document.getElementById('apiKeyForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const apiKey = document.getElementById('apiKey').value;
  browser.storage.local.set({ apiKey: apiKey }).then(() => {
    alert('API Key saved successfully!');
  });
});
