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
    // Use the pre-computed token from config (most reliable method)
    // If PAYHERO_BASIC_AUTH is defined, use it directly
    if (defined('PAYHERO_BASIC_AUTH')) {
        return PAYHERO_BASIC_AUTH;
    }
    
    // Fallback: Concatenate the API key and secret with a colon.
    $credentials = PAYHERO_API_KEY . ':' . PAYHERO_API_SECRET;
    
    // Base64 encode the concatenated string.
    $encodedCredentials = base64_encode($credentials);
    
    // Prepend "Basic " to the encoded string to form the complete token.
    return 'Basic ' . $encodedCredentials;
}
?>
