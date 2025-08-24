// Try to fetch the ttcurrent route to check if it exists
const currentPath = window.location.pathname;

fetch(currentPath)
    .then(response => {
        // If the response is not OK (e.g., 404), load the 404 page
        if (!response.ok) {
            return fetch('/404.html') // Replace with the path to your 404 page
                .then(redirectResponse => {
                    if (!redirectResponse.ok) {
                        throw new Error('404 page not found.');
                    }
                    return redirectResponse.text();
                })
                .then(html => {
                    document.body.innerHTML = html; // Replace the current page content
                });
        }
    })
    .catch(error => {
        console.error('Error loading route or 404 page:', error);
        document.body.innerHTML = '<h1>FATAL ERROR CONTACT SITE OWNER.</h1>';
    });
