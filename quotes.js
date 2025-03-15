// Constants
const PUBLISHED_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnckR1nLaR9Hbv7iprq4AI8zCGH19m076LWaNzvN8wx8EjwaBRQfsCvchExW2u9j34XveYF-RA2i97/pub?output=csv';

// Function to fetch quotes from Google Sheets (Published CSV method)
async function fetchQuotes() {
    try {
        // Show loading state
        const quotesContainer = document.getElementById('quotes-container');
        quotesContainer.innerHTML = '<p class="loading">Loading quotes...</p>';
        
        // Fetch data from published Google Sheets CSV
        const response = await fetch(PUBLISHED_CSV_URL);
        const csvText = await response.text();
        
        // Parse CSV
        const quotes = parseCSV(csvText);
        
        // Update the UI with the quotes
        displayQuotes(quotes);
        
        // Set up category filters
        setupCategoryFilters();
        
        // Cache the quotes in localStorage for faster loading next time
        localStorage.setItem('quotes', JSON.stringify(quotes));
        localStorage.setItem('lastFetched', new Date().toISOString());
        
        return quotes;
    } catch (error) {
        console.error('Error fetching quotes from Google Sheets:', error);
        
        // Try to use cached quotes if available
        const cachedQuotes = localStorage.getItem('quotes');
        if (cachedQuotes) {
            const quotes = JSON.parse(cachedQuotes);
            displayQuotes(quotes);
            setupCategoryFilters();
            return quotes;
        }
        
        // If all else fails, show an error message
        document.getElementById('quotes-container').innerHTML = 
            `<p class="error">Could not load quotes. Please try again later.<br>Error: ${error.message}</p>`;
        
        return [];
    }
}

// CSV parser function
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Find column indices (case-insensitive search)
    const findColumnIndex = (name) => {
        return headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
    };
    
    const quoteIndex = findColumnIndex('quote');
    const authorIndex = findColumnIndex('author');
    const sourceIndex = findColumnIndex('source');
    const tagsIndex = findColumnIndex('tags');
    
    console.log("CSV Headers:", headers);
    console.log("Column indices:", { quoteIndex, authorIndex, sourceIndex, tagsIndex });
    
    const quotes = [];
    
    // Start from index 1 to skip headers
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Handle cases where commas might be inside quoted values
        const values = parseCSVLine(lines[i]);
        
        if (quoteIndex >= 0 && values[quoteIndex] && values[quoteIndex].trim()) {
            quotes.push({
                text: values[quoteIndex]?.trim() || '',
                author: authorIndex >= 0 && values[authorIndex] ? values[authorIndex].trim() : '',
                source: sourceIndex >= 0 && values[sourceIndex] ? values[sourceIndex].trim() : '',
                tags: tagsIndex >= 0 && values[tagsIndex] && values[tagsIndex].trim()
                    ? values[tagsIndex].split(',').map(tag => tag.trim())
                    : []
            });
        }
    }
    
    console.log(`Processed ${quotes.length} quotes`);
    return quotes;
}

// Helper function to correctly parse CSV line with quoted values
function parseCSVLine(line) {
    const values = [];
    let inQuote = false;
    let currentValue = '';
    
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
            // If we encounter a double quote, toggle the quote flag
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            // If we encounter a comma and we're not inside quotes, end the current value
            values.push(currentValue);
            currentValue = '';
        } else {
            // Otherwise, add the character to the current value
            currentValue += char;
        }
    }
    
    // Don't forget to add the last value
    values.push(currentValue);
    
    return values;
}

// Display all quotes in the UI
function displayQuotes(quotes, category = 'all') {
    const quotesContainer = document.getElementById('quotes-container');
    
    if (!quotes || quotes.length === 0) {
        quotesContainer.innerHTML = 
            '<p class="error">No quotes found. Please add some to your spreadsheet.</p>';
        return;
    }
    
    // Clear the container
    quotesContainer.innerHTML = '';
    
    // Filter quotes by category if needed
    const filteredQuotes = category === 'all'
        ? quotes
        : quotes.filter(quote => {
            const lowercaseTags = quote.tags.map(tag => tag.toLowerCase());
            return lowercaseTags.includes(category.toLowerCase());
        });
    
    if (filteredQuotes.length === 0) {
        quotesContainer.innerHTML = 
            `<p class="error">No quotes found in the "${category}" category.</p>`;
        return;
    }
    
    // Display all quotes
    filteredQuotes.forEach((quote, index) => {
        const quoteCard = document.createElement('div');
        quoteCard.className = 'quote-card';
        
        quoteCard.innerHTML = `
            <p class="quote-text">${quote.text}</p>
            ${quote.author ? `<p class="quote-author">${quote.author}</p>` : ''}
            ${quote.source ? `<p class="quote-source">${quote.source}</p>` : ''}
            ${quote.tags && quote.tags.length > 0 ? `
                <div class="quote-categories">
                    ${quote.tags.map(tag => `<span class="quote-category">${tag}</span>`).join('')}
                </div>
            ` : ''}
        `;
        
        // Add to container
        quotesContainer.appendChild(quoteCard);
        
        // Animate in with a small delay for a staggered effect
        setTimeout(() => {
            quoteCard.style.opacity = '1';
        }, index * 50);
    });
}

// Set up category filter buttons
function setupCategoryFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const quotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            document.querySelector('.filter-btn.active').classList.remove('active');
            button.classList.add('active');
            
            // Get selected category
            const category = button.getAttribute('data-category');
            
            // Filter and display quotes
            displayQuotes(quotes, category);
        });
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Check if we have cached quotes that are less than 1 hour old
    const lastFetched = localStorage.getItem('lastFetched');
    const cachedQuotes = localStorage.getItem('quotes');
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    
    if (lastFetched && new Date(lastFetched) > oneHourAgo && cachedQuotes) {
        // Use cached quotes if they're fresh
        const quotes = JSON.parse(cachedQuotes);
        displayQuotes(quotes);
        setupCategoryFilters();
        
        // Refresh in the background
        fetchQuotes();
    } else {
        // Otherwise fetch new quotes
        fetchQuotes();
    }
});