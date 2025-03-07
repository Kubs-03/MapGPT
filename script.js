let map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let countriesList = [];
let countryLayers = [];

// Fetch country names for auto-suggestions
fetch('https://restcountries.com/v3.1/all')
    .then(response => response.json())
    .then(data => {
        countriesList = data.map(country => country.name.common);
    });

// Show auto-suggestions while typing
function showSuggestions() {
    let input = document.getElementById("searchBar").value.toLowerCase();
    let suggestionsDiv = document.getElementById("suggestions");
    suggestionsDiv.innerHTML = "";

    if (input.length === 0) {
        suggestionsDiv.style.display = "none";
        return;
    }

    let filtered = countriesList.filter(name => name.toLowerCase().startsWith(input)).slice(0, 5);

    filtered.forEach(name => {
        let div = document.createElement("div");
        div.classList.add("suggestion-item");
        div.innerText = name;
        div.onclick = function () {
            document.getElementById("searchBar").value = name;
            suggestionsDiv.style.display = "none";
        };
        suggestionsDiv.appendChild(div);
    });

    suggestionsDiv.style.display = filtered.length > 0 ? "block" : "none";
}

// Google Gemini AI Integration (Multi-Location Support)
async function askAI(question) {
    const apiKey = "YOUR-api-key"; // Replace with your API key
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
        contents: [{ parts: [{ text: `List all relevant locations (only names, comma-separated). Query: ${question}` }] }]
    };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            let rawText = data.candidates[0].content.parts[0].text.trim();
            console.log("AI Response:", rawText);

            // Split AI response into an array of locations
            let locations = rawText.split(",").map(l => l.trim());
            return locations;
        } else {
            throw new Error("AI did not return valid locations.");
        }
    } catch (error) {
        console.error("AI Error:", error);
        return [];
    }
}

// Search Function (Handles Multi-Locations)
async function searchCountry() {
    let query = document.getElementById("searchBar").value.trim();
    if (!query) return;

    document.getElementById("answer").innerText = "Thinking...";

    // Clear previous answers
    document.getElementById("answer").innerHTML = "";

    try {
        let aiResults = await askAI(query);
        if (aiResults.length > 0) {
            document.getElementById("answer").innerHTML = `<b>AI Found:</b> ${aiResults.join(", ")}`;

            // Clear previous highlights before adding new ones
            clearMapLayers();

            // Highlight each location on the map
            aiResults.forEach(location => highlightCountry(location.toLowerCase()));
        } else {
            document.getElementById("answer").innerText = "No relevant locations found!";
        }
    } catch (error) {
        console.error("AI Error: ", error);
        document.getElementById("answer").innerText = "Error processing AI query.";
    }
}

// Clear Previous Map Layers
function clearMapLayers() {
    countryLayers.forEach(layer => map.removeLayer(layer));
    countryLayers = [];
}

// Highlight Country on Map
function highlightCountry(locationName) {
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
        .then(response => response.json())
        .then(data => {
            let found = false;
            let selectedLayer = L.geoJSON(data, {
                style: (feature) => {
                    if (feature.properties.name.toLowerCase() === locationName) {
                        found = true;
                        return { color: "red", weight: 3 };
                    }
                    return { color: "transparent", weight: 1 };
                }
            });

            if (found) {
                selectedLayer.addTo(map);
                countryLayers.push(selectedLayer);
                map.fitBounds(selectedLayer.getBounds());
            } else {
                console.log(`Location not found on map: ${locationName}`);
            }
        });
}

// Voice Assist (Web Speech API)

function startSpeechRecognition() {
    let speakButton = document.getElementById("speakButton");
    speakButton.innerText = "Listening...";

    let beep = new Audio("notification.mp3");


    // Play custom beep sound once
    beep.currentTime = 0; // Reset sound to start (in case it was played before)
    beep.play().catch(error => console.log("Audio play failed:", error));

    let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.start();

    recognition.onresult = (event) => {
        let transcript = event.results[0][0].transcript;
        document.getElementById("searchBar").value = transcript;
        speakButton.innerText = "🎤 Speak";
    };

    recognition.onerror = (event) => {
        speakButton.innerText = "🎤 Speak";
        console.error("Speech Recognition Error:", event.error);
    };

    recognition.onspeechend = () => {
        speakButton.innerText = "🎤 Speak";
        recognition.stop();
    };
}

