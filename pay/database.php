<?php
// database.php

class Database {
    private $conn;
    private $error;

    public function __construct() {
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($this->conn->connect_error) {
            $this->error = "Connection failed: " . $this->conn->connect_error;
            error_log($this->error);
            // Don't die - return gracefully
            $this->conn = null;
        }
    }

    // Method for executing a simple query without user input
    public function query($sql) {
        if (!$this->conn) return null;
        return $this->conn->query($sql);
    }

    // Method to get the connection object for manual use
    public function getConnection() {
        return $this->conn;
    }
    
    // Get last error
    public function getError() {
        return $this->error;
    }

    // New: Method for executing a prepared statement
    public function prepare($sql) {
        if (!$this->conn) return null;
        return $this->conn->prepare($sql);
    }

    // Method to safely escape strings (although prepared statements are preferred)
    public function escapeString($str) {
        if (!$this->conn) return $str;
        return $this->conn->real_escape_string($str);
    }
}