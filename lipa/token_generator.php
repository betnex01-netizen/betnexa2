<?php
// token_generator.php

// This file requires the config.php file to access API credentials.
require_once 'config.php';

/**
 * Generates a Basic HTTP Authentication token using the API credentials.
 *
 * @return string The Basic Auth token.
 */
function generateBasicAuthToken() {
    // Concatenate the API key and secret with a colon.
    $credentials = PAYHERO_API_KEY . ':' . PAYHERO_API_SECRET;
    
    // Base64 encode the concatenated string.
    $encodedCredentials = base64_encode($credentials);
    
    // Prepend "Basic " to the encoded string to form the complete token.
    return 'Basic ' . $encodedCredentials;
}
?>
