// Constants
const SPREADSHEET_ID = '18jdz4GGssAmEoC_JVdlqAGUrDPTrY27ahsVGISHerTY';
const SHEET_NAME = '1841035861'; // This is the gid from your URL

// Using the direct visualization API URL format
const API_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_NAME}`;

// Function to fetch quotes from Google Sheets
async function fetchQuotes() {
    try {
        // Show loading state
        const quotesContainer = document.getElementById('quotes-container');
        quotesContainer.innerHTML = '<p class="loading">Loading quotes...</p>';
        
        // Fetch data from Google Sheets
        const response = await fetch(API_URL);
        const text = await response.text();
        
        // Google's response comes with a prefix we need to remove to get valid JSON
        // The prefix is usually like "/*O_o*/\ngoogle.visualization.Query.setResponse("
        // and it ends with ");"
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        
        // Check if we've found valid JSON positions
        if (jsonStart < 0 || jsonEnd <= jsonStart) {
            throw new Error("Couldn't extract JSON from response: " + text.substring(0, 100) + "...");
        }
        
        const jsonText = text.substring(jsonStart, jsonEnd);
        const data = JSON.parse(jsonText);
        
        // Debug for response
        console.log("Parsed data structure:", data);
        
        // Process the data into our quotes format
        const quotes = processSheetData(data);
        
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

// Process the sheet data into our quotes format
function processSheetData(data) {
    const quotes = [];
    
    // Check if we have the expected structure
    if (!data.table || !data.table.cols || !data.table.rows) {
        console.error("Unexpected data structure:", data);
        return quotes;
    }
    
    // Get the column names from the first row
    const columns = data.table.cols.map(col => col.label);
    console.log("Columns found:", columns);
    
    // Map spreadsheet columns to our quote object properties
    const columnMap = {
        quote: columns.indexOf('Quote'),
        source: columns.indexOf('Source'),
        author: columns.indexOf('Author'),
        tags: columns.indexOf('Tags')
    };
    
    // Log the column mapping for debugging
    console.log("Column mapping:", columnMap);
    
    // Check if we found the required columns
    if (columnMap.quote === -1) {
        console.error("Required 'Quote' column not found");
        return quotes;
    }
    
    // Process each row into a quote object
    data.table.rows.forEach((row, index) => {
        const cells = row.c;
        
        // Skip rows with empty quotes or if the cells don't match our expectations
        if (!cells || !cells[columnMap.quote] || !cells[columnMap.quote].v) {
            return;
        }
        
        quotes.push({
            text: cells[columnMap.quote].v,
            source: columnMap.source !== -1 && cells[columnMap.source] ? cells[columnMap.source].v : '',
            author: columnMap.author !== -1 && cells[columnMap.author] ? cells[columnMap.author].v : '',
            tags: columnMap.tags !== -1 && cells[columnMap.tags] && cells[columnMap.tags].v 
                ? cells[columnMap.tags].v.split(',').map(tag => tag.trim()) 
                : []
        });
    });
    
    console.log(`Processed ${quotes.length} quotes`);
    return quotes;
}

// Display all quotes in the UI
function displayQuotes(quotes, category = 'all') {
    const quotesContainer = document.getElementById('quotes-container');
    
    if (quotes.length === 0) {
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