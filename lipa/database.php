<?php
// database.php

class Database {
    private $conn;

    public function __construct() {
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($this->conn->connect_error) {
            die("Connection failed: " . $this->conn->connect_error);
        }
    }

    // Method for executing a simple query without user input
    public function query($sql) {
        return $this->conn->query($sql);
    }

    // Method to get the connection object for manual use
    public function getConnection() {
        return $this->conn;
    }

    // New: Method for executing a prepared statement
    public function prepare($sql) {
        return $this->conn->prepare($sql);
    }

    // Method to safely escape strings (although prepared statements are preferred)
    public function escapeString($str) {
        return $this->conn->real_escape_string($str);
    }
}