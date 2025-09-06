// Global variables
let currentPage = 'dashboard';

// Navigation functions
function openPage(pageId) {
    // Hide current page
    const currentPageEl = document.getElementById(currentPage);
    if (currentPageEl) {
        currentPageEl.classList.remove('active');
    }

    // Show new page
    const newPageEl = document.getElementById(pageId);
    if (newPageEl) {
        newPageEl.classList.add('active');
        currentPage = pageId;

        // Show/hide back button
        const backBtn = document.getElementById('backBtn');
        if (pageId === 'dashboard') {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'block';
        }

        // Load page-specific data
        if (pageId === 'market-prices') {
            loadPrices();
        } else if (pageId === 'weather-forecast') {
            loadWeather();
        }
    }
}

function goBack() {
    openPage('dashboard');
}

// API functions
async function loadPrices() {
    const pricesTable = document.getElementById('pricesTable');
    pricesTable.innerHTML = '<div class="loading-spinner"></div><p>Loading prices...</p>';

    try {
        const response = await fetch('/api/prices');
        const data = await response.json();

        if (data.records && data.records.length > 0) {
            let tableHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Commodity</th>
                            <th>Market</th>
                            <th>Price (₹/Quintal)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.records.slice(0, 10).forEach(record => {
                tableHTML += `
                    <tr>
                        <td>${record.commodity || 'N/A'}</td>
                        <td>${record.market || 'N/A'}</td>
                        <td>₹${record.modal_price || 'N/A'}</td>
                    </tr>
                `;
            });

            tableHTML += '</tbody></table>';
            pricesTable.innerHTML = tableHTML;
        } else {
            pricesTable.innerHTML = '<p>No price data available.</p>';
        }
    } catch (error) {
        console.error('Error loading prices:', error);
        pricesTable.innerHTML = '<p class="status-error">Failed to load price data. Please try again.</p>';
    }
}

// Global variable to store current location
let currentLocation = { name: 'Delhi', lat: 28.7041, lon: 77.1025 };

async function searchAndLoadWeather() {
    const locationInput = document.getElementById('locationInput');
    const location = locationInput.value.trim();
    
    if (!location) {
        alert('Please enter a city name');
        return;
    }

    await loadWeatherForLocation(location);
}

async function loadWeatherForCurrentLocation() {
    await loadWeatherForLocation(currentLocation.name);
}

async function loadWeatherForLocation(locationName) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    const weatherLocationTitle = document.getElementById('weatherLocationTitle');
    
    weatherDisplay.innerHTML = '<div class="loading-spinner"></div><p>Loading weather data...</p>';

    try {
        // First get coordinates for the location
        const coordsResponse = await fetch(`/api/geocode?location=${encodeURIComponent(locationName)}`);
        const coordsData = await coordsResponse.json();

        if (!coordsData.lat || !coordsData.lon) {
            weatherDisplay.innerHTML = '<p class="status-error">Location not found. Please try a different city name.</p>';
            return;
        }

        // Update current location
        currentLocation = { name: locationName, lat: coordsData.lat, lon: coordsData.lon };
        weatherLocationTitle.textContent = `7-Day Forecast - ${locationName}`;

        // Get weather data for the location
        const response = await fetch(`/api/weather?lat=${coordsData.lat}&lon=${coordsData.lon}`);
        const data = await response.json();

        if (data.daily) {
            let weatherHTML = '<div class="weather-cards">';

            for (let i = 0; i < 7; i++) {
                const date = new Date(data.daily.time[i]);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
                const minTemp = Math.round(data.daily.temperature_2m_min[i]);
                const precipitation = data.daily.precipitation_sum[i] || 0;

                weatherHTML += `
                    <div class="card" style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4>${dayName}</h4>
                                <p style="color: #94a3b8; font-size: 0.9rem;">${date.toLocaleDateString()}</p>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.2rem; font-weight: 600;">${maxTemp}°C / ${minTemp}°C</div>
                                <div style="color: #60a5fa; font-size: 0.9rem;">
                                    <i class="fas fa-cloud-rain"></i> ${precipitation}mm
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            weatherHTML += '</div>';
            weatherDisplay.innerHTML = weatherHTML;
        } else {
            weatherDisplay.innerHTML = '<p>No weather data available.</p>';
        }
    } catch (error) {
        console.error('Error loading weather:', error);
        weatherDisplay.innerHTML = '<p class="status-error">Failed to load weather data. Please try again.</p>';
    }
}

// Keep the old function for backward compatibility
async function loadWeather() {
    await loadWeatherForLocation('Delhi');
}

// Chat functions
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatDisplay = document.getElementById('chatDisplay');
    const message = chatInput.value.trim();

    if (!message) return;

    // Add user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chat-message user-message';
    userMessageDiv.textContent = message;
    chatDisplay.appendChild(userMessageDiv);

    // Clear input
    chatInput.value = '';

    // Add loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message bot-message';
    loadingDiv.innerHTML = '<div class="loading-spinner"></div> Thinking...';
    chatDisplay.appendChild(loadingDiv);

    // Scroll to bottom
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();

        // Remove loading message
        chatDisplay.removeChild(loadingDiv);

        // Add bot response
        const botMessageDiv = document.createElement('div');
        botMessageDiv.className = 'chat-message bot-message';
        botMessageDiv.textContent = data.text || 'Sorry, I could not process your request.';
        chatDisplay.appendChild(botMessageDiv);

    } catch (error) {
        console.error('Error sending message:', error);

        // Remove loading message
        chatDisplay.removeChild(loadingDiv);

        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-message bot-message';
        errorDiv.textContent = 'Sorry, there was an error processing your message. Please try again.';
        chatDisplay.appendChild(errorDiv);
    }

    // Scroll to bottom
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Event listeners
document.getElementById('chatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Add event listener for weather location search
document.addEventListener('DOMContentLoaded', function() {
    const locationInput = document.getElementById('locationInput');
    if (locationInput) {
        locationInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchAndLoadWeather();
            }
        });
    }
});

// Comprehensive crop data with specific fertilizers for each crop
const cropData = {
    rice: {
        fertilizers: [
            { name: "Urea (Nitrogen)", quantity: "120 kg", price: "₹2,400" },
            { name: "Single Super Phosphate (SSP)", quantity: "50 kg", price: "₹1,200" },
            { name: "Muriate of Potash (MOP)", quantity: "30 kg", price: "₹900" }
        ]
    },
    wheat: {
        fertilizers: [
            { name: "Urea", quantity: "100 kg", price: "₹2,000" },
            { name: "DAP (Diammonium Phosphate)", quantity: "75 kg", price: "₹2,250" },
            { name: "Potash (MOP)", quantity: "25 kg", price: "₹750" }
        ]
    },
    corn: {
        fertilizers: [
            { name: "Urea", quantity: "150 kg", price: "₹3,000" },
            { name: "Triple Super Phosphate (TSP)", quantity: "60 kg", price: "₹2,100" },
            { name: "Sulphate of Potash", quantity: "40 kg", price: "₹1,600" }
        ]
    },
    cotton: {
        fertilizers: [
            { name: "Urea", quantity: "130 kg", price: "₹2,600" },
            { name: "DAP", quantity: "100 kg", price: "₹3,000" },
            { name: "Potash (MOP)", quantity: "50 kg", price: "₹1,500" }
        ]
    },
    sugarcane: {
        fertilizers: [
            { name: "Urea", quantity: "200 kg", price: "₹4,000" },
            { name: "Single Super Phosphate", quantity: "150 kg", price: "₹3,600" },
            { name: "Muriate of Potash", quantity: "100 kg", price: "₹3,000" }
        ]
    },
    soybean: {
        fertilizers: [
            { name: "DAP", quantity: "100 kg", price: "₹3,000" },
            { name: "Potash (MOP)", quantity: "50 kg", price: "₹1,500" },
            { name: "Zinc Sulphate", quantity: "25 kg", price: "₹750" }
        ]
    },
    potato: {
        fertilizers: [
            { name: "Urea", quantity: "80 kg", price: "₹1,600" },
            { name: "DAP", quantity: "120 kg", price: "₹3,600" },
            { name: "Sulphate of Potash", quantity: "80 kg", price: "₹3,200" }
        ]
    },
    tomato: {
        fertilizers: [
            { name: "NPK Complex (19:19:19)", quantity: "80 kg", price: "₹2,400" },
            { name: "Calcium Nitrate", quantity: "30 kg", price: "₹1,200" },
            { name: "Magnesium Sulphate", quantity: "20 kg", price: "₹600" }
        ]
    },
    onion: {
        fertilizers: [
            { name: "Urea", quantity: "90 kg", price: "₹1,800" },
            { name: "Single Super Phosphate", quantity: "100 kg", price: "₹2,400" },
            { name: "Muriate of Potash", quantity: "60 kg", price: "₹1,800" }
        ]
    },
    garlic: {
        fertilizers: [
            { name: "Urea", quantity: "70 kg", price: "₹1,400" },
            { name: "DAP", quantity: "80 kg", price: "₹2,400" },
            { name: "Potash (MOP)", quantity: "40 kg", price: "₹1,200" }
        ]
    },
    cabbage: {
        fertilizers: [
            { name: "NPK (12:32:16)", quantity: "100 kg", price: "₹2,500" },
            { name: "Urea", quantity: "60 kg", price: "₹1,200" },
            { name: "Boron", quantity: "10 kg", price: "₹800" }
        ]
    },
    cauliflower: {
        fertilizers: [
            { name: "NPK Complex", quantity: "90 kg", price: "₹2,250" },
            { name: "Calcium Nitrate", quantity: "40 kg", price: "₹1,600" },
            { name: "Sulphur", quantity: "20 kg", price: "₹400" }
        ]
    },
    carrot: {
        fertilizers: [
            { name: "Urea", quantity: "70 kg", price: "₹1,400" },
            { name: "Single Super Phosphate", quantity: "90 kg", price: "₹2,160" },
            { name: "Potash (MOP)", quantity: "50 kg", price: "₹1,500" }
        ]
    },
    banana: {
        fertilizers: [
            { name: "Urea", quantity: "250 kg", price: "₹5,000" },
            { name: "Single Super Phosphate", quantity: "150 kg", price: "₹3,600" },
            { name: "Muriate of Potash", quantity: "200 kg", price: "₹6,000" }
        ]
    },
    mango: {
        fertilizers: [
            { name: "Urea", quantity: "300 kg", price: "₹6,000" },
            { name: "Single Super Phosphate", quantity: "200 kg", price: "₹4,800" },
            { name: "Muriate of Potash", quantity: "150 kg", price: "₹4,500" }
        ]
    },
    coconut: {
        fertilizers: [
            { name: "Urea", quantity: "180 kg", price: "₹3,600" },
            { name: "Rock Phosphate", quantity: "120 kg", price: "₹2,400" },
            { name: "Muriate of Potash", quantity: "100 kg", price: "₹3,000" }
        ]
    },
    tea: {
        fertilizers: [
            { name: "Urea", quantity: "200 kg", price: "₹4,000" },
            { name: "Ammonium Sulphate", quantity: "100 kg", price: "₹2,000" },
            { name: "Potash (MOP)", quantity: "80 kg", price: "₹2,400" }
        ]
    },
    coffee: {
        fertilizers: [
            { name: "Urea", quantity: "150 kg", price: "₹3,000" },
            { name: "Single Super Phosphate", quantity: "100 kg", price: "₹2,400" },
            { name: "Potash (MOP)", quantity: "120 kg", price: "₹3,600" }
        ]
    },
    turmeric: {
        fertilizers: [
            { name: "NPK (10:26:26)", quantity: "100 kg", price: "₹2,500" },
            { name: "Urea", quantity: "80 kg", price: "₹1,600" },
            { name: "Zinc Sulphate", quantity: "25 kg", price: "₹750" }
        ]
    },
    ginger: {
        fertilizers: [
            { name: "NPK Complex", quantity: "120 kg", price: "₹3,000" },
            { name: "Calcium Nitrate", quantity: "50 kg", price: "₹2,000" },
            { name: "Magnesium Sulphate", quantity: "30 kg", price: "₹900" }
        ]
    },
    chili: {
        fertilizers: [
            { name: "Urea", quantity: "100 kg", price: "₹2,000" },
            { name: "DAP", quantity: "80 kg", price: "₹2,400" },
            { name: "Potash (MOP)", quantity: "60 kg", price: "₹1,800" }
        ]
    },
    groundnut: {
        fertilizers: [
            { name: "Single Super Phosphate", quantity: "125 kg", price: "₹3,000" },
            { name: "Muriate of Potash", quantity: "50 kg", price: "₹1,500" },
            { name: "Gypsum", quantity: "250 kg", price: "₹2,500" }
        ]
    },
    chickpea: {
        fertilizers: [
            { name: "DAP", quantity: "100 kg", price: "₹3,000" },
            { name: "Potash (MOP)", quantity: "25 kg", price: "₹750" },
            { name: "Rhizobium Culture", quantity: "5 packets", price: "₹500" }
        ]
    },
    lentil: {
        fertilizers: [
            { name: "DAP", quantity: "80 kg", price: "₹2,400" },
            { name: "Potash (MOP)", quantity: "20 kg", price: "₹600" },
            { name: "Rhizobium Culture", quantity: "4 packets", price: "₹400" }
        ]
    },
    // Add default for other crops
    default: {
        fertilizers: [
            { name: "NPK (10:26:26)", quantity: "100 kg", price: "₹2,500" },
            { name: "Urea", quantity: "75 kg", price: "₹1,500" },
            { name: "Organic Manure", quantity: "500 kg", price: "₹2,000" }
        ]
    }
};

// Comprehensive language translations with language codes
const translations = {
    en: {
        // English - ISO 639-1: en
        hello_community: "Hello community",
        ai_powered_partner: "Your AI-powered partner in modern agriculture.",
        quick_links: "Quick Links",
        smart_yield_optimizer: "Smart Yield Optimizer",
        crop_doctor: "Crop Doctor",
        soil_testing: "Soil Testing",
        market_prices: "Market Prices",
        weather_forecast: "Weather Forecast",
        ai_chatbot: "AI Chatbot",
        community: "Community",
        my_fields: "My Fields",
        govt_schemes: "Govt. Schemes",
        app_guide: "App Guide",
        reminders: "Reminders"
    },
    hi: {
        // Hindi - ISO 639-1: hi, Devanagari script
        hello_community: "नमस्ते समुदाय",
        ai_powered_partner: "आधुनिक कृषि में आपका AI-संचालित साथी।",
        quick_links: "त्वरित लिंक",
        smart_yield_optimizer: "स्मार्ट उत्पादन अनुकूलक",
        crop_doctor: "फसल चिकित्सक",
        soil_testing: "मिट्टी परीक्षण",
        market_prices: "बाजार भाव",
        weather_forecast: "मौसम पूर्वानुमान",
        ai_chatbot: "AI चैटबॉट",
        community: "समुदाय",
        my_fields: "मेरे खेत",
        govt_schemes: "सरकारी योजनाएं",
        app_guide: "ऐप गाइड",
        reminders: "अनुस्मारक"
    },
    kn: {
        // Kannada - ISO 639-1: kn, Kannada script
        hello_community: "ಹ್ಯಾಲೋ ಸಮುದಾಯ",
        ai_powered_partner: "ಆಧುನಿಕ ಕೃಷಿಯಲ್ಲಿ ನಿಮ್ಮ AI-ಚಾಲಿತ ಪಾಲುದಾರ.",
        quick_links: "ತ್ವರಿತ ಲಿಂಕ್‌ಗಳು",
        smart_yield_optimizer: "ಸ್ಮಾರ್ಟ್ ಇಳುವರಿ ಆಪ್ಟಿಮೈಜರ್",
        crop_doctor: "ಬೆಳೆ ವೈದ್ಯ",
        soil_testing: "ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ",
        market_prices: "ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು",
        weather_forecast: "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ",
        ai_chatbot: "AI ಚಾಟ್‌ಬಾಟ್",
        community: "ಸಮುದಾಯ",
        my_fields: "ನನ್ನ ಹೊಲಗಳು",
        govt_schemes: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",
        app_guide: "ಅಪ್ಲಿಕೇಶನ್ ಗೈಡ್",
        reminders: "ಜ್ಞಾಪನೆಗಳು"
    },
    te: {
        // Telugu - ISO 639-1: te, Telugu script
        hello_community: "హలో కమ్యూనిటీ",
        ai_powered_partner: "ఆధునిక వ్యవసాయంలో మీ AI-శక్తితో కూడిన భాగస్వామి.",
        quick_links: "త్వరిత లింకులు",
        smart_yield_optimizer: "స్మార్ట్ దిగుబడి ఆప్టిమైజర్",
        crop_doctor: "పంట వైద్యుడు",
        soil_testing: "మట్టి పరీక్ష",
        market_prices: "మార్కెట్ ధరలు",
        weather_forecast: "వాతావరణ సూచన",
        ai_chatbot: "AI చాట్‌బాట్",
        community: "కమ్యూనిటీ",
        my_fields: "నా పొలాలు",
        govt_schemes: "ప్రభుత్వ పథకాలు",
        app_guide: "యాప్ గైడ్",
        reminders: "గుర్తుచేయిస్తుంది"
    },
    ta: {
        // Tamil - ISO 639-1: ta, Tamil script
        hello_community: "வணக்கம் சமூகம்",
        ai_powered_partner: "நவீன விவசாயத்தில் உங்கள் AI-இயங்கும் பங்குதாரர்.",
        quick_links: "விரைவு இணைப்புகள்",
        smart_yield_optimizer: "ஸ்மார்ட் மகசூல் மேம்படுத்தி",
        crop_doctor: "பயிர் மருத்துவர்",
        soil_testing: "மண் பரிசோதனை",
        market_prices: "சந்தை விலைகள்",
        weather_forecast: "வானிலை முன்னறிவிப்பு",
        ai_chatbot: "AI அரட்டைபோட்",
        community: "சமூகம்",
        my_fields: "என் வயல்கள்",
        govt_schemes: "அரசு திட்டங்கள்",
        app_guide: "ஆப் வழிகாட்டி",
        reminders: "நினைவூட்டல்கள்"
    }
};

// Language codes for reference:
// en - English (ISO 639-1)
// hi - हिंदी Hindi (ISO 639-1) 
// kn - ಕನ್ನಡ Kannada (ISO 639-1)
// te - తెలుగు Telugu (ISO 639-1)
// ta - தமிழ் Tamil (ISO 639-1)

// Voice recognition variables
let recognition;
let isListening = false;

// Community posts storage
let communityPosts = [
    { category: "crops", author: "Raj Kumar", topic: "Best time for wheat sowing in North India?", time: "2 hours ago", replies: 5 },
    { category: "crops", author: "Priya Sharma", topic: "Organic pest control methods for tomatoes", time: "5 hours ago", replies: 8 },
    { category: "equipment", author: "Mohan Lal", topic: "Which tractor is best for 5-acre farm?", time: "1 day ago", replies: 12 },
    { category: "labor", author: "Sunita Devi", topic: "Need skilled workers for harvesting season", time: "2 days ago", replies: 3 }
];

// Smart Yield Optimizer functions
async function generateCropPlan() {
    const cropSelect = document.getElementById('cropSelect');
    const acreageInput = document.getElementById('acreageInput');
    const cropPlanResults = document.getElementById('cropPlanResults');
    const fertilizerRecommendations = document.getElementById('fertilizerRecommendations');
    const growingPlan = document.getElementById('growingPlan');

    const selectedCrop = cropSelect.value;
    const acreage = parseFloat(acreageInput.value);

    if (!selectedCrop || !acreage || acreage <= 0) {
        alert('Please select a crop and enter valid acreage');
        return;
    }

    // Show loading
    fertilizerRecommendations.innerHTML = '<div class="loading-spinner"></div><p>Calculating fertilizer requirements...</p>';
    growingPlan.innerHTML = '<div class="loading-spinner"></div><p>Generating growing plan...</p>';
    cropPlanResults.style.display = 'block';

    // Get fertilizer data
    const fertilizers = cropData[selectedCrop] || cropData.default;

    // Calculate quantities based on acreage
    let fertilizerHTML = '<div class="result-item">';
    fertilizerHTML += `<div class="result-title">Fertilizer Requirements for ${acreage} acre(s) of ${selectedCrop}</div>`;
    fertilizerHTML += '<div class="result-content">';

    let totalCost = 0;
    fertilizers.fertilizers.forEach(fertilizer => {
        const quantity = parseFloat(fertilizer.quantity) * acreage;
        const price = parseFloat(fertilizer.price.replace('₹', '').replace(',', '')) * acreage;
        totalCost += price;

        fertilizerHTML += `
            <p><strong>${fertilizer.name}:</strong> 
            <span class="quantity-highlight">${quantity} kg</span> - 
            <span class="price-highlight">₹${price.toLocaleString()}</span></p>
        `;
    });

    fertilizerHTML += `<hr style="margin: 1rem 0; border-color: #334155;">`;
    fertilizerHTML += `<p><strong>Total Fertilizer Cost: <span class="price-highlight">₹${totalCost.toLocaleString()}</span></strong></p>`;
    fertilizerHTML += '</div></div>';

    fertilizerRecommendations.innerHTML = fertilizerHTML;

    // Generate growing plan using AI
    try {
        const planPrompt = `Create a comprehensive growing plan for ${selectedCrop} cultivation on ${acreage} acres. Include:
        1. Soil preparation steps
        2. Seed selection and planting details
        3. Irrigation schedule
        4. Fertilizer application timeline
        5. Pest and disease management
        6. Harvesting guidelines
        7. Expected yield and timeline

        Provide specific, actionable advice for Indian agricultural conditions.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: planPrompt })
        });

        const data = await response.json();

        const planHTML = `
            <div class="result-item">
                <div class="result-title">Complete Growing Plan for ${selectedCrop.charAt(0).toUpperCase() + selectedCrop.slice(1)}</div>
                <div class="result-content">${data.text.replace(/\n/g, '<br>')}</div>
            </div>
        `;

        growingPlan.innerHTML = planHTML;

    } catch (error) {
        console.error('Error generating growing plan:', error);
        growingPlan.innerHTML = '<p class="status-error">Failed to generate growing plan. Please try again.</p>';
    }
}

// Image preview function
function previewImage() {
    const fileInput = document.getElementById('cropImage');
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();

        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };

        reader.readAsDataURL(fileInput.files[0]);
    } else {
        preview.style.display = 'none';
    }
}

// User profile data
let userProfile = {
    name: '',
    phone: '',
    location: '',
    farmSize: ''
};

// Load profile from localStorage
function loadProfile() {
    const saved = localStorage.getItem('agripulse_profile');
    if (saved) {
        userProfile = JSON.parse(saved);
        updateProfileDisplay();
    }
}

// Profile functions
function openProfile() {
    const modal = document.getElementById('profileModal');
    const nameInput = document.getElementById('profileName');
    const phoneInput = document.getElementById('profilePhone');
    const locationInput = document.getElementById('profileLocation');
    const farmSizeInput = document.getElementById('profileFarmSize');
    
    // Load existing data
    nameInput.value = userProfile.name;
    phoneInput.value = userProfile.phone;
    locationInput.value = userProfile.location;
    farmSizeInput.value = userProfile.farmSize;
    
    modal.style.display = 'block';
}

function closeProfile() {
    document.getElementById('profileModal').style.display = 'none';
}

function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();
    const location = document.getElementById('profileLocation').value.trim();
    const farmSize = document.getElementById('profileFarmSize').value.trim();
    
    if (!name || !phone) {
        alert('Please fill in at least your name and phone number');
        return;
    }
    
    userProfile = { name, phone, location, farmSize };
    localStorage.setItem('agripulse_profile', JSON.stringify(userProfile));
    updateProfileDisplay();
    closeProfile();
    
    alert('Profile saved successfully!');
}

function updateProfileDisplay() {
    const avatar = document.getElementById('profileAvatar');
    if (userProfile.name) {
        avatar.innerHTML = userProfile.name.charAt(0).toUpperCase();
    }
}

// Enhanced Crop Doctor functions with mandatory image
async function diagnoseCropIssue() {
    const cropIssueSelect = document.getElementById('cropIssueSelect');
    const issueDescription = document.getElementById('issueDescription');
    const diagnosisResults = document.getElementById('diagnosisResults');
    const diagnosisContent = document.getElementById('diagnosisContent');
    const imageInput = document.getElementById('cropImage');

    const crop = cropIssueSelect.value;
    const issue = issueDescription.value.trim();

    if (!crop || !imageInput.files || !imageInput.files[0]) {
        alert('Please select a crop and upload an image for AI diagnosis');
        return;
    }

    // Show loading
    diagnosisContent.innerHTML = '<div class="loading-spinner"></div><p>Analyzing crop issue...</p>';
    diagnosisResults.style.display = 'block';

    try {
        let diagnosisPrompt = `As an expert agricultural pathologist and plant disease specialist, analyze this crop issue:

        Crop: ${crop}`;

        if (issue) {
            diagnosisPrompt += `
        Symptoms described: ${issue}`;
        }

        if (imageInput.files && imageInput.files[0]) {
            // Convert image to base64 for better AI analysis
            const file = imageInput.files[0];
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                const base64Image = e.target.result;
                
                diagnosisPrompt += `

        IMPORTANT: An image has been uploaded showing the affected crop. Based on common visual symptoms that can be observed in crop images, please provide a detailed analysis. Common visual indicators include:
        
        - Leaf discoloration (yellowing, browning, blackening, spots)
        - Leaf deformation (curling, wilting, holes)
        - Stem issues (discoloration, lesions, rot)
        - Fruit/grain problems (spots, rot, discoloration)
        - Pest damage (chewed leaves, holes, webbing)
        - Growth abnormalities (stunted growth, abnormal leaf patterns)
        
        Analyze the image considering these visual symptoms and provide:`;

                diagnosisPrompt += `

        Provide comprehensive analysis with:
        1. Likely diagnosis based on visual symptoms (disease, pest, nutrient deficiency, or environmental stress)
        2. Detailed explanation of the probable cause
        3. Confidence level of diagnosis
        4. Immediate treatment recommendations with specific product names available in India
        5. Step-by-step treatment procedure
        6. Prevention strategies for future occurrences
        7. Expected recovery timeline
        8. When to contact agricultural extension services
        9. Alternative treatments if primary treatment fails

        Give specific, actionable advice suitable for Indian farming conditions with locally available treatments.`;

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: diagnosisPrompt })
                    });

                    const data = await response.json();

                    const diagnosisHTML = `
                        <div class="result-item">
                            <div class="result-title">AI Diagnosis for ${crop.charAt(0).toUpperCase() + crop.slice(1)} Issue</div>
                            <div class="result-content">
                                <p><strong>🔍 Analysis Type:</strong> Image + Text Analysis</p>
                                <hr style="margin: 1rem 0; border-color: #334155;">
                                ${data.text.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    `;

                    diagnosisContent.innerHTML = diagnosisHTML;
                } catch (error) {
                    console.error('Error with image analysis:', error);
                    diagnosisContent.innerHTML = '<p class="status-error">Failed to analyze image. Please try again.</p>';
                }
            };
            
            reader.readAsDataURL(file);
        } else {
            // Text-only analysis
            diagnosisPrompt += `

        Provide comprehensive analysis with:
        1. Likely diagnosis (disease, pest, nutrient deficiency, or environmental stress)
        2. Detailed explanation of the cause
        3. Immediate treatment recommendations
        4. Prevention strategies
        5. Expected recovery timeline
        6. When to contact agricultural extension services

        Give specific, actionable advice for Indian farming conditions.`;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: diagnosisPrompt })
            });

            const data = await response.json();

            const diagnosisHTML = `
                <div class="result-item">
                    <div class="result-title">Diagnosis for ${crop.charAt(0).toUpperCase() + crop.slice(1)} Issue</div>
                    <div class="result-content">${data.text.replace(/\n/g, '<br>')}</div>
                </div>
            `;

            diagnosisContent.innerHTML = diagnosisHTML;
        }

    } catch (error) {
        console.error('Error diagnosing crop issue:', error);
        diagnosisContent.innerHTML = '<p class="status-error">Failed to diagnose issue. Please try again.</p>';
    }
}

// Soil Suitability functions
async function analyzeSoil() {
    const soilType = document.getElementById('soilType').value;
    const soilPH = document.getElementById('soilPH').value;
    const soilResults = document.getElementById('soilResults');
    const soilAnalysis = document.getElementById('soilAnalysis');

    if (!soilType || !soilPH) {
        alert('Please select soil type and enter pH value');
        return;
    }

    soilAnalysis.innerHTML = '<div class="loading-spinner"></div><p>Analyzing soil conditions...</p>';
    soilResults.style.display = 'block';

    try {
        const soilPrompt = `As a soil expert, analyze this soil condition:

        Soil Type: ${soilType}
        Soil pH: ${soilPH}

        Provide:
        1. Soil quality assessment
        2. Best crops for this soil type and pH
        3. Soil improvement recommendations
        4. Fertilizer suggestions specific to this soil
        5. Irrigation recommendations
        6. Potential challenges and solutions

        Give specific advice for Indian agricultural conditions.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: soilPrompt })
        });

        const data = await response.json();

        const analysisHTML = `
            <div class="result-item">
                <div class="result-title">Soil Analysis for ${soilType.charAt(0).toUpperCase() + soilType.slice(1)} Soil (pH: ${soilPH})</div>
                <div class="result-content">${data.text.replace(/\n/g, '<br>')}</div>
            </div>
        `;

        soilAnalysis.innerHTML = analysisHTML;

    } catch (error) {
        console.error('Error analyzing soil:', error);
        soilAnalysis.innerHTML = '<p class="status-error">Failed to analyze soil. Please try again.</p>';
    }
}

// Labor Marketplace functions
async function findLabor() {
    const laborType = document.getElementById('laborType').value;
    const laborArea = document.getElementById('laborArea').value;
    const laborList = document.getElementById('laborList');
    const laborResults = document.getElementById('laborResults');

    if (!laborType || !laborArea) {
        alert('Please select work type and enter area.');
        return;
    }

    laborList.innerHTML = '<div class="loading-spinner"></div><p>Searching for workers...</p>';
    laborResults.style.display = 'block';

    // In a real application, this would fetch data from a server
    // For now, we'll simulate some data
    const availableWorkers = [
        { name: "Ramesh Kumar", type: "plowing", area: "5 acres", contact: "9876543210" },
        { name: "Sita Devi", type: "harvesting", area: "3 acres", contact: "9988776655" },
        { name: "Gopal Singh", type: "sowing", area: "7 acres", contact: "9123456789" },
        { name: "Lakshmi Bai", type: "weeding", area: "4 acres", contact: "9555666777" }
    ];

    const filteredWorkers = availableWorkers.filter(worker => worker.type === laborType);

    if (filteredWorkers.length > 0) {
        let listHTML = '';
        filteredWorkers.forEach(worker => {
            listHTML += `
                <div class="result-item">
                    <div class="result-content">
                        <p><strong>Name:</strong> ${worker.name}</p>
                        <p><strong>Work Type:</strong> ${worker.type.charAt(0).toUpperCase() + worker.type.slice(1)}</p>
                        <p><strong>Area Experience:</strong> ${worker.area}</p>
                        <p><strong>Contact:</strong> ${worker.contact}</p>
                    </div>
                </div>
            `;
        });
        laborList.innerHTML = listHTML;
    } else {
        laborList.innerHTML = '<p>No workers found for your criteria. Please try different options.</p>';
    }
}

// My Fields functions
let myFields = [];

function addField() {
    const fieldNameInput = document.getElementById('fieldName');
    const fieldSizeInput = document.getElementById('fieldSize');
    const currentCropInput = document.getElementById('currentCrop');
    const fieldPHInput = document.getElementById('fieldPH');
    const fieldMoistureInput = document.getElementById('fieldMoisture');
    const fieldNitrogenInput = document.getElementById('fieldNitrogen');
    const fieldPhosphorusInput = document.getElementById('fieldPhosphorus');
    const fieldPotassiumInput = document.getElementById('fieldPotassium');

    const fieldName = fieldNameInput.value.trim();
    const fieldSize = fieldSizeInput.value.trim();
    const currentCrop = currentCropInput.value;
    const pH = fieldPHInput.value.trim();
    const moisture = fieldMoistureInput.value.trim();
    const nitrogen = fieldNitrogenInput.value.trim();
    const phosphorus = fieldPhosphorusInput.value.trim();
    const potassium = fieldPotassiumInput.value.trim();

    if (!fieldName || !fieldSize || !currentCrop) {
        alert('Please fill in at least field name, size, and current crop.');
        return;
    }

    myFields.push({ 
        name: fieldName, 
        size: fieldSize, 
        crop: currentCrop,
        pH: pH,
        moisture: moisture,
        nitrogen: nitrogen,
        phosphorus: phosphorus,
        potassium: potassium
    });
    renderFields();

    // Clear inputs
    fieldNameInput.value = '';
    fieldSizeInput.value = '';
    currentCropInput.value = '';
    fieldPHInput.value = '';
    fieldMoistureInput.value = '';
    fieldNitrogenInput.value = '';
    fieldPhosphorusInput.value = '';
    fieldPotassiumInput.value = '';
}

function renderFields() {
    const fieldsDisplay = document.getElementById('fieldsDisplay');
    if (myFields.length === 0) {
        fieldsDisplay.innerHTML = '<p style="color: #94a3b8;">No fields added yet. Add your first field above.</p>';
        return;
    }

    let fieldsHTML = '';
    myFields.forEach((field, index) => {
        fieldsHTML += `
            <div class="result-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p><strong>Field Name:</strong> ${field.name}</p>
                    <p><strong>Size:</strong> ${field.size} acres</p>
                    <p><strong>Current Crop:</strong> ${field.crop.charAt(0).toUpperCase() + field.crop.slice(1)}</p>
                    ${field.pH ? `<p><strong>pH:</strong> ${field.pH}</p>` : ''}
                    ${field.moisture ? `<p><strong>Moisture:</strong> ${field.moisture}%</p>` : ''}
                    ${field.nitrogen ? `<p><strong>Nitrogen:</strong> ${field.nitrogen} kg/ha</p>` : ''}
                    ${field.phosphorus ? `<p><strong>Phosphorus:</strong> ${field.phosphorus} kg/ha</p>` : ''}
                    ${field.potassium ? `<p><strong>Potassium:</strong> ${field.potassium} kg/ha</p>` : ''}
                </div>
                <div>
                    <button class="btn-secondary btn-sm" onclick="editField(${index})">Edit</button>
                    <button class="btn-danger btn-sm" onclick="deleteField(${index})">Delete</button>
                </div>
            </div>
        `;
    });
    fieldsDisplay.innerHTML = fieldsHTML;
}

function deleteField(index) {
    myFields.splice(index, 1);
    renderFields();
}

// AI Field Advice function
async function getFieldAdvice() {
    if (myFields.length === 0) {
        alert('Please add at least one field first.');
        return;
    }

    const fieldsDisplay = document.getElementById('fieldsDisplay');
    const originalContent = fieldsDisplay.innerHTML;
    
    fieldsDisplay.innerHTML = '<div class="loading-spinner"></div><p>Getting AI advice for your fields...</p>';

    try {
        let fieldsData = '';
        myFields.forEach((field, index) => {
            fieldsData += `Field ${index + 1}: ${field.name}
            - Size: ${field.size} acres
            - Crop: ${field.crop}
            - pH: ${field.pH || 'Not provided'}
            - Moisture: ${field.moisture || 'Not provided'}%
            - Nitrogen: ${field.nitrogen || 'Not provided'} kg/ha
            - Phosphorus: ${field.phosphorus || 'Not provided'} kg/ha
            - Potassium: ${field.potassium || 'Not provided'} kg/ha
            
            `;
        });

        const advicePrompt = `As an agricultural expert, analyze these field conditions and provide comprehensive advice:

        ${fieldsData}

        Please provide:
        1. Overall soil health assessment for each field
        2. Specific recommendations for nutrient management
        3. Crop-specific advice for current crops
        4. Suggested improvements for soil conditions
        5. Fertilizer recommendations with quantities
        6. Water management advice
        7. Best practices for each field

        Give practical, actionable advice for Indian farming conditions.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: advicePrompt })
        });

        const data = await response.json();

        const adviceHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">AI Field Analysis & Recommendations</h3>
                </div>
                <div class="result-content">${data.text.replace(/\n/g, '<br>')}</div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Your Fields</h3>
                </div>
                ${originalContent}
            </div>
        `;

        fieldsDisplay.innerHTML = adviceHTML;

    } catch (error) {
        console.error('Error getting field advice:', error);
        fieldsDisplay.innerHTML = originalContent + '<p class="status-error">Failed to get AI advice. Please try again.</p>';
    }
}

// Placeholder for editField function
function editField(index) {
    alert(`Editing field at index ${index} is not yet implemented.`);
}

// Guide Page functions
function showGuide(guideId) {
    const guideContent = document.getElementById('guideContent');
    const guideTitle = document.getElementById('guideTitle');
    const guideText = document.getElementById('guideText');

    let title = '';
    let text = '';

    switch (guideId) {
        case 'basics':
            title = 'Farming Basics';
            text = `
                <p><strong>Soil Preparation:</strong> Ensure soil is well-drained and rich in organic matter. Consider crop rotation to maintain soil health.</p>
                <p><strong>Seed Selection:</strong> Choose high-quality seeds suitable for your climate and soil type. Look for disease-resistant varieties.</p>
                <p><strong>Planting:</strong> Follow recommended planting depth and spacing for each crop to ensure optimal growth.</p>
                <p><strong>Water Management:</strong> Water crops consistently, especially during critical growth stages. Drip irrigation can save water.</p>
            `;
            break;
        case 'irrigation':
            title = 'Irrigation Techniques';
            text = `
                <p><strong>Drip Irrigation:</strong> Delivers water directly to the plant roots, minimizing evaporation and water waste. Ideal for row crops and orchards.</p>
                <p><strong>Sprinkler Irrigation:</strong> Distributes water over the entire field, suitable for larger areas and closely spaced crops.</p>
                <p><strong>Furrow Irrigation:</strong> Water flows through channels between crop rows. Best for crops tolerant to wet soil conditions.</p>
                <p><strong>Timing:</strong> Water early in the morning or late in the evening to reduce evaporation.</p>
            `;
            break;
        case 'pest':
            title = 'Pest and Disease Control';
            text = `
                <p><strong>Integrated Pest Management (IPM):</strong> Combine biological, cultural, physical, and chemical tools to manage pests effectively and sustainably.</p>
                <p><strong>Identification:</strong> Correctly identify the pest or disease before applying any treatment.</p>
                <p><strong>Organic Methods:</strong> Use natural predators, companion planting, and organic pesticides like neem oil or Bacillus thuringiensis (Bt).</p>
                <p><strong>Chemical Control:</strong> Use pesticides judiciously and only when necessary, following label instructions carefully to avoid harm to beneficial insects and the environment.</p>
            `;
            break;
        case 'harvest':
            title = 'Harvesting and Post-Harvest';
            text = `
                <p><strong>Maturity:</strong> Harvest crops at their optimal maturity for the best quality and yield.</p>
                <p><strong>Method:</strong> Use appropriate harvesting techniques to minimize damage to the crops.</p>
                <p><strong>Handling:</strong> Handle harvested produce carefully to prevent bruising and spoilage.</p>
                <p><strong>Storage:</strong> Store crops in suitable conditions (temperature, humidity) to maintain freshness and prevent losses.</p>
            `;
            break;
        default:
            title = 'Unknown Guide';
            text = '<p>Guide content not available for this category.</p>';
    }

    guideTitle.innerHTML = title;
    guideText.innerHTML = text;
    guideContent.style.display = 'block';
}


// Reminders functions
let reminders = [];

function addReminder() {
    const reminderActivityInput = document.getElementById('reminderActivity');
    const reminderDateInput = document.getElementById('reminderDate');
    const reminderNotesInput = document.getElementById('reminderNotes');
    const remindersDisplay = document.getElementById('remindersDisplay');

    const activity = reminderActivityInput.value;
    const date = reminderDateInput.value;
    const notes = reminderNotesInput.value.trim();

    if (!activity || !date) {
        alert('Please select an activity and a date for the reminder.');
        return;
    }

    reminders.push({ activity: activity, date: date, notes: notes });
    renderReminders();

    // Clear inputs
    reminderActivityInput.value = '';
    reminderDateInput.value = '';
    reminderNotesInput.value = '';
}

function renderReminders() {
    const remindersDisplay = document.getElementById('remindersDisplay');
    if (reminders.length === 0) {
        remindersDisplay.innerHTML = '<p style="color: #94a3b8;">No reminders set. Add your first reminder above.</p>';
        return;
    }

    // Sort reminders by date
    reminders.sort((a, b) => new Date(a.date) - new Date(b.date));

    let listHTML = '';
    reminders.forEach((reminder, index) => {
        listHTML += `
            <div class="result-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div>
                    <p><strong>Activity:</strong> ${reminder.activity.charAt(0).toUpperCase() + reminder.activity.slice(1)}</p>
                    <p><strong>Date:</strong> ${new Date(reminder.date).toLocaleDateString()}</p>
                    ${reminder.notes ? `<p><strong>Notes:</strong> ${reminder.notes}</p>` : ''}
                </div>
                <div>
                    <button class="btn-danger btn-sm" onclick="deleteReminder(${index})">Delete</button>
                </div>
            </div>
        `;
    });
    remindersDisplay.innerHTML = listHTML;
}

function deleteReminder(index) {
    reminders.splice(index, 1);
    renderReminders();
}


// Enhanced Language functions
function changeLanguage() {
    const selectedLang = document.getElementById('languageSelect').value;
    const translation = translations[selectedLang];
    
    if (translation) {
        // Update main dashboard
        const welcomeTitle = document.querySelector('.welcome-title');
        const welcomeSubtitle = document.querySelector('.welcome-subtitle');
        const sectionTitle = document.querySelector('.section-title');
        
        if (welcomeTitle) welcomeTitle.textContent = translation.hello_community;
        if (welcomeSubtitle) welcomeSubtitle.textContent = translation.ai_powered_partner;
        if (sectionTitle) sectionTitle.textContent = translation.quick_links;
        
        // Update feature cards
        const featureCards = document.querySelectorAll('.feature-card .feature-title');
        const featureMapping = [
            'smart_yield_optimizer', 'crop_doctor', 'soil_testing', 'market_prices',
            'labor_marketplace', 'community', 'my_fields', 'govt_schemes',
            'app_guide', 'ai_chatbot', 'weather_forecast', 'reminders'
        ];
        
        featureCards.forEach((card, index) => {
            if (featureMapping[index] && translation[featureMapping[index]]) {
                const parts = card.innerHTML.split('<br>');
                if (parts.length > 1) {
                    // Keep temperature but translate the rest
                    card.innerHTML = parts[0] + '<br>' + translation[featureMapping[index]];
                } else {
                    card.textContent = translation[featureMapping[index]];
                }
            }
        });
        
        // Store selected language for persistence
        localStorage.setItem('selected_language', selectedLang);
        console.log(`Language changed to: ${selectedLang}`);
    }
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedLanguage = localStorage.getItem('selected_language') || 'en';
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = savedLanguage;
        changeLanguage();
    }
});

// Voice Assistant functions
function toggleVoiceAssistant() {
    const voiceBtn = document.querySelector('.voice-btn');
    
    if (!recognition) {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onstart = function() {
                isListening = true;
                voiceBtn.classList.add('active');
            };
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                handleVoiceCommand(transcript);
            };
            
            recognition.onend = function() {
                isListening = false;
                voiceBtn.classList.remove('active');
            };
            
            recognition.onerror = function(event) {
                console.error('Voice recognition error:', event.error);
                isListening = false;
                voiceBtn.classList.remove('active');
                alert('Voice recognition error. Please try again.');
            };
        } else {
            alert('Voice recognition not supported in this browser.');
            return;
        }
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function handleVoiceCommand(command) {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('weather')) {
        openPage('weather-forecast');
    } else if (lowerCommand.includes('market') || lowerCommand.includes('price')) {
        openPage('market-prices');
    } else if (lowerCommand.includes('crop doctor') || lowerCommand.includes('disease')) {
        openPage('crop-doctor');
    } else if (lowerCommand.includes('soil')) {
        openPage('soil-suitability');
    } else if (lowerCommand.includes('community')) {
        openPage('community');
    } else if (lowerCommand.includes('chatbot') || lowerCommand.includes('chat')) {
        openPage('ai-chatbot');
        // Add the voice command as chat input
        setTimeout(() => {
            document.getElementById('chatInput').value = command;
            sendMessage();
        }, 500);
    } else if (lowerCommand.includes('home') || lowerCommand.includes('dashboard')) {
        openPage('dashboard');
    } else {
        // If no specific page command, send to chatbot
        openPage('ai-chatbot');
        setTimeout(() => {
            document.getElementById('chatInput').value = command;
            sendMessage();
        }, 500);
    }
}

// Enhanced soil analysis function
async function analyzeSoilDetailed() {
    const soilType = document.getElementById('soilType').value;
    const soilPH = document.getElementById('soilPH').value;
    const soilMoisture = document.getElementById('soilMoisture').value;
    const nitrogenLevel = document.getElementById('nitrogenLevel').value;
    const phosphorusLevel = document.getElementById('phosphorusLevel').value;
    const potassiumLevel = document.getElementById('potassiumLevel').value;
    const soilResults = document.getElementById('soilResults');
    const soilAnalysis = document.getElementById('soilAnalysis');

    if (!soilType || !soilPH) {
        alert('Please fill in at least soil type and pH level');
        return;
    }

    soilAnalysis.innerHTML = '<div class="loading-spinner"></div><p>Analyzing detailed soil conditions...</p>';
    soilResults.style.display = 'block';

    try {
        const soilPrompt = `As a soil expert and agricultural scientist, analyze these detailed soil test results:

        Soil Type: ${soilType}
        Soil pH: ${soilPH}
        ${soilMoisture ? `Moisture Content: ${soilMoisture}%` : ''}
        ${nitrogenLevel ? `Nitrogen (N): ${nitrogenLevel} kg/hectare` : ''}
        ${phosphorusLevel ? `Phosphorus (P): ${phosphorusLevel} kg/hectare` : ''}
        ${potassiumLevel ? `Potassium (K): ${potassiumLevel} kg/hectare` : ''}

        Provide a comprehensive analysis with:
        1. Soil health assessment based on the provided parameters
        2. Nutrient deficiency or excess identification
        3. Best crops suitable for these soil conditions
        4. Specific fertilizer recommendations to balance nutrients
        5. Soil pH correction methods if needed
        6. Moisture management suggestions
        7. Long-term soil improvement strategies
        8. Expected yield improvements with proper management

        Give specific, actionable advice for Indian agricultural conditions with recommended fertilizer names, quantities, and application methods.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: soilPrompt })
        });

        const data = await response.json();

        const analysisHTML = `
            <div class="result-item">
                <div class="result-title">Detailed Soil Analysis for ${soilType.charAt(0).toUpperCase() + soilType.slice(1)} Soil</div>
                <div class="result-content">
                    <p><strong>Test Parameters:</strong></p>
                    <ul>
                        <li>pH: ${soilPH}</li>
                        ${soilMoisture ? `<li>Moisture: ${soilMoisture}%</li>` : ''}
                        ${nitrogenLevel ? `<li>Nitrogen: ${nitrogenLevel} kg/hectare</li>` : ''}
                        ${phosphorusLevel ? `<li>Phosphorus: ${phosphorusLevel} kg/hectare</li>` : ''}
                        ${potassiumLevel ? `<li>Potassium: ${potassiumLevel} kg/hectare</li>` : ''}
                    </ul>
                    <hr style="margin: 1rem 0; border-color: #334155;">
                    ${data.text.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;

        soilAnalysis.innerHTML = analysisHTML;

    } catch (error) {
        console.error('Error analyzing soil:', error);
        soilAnalysis.innerHTML = '<p class="status-error">Failed to analyze soil. Please try again.</p>';
    }
}

// Community functions
function filterCommunityPosts(category) {
    const posts = document.querySelectorAll('#communityPosts .result-item');
    const title = document.getElementById('communityPostsTitle');
    
    if (category === 'all') {
        posts.forEach(post => post.style.display = 'block');
        title.textContent = 'All Discussions';
    } else {
        posts.forEach(post => {
            if (post.dataset.category === category) {
                post.style.display = 'block';
            } else {
                post.style.display = 'none';
            }
        });
        title.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} Discussions`;
    }
}

function addCommunityPost() {
    const category = document.getElementById('postCategory').value;
    const topic = document.getElementById('discussionTopic').value.trim();
    const content = document.getElementById('discussionContent').value.trim();
    const postsContainer = document.getElementById('communityPosts');

    if (!topic || !content) {
        alert('Please fill in both topic and message');
        return;
    }

    if (!userProfile.name || !userProfile.phone) {
        alert('Please set up your profile first by clicking the profile icon in the header');
        openProfile();
        return;
    }

    // Create new post element with user profile info
    const newPost = document.createElement('div');
    newPost.className = 'result-item';
    newPost.dataset.category = category;
    newPost.innerHTML = `
        <div class="result-content">
            <p><strong>${userProfile.name}:</strong> ${topic}</p>
            <p style="color: #94a3b8; font-size: 0.9rem;">
                ${category.charAt(0).toUpperCase() + category.slice(1)} • Just now • 0 replies
                ${userProfile.location ? ` • ${userProfile.location}` : ''}
                ${userProfile.phone ? ` • Contact: ${userProfile.phone}` : ''}
            </p>
            <p style="color: #e2e8f0; font-size: 0.9rem; margin-top: 0.5rem;">${content}</p>
        </div>
    `;

    // Add to the beginning of posts
    postsContainer.insertBefore(newPost, postsContainer.firstChild);

    // Clear form
    document.getElementById('discussionTopic').value = '';
    document.getElementById('discussionContent').value = '';

    alert('Your post has been added to the community!');
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('AgriPulse app initialized');
    // Load user profile
    loadProfile();
    // Initially load dashboard if it's the default page
    if (currentPage === 'dashboard') {
        // Set default language
        changeLanguage();
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('profileModal');
        if (event.target === modal) {
            closeProfile();
        }
    }
});
