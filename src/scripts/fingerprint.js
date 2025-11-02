// Fingerprint JS integration for user identification
// Using the FingerprintJS library via CDN

// Initialize visitor identification
async function initFingerprint() {
    try {
        // Use the open-source version from CDN
        const FingerprintJS = await import('https://openfpcdn.io/fingerprintjs/v3/esm.min.js');
        
        // Initialize the agent
        const fpPromise = FingerprintJS.load({
            apiKey: "RHEaF0EGX8xFfpGKebI4"
        });
        
        // Get the visitor ID
        const fp = await fpPromise;
        const result = await fp.get();
        
        // Get the visitor identifier
        const visitorId = result.visitorId;
        // console.log('Visitor ID:', visitorId);
        
        // Log additional fingerprinting data for reference
        // console.log('Fingerprint accuracy:', result.confidence?.score);
        // console.log('Fingerprint timestamp:', result.timestamp);
        
        // Store the visitor ID for later use
        window.userFingerprint = visitorId;
        
        return visitorId;
    } catch (error) {
        console.error('Error initializing fingerprint:', error);
        
        // Fallback to a localStorage-based identifier if fingerprinting fails
        let fallbackId = localStorage.getItem('userIdentifier');
        if (!fallbackId) {
            fallbackId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem('userIdentifier', fallbackId);
        }
        
        console.log('Using fallback identifier:', fallbackId);
        window.userFingerprint = fallbackId;
        return fallbackId;
    }
}

// Export functions for use in other modules
export { initFingerprint };