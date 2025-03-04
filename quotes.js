// Constants
const SPREADSHEET_ID = '18jdz4GGssAmEoC_JVdlqAGUrDPTrY27ahsVGISHerTY';
const SHEET_NAME = '1841035861'; // This is the gid from your URL
const API_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

// Function to fetch quotes from Google Sheets
async function fetchQuotes() {
    try {
        // Show loading state
        const quoteContainer = document.getElementById('quote-container');
        quoteContainer.innerHTML = '<p class="loading">Loading quotes...</p>';
        
        // Fetch data from Google Sheets
        const response = await fetch(API_URL);
        const text = await response.text();
        
        // Google's response comes with a prefix we need to remove to get valid JSON
        // The prefix is usually "/*O_o*/\ngoogle.visualization.Query.setResponse("
        // and it ends with ");"
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonText);
        
        // Process the data into our quotes format
        const quotes = processSheetData(data);
        
        // Update the UI with the quotes
        displayQuotes(quotes);
        
        // Initialize the quote rotation
        setupQuoteRotation(quotes);
        
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
            setupQuoteRotation(quotes);
            return quotes;
        }
        
        // If all else fails, show an error message
        document.getElementById('quote-container').innerHTML = 
            '<p class="error">Could not load quotes. Please try again later.</p>';
        
        return [];
    }
}

// Process the sheet data into our quotes format
function processSheetData(data) {
    const quotes = [];
    
    // Get the column names from the first row
    const columns = data.table.cols.map(col => col.label);
    
    // Map spreadsheet columns to our quote object properties
    const columnMap = {
        quote: columns.indexOf('Quote'),
        source: columns.indexOf('Source'),
        author: columns.indexOf('Author'),
        tags: columns.indexOf('Tags')
    };
    
    // Process each row into a quote object
    data.table.rows.forEach(row => {
        const cells = row.c;
        
        // Skip rows with empty quotes
        if (!cells[columnMap.quote] || !cells[columnMap.quote].v) {
            return;
        }
        
        quotes.push({
            text: cells[columnMap.quote].v,
            source: cells[columnMap.source] ? cells[columnMap.source].v : '',
            author: cells[columnMap.author] ? cells[columnMap.author].v : '',
            tags: cells[columnMap.tags] && cells[columnMap.tags].v 
                ? cells[columnMap.tags].v.split(',').map(tag => tag.trim()) 
                : []
        });
    });
    
    return quotes;
}

// Display the quotes in the UI
function displayQuotes(quotes) {
    if (quotes.length === 0) {
        document.getElementById('quote-container').innerHTML = 
            '<p class="error">No quotes found. Please add some to your spreadsheet.</p>';
        return;
    }
    
    // Display the first quote
    displayQuote(quotes[0]);
    
    // Update the total quote count
    document.getElementById('quote-count').textContent = `${quotes.length} quotes`;
}

// Display a single quote
function displayQuote(quote) {
    const quoteContainer = document.getElementById('quote-container');
    
    quoteContainer.innerHTML = `
        <blockquote>
            <p class="quote-text">${quote.text}</p>
            <footer>
                <cite>${quote.author}${quote.source ? `, ${quote.source}` : ''}</cite>
            </footer>
        </blockquote>
    `;
    
    // Display tags if any
    const tagsContainer = document.getElementById('tags-container');
    if (tagsContainer) {
        if (quote.tags && quote.tags.length > 0) {
            tagsContainer.innerHTML = quote.tags.map(tag => 
                `<span class="tag">${tag}</span>`
            ).join('');
            tagsContainer.style.display = 'block';
        } else {
            tagsContainer.style.display = 'none';
        }
    }
}

// Set up quote rotation
function setupQuoteRotation(quotes) {
    let currentIndex = 0;
    
    // Set up the next/previous buttons
    document.getElementById('next-quote').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % quotes.length;
        displayQuote(quotes[currentIndex]);
    });
    
    document.getElementById('prev-quote').addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + quotes.length) % quotes.length;
        displayQuote(quotes[currentIndex]);
    });
    
    // Optional: Add keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
            document.getElementById('next-quote').click();
        } else if (event.key === 'ArrowLeft') {
            document.getElementById('prev-quote').click();
        }
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
        setupQuoteRotation(quotes);
        
        // Refresh in the background
        fetchQuotes();
    } else {
        // Otherwise fetch new quotes
        fetchQuotes();
    }
});
